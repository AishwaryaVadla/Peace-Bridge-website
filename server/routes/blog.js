import express from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const router = express.Router();
const DB_PATH = path.join(process.cwd(), "blogs.json");

function loadBlogs() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (e) {
    return [];
  }
}

function saveBlogs(list) {
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2));
}

router.get("/", (req, res) => {
  const blogs = loadBlogs();
  res.json(blogs);
});

router.get("/:id", (req, res) => {
  const blogs = loadBlogs();
  const blog = blogs.find((b) => b.id === req.params.id);
  if (!blog) return res.status(404).json({ error: "Not found" });
  res.json(blog);
});

router.post("/", (req, res) => {
  const { title, content, author, tags } = req.body;
  const blogs = loadBlogs();
  const newBlog = {
    id: randomUUID(),
    title,
    content,
    author,
    tags: tags || [],
    createdAt: new Date().toISOString(),
  };
  blogs.unshift(newBlog);
  saveBlogs(blogs);
  res.json(newBlog);
});

router.put("/:id", (req, res) => {
  const blogs = loadBlogs();
  const idx = blogs.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  const updated = { ...blogs[idx], ...req.body };
  blogs[idx] = updated;
  saveBlogs(blogs);
  res.json(updated);
});

export default router;
