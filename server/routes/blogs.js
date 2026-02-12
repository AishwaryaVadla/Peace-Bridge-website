import express from "express";
import { supabase } from "../supabaseClient.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// GET all blogs (newest first)
router.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("blogs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET blog by id (with attachments)
router.get("/:id", async (req, res) => {
  const { data: blog, error } = await supabase
    .from("blogs")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: "Not found" });

  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("blog_id", blog.id);

  let withSigned = attachments || [];
  if (withSigned.length) {
    const refreshed = [];
    for (const att of withSigned) {
      if (att.type === "link") {
        refreshed.push(att);
        continue;
      }
      // att.url stores the storage path
      const { data: signed, error: signErr } = await supabase.storage
        .from("blog-attachments")
        .createSignedUrl(att.url, 60 * 60); // 1 hour
      if (signErr) {
        refreshed.push(att);
      } else {
        refreshed.push({ ...att, url: signed.signedUrl });
      }
    }
    withSigned = refreshed;
  }

  return res.json({ ...blog, attachments: withSigned });
});

// POST create blog (with file uploads and links)
router.post("/", upload.array("files"), async (req, res) => {
  const { title, author, content, tags, links } = req.body || {};

  if (!title || !content) {
    return res.status(400).json({ error: "title and content required" });
  }
  if (String(content).length > 20000) {
    return res.status(400).json({ error: "content too long" });
  }

  const tagList =
    typeof tags === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(tags);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : Array.isArray(tags)
      ? tags
      : [];

  const { data: blog, error: blogError } = await supabase
    .from("blogs")
    .insert({
      title: String(title).trim(),
      author: author ? String(author).trim() : "Anonymous",
      content: String(content),
      tags: tagList,
    })
    .select("*")
    .single();

  if (blogError) return res.status(500).json({ error: blogError.message });

  const attachments = [];

  if (req.files) {
    const allowed = ["image/", "application/pdf"];
    for (const file of req.files) {
      if (!allowed.some((t) => file.mimetype.startsWith(t))) {
        continue;
      }
      const filePath = `${blog.id}/${Date.now()}_${file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from("blog-attachments")
        .upload(filePath, file.buffer, { contentType: file.mimetype });
      if (uploadError) continue;
      attachments.push({
        blog_id: blog.id,
        name: file.originalname,
        type: file.mimetype,
        url: filePath, // store path; signed URL generated on fetch
      });
    }
  }

  if (links) {
    try {
      const parsedLinks = JSON.parse(links);
      parsedLinks.forEach((link) => {
        attachments.push({
          blog_id: blog.id,
          name: link,
          type: "link",
          url: link,
        });
      });
    } catch {}
  }

  if (attachments.length) {
    await supabase.from("attachments").insert(attachments);
  }

  return res.status(201).json({ ...blog, attachments });
});

// PUT update (supports new files and links)
router.put("/:id", upload.array("files"), async (req, res) => {
  const { title, author, content, tags, links } = req.body || {};

  const updates = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (author !== undefined) updates.author = String(author).trim();
  if (content !== undefined) updates.content = String(content);
  if (tags !== undefined) {
    updates.tags =
      typeof tags === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(tags);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : Array.isArray(tags)
        ? tags
        : [];
  }

  const { data: updated, error } = await supabase
    .from("blogs")
    .update(updates)
    .eq("id", req.params.id)
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const attachments = [];

  if (req.files) {
    const allowed = ["image/", "application/pdf"];
    for (const file of req.files) {
      if (!allowed.some((t) => file.mimetype.startsWith(t))) {
        continue;
      }
      const filePath = `${updated.id}/${Date.now()}_${file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from("blog-attachments")
        .upload(filePath, file.buffer, { contentType: file.mimetype });
      if (uploadError) continue;
      attachments.push({
        blog_id: updated.id,
        name: file.originalname,
        type: file.mimetype,
        url: filePath, // store path; signed on fetch
      });
    }
  }

  if (links) {
    try {
      const parsedLinks = JSON.parse(links);
      parsedLinks.forEach((link) => {
        attachments.push({
          blog_id: updated.id,
          name: link,
          type: "link",
          url: link,
        });
      });
    } catch {}
  }

  if (attachments.length) {
    await supabase.from("attachments").insert(attachments);
  }

  const { data: mergedAttachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("blog_id", updated.id);

  return res.json({ ...updated, attachments: mergedAttachments || [] });
});

// DELETE blog
router.delete("/:id", async (req, res) => {
  // delete attachments first
  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("blog_id", req.params.id);

  if (attachments?.length) {
    const paths = attachments
      .filter((a) => a.type !== "link")
      .map((a) => a.url); // url is storage path
    if (paths.length) {
      await supabase.storage.from("blog-attachments").remove(paths);
    }
    await supabase.from("attachments").delete().eq("blog_id", req.params.id);
  }

  const { error } = await supabase.from("blogs").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
