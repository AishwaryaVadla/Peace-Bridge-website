// server/routes/actions.js
import express from "express";
import { supabase } from "../supabaseClient.js";
import { chatComplete } from "../llm.js";

const router = express.Router();

const TABLE_MISSING = (e) =>
  e?.code === "42P01" || e?.message?.includes("does not exist");

// POST /api/actions — create one action manually
router.post("/", async (req, res) => {
  const { session_id, user_id, text, priority = "medium" } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: "text is required" });

  const { data, error } = await supabase
    .from("action_items")
    .insert([{ session_id: session_id || null, user_id: user_id || null, text: text.trim(), priority }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/actions/generate — LLM-generate 3 actions, save, return
router.post("/generate", async (req, res) => {
  const { session_id, user_id, messages } = req.body || {};

  // Build transcript — prefer DB, fall back to inline messages
  let transcript = "";
  if (session_id) {
    try {
      const { data: dbMsgs } = await supabase
        .from("session_messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at", { ascending: true })
        .limit(16);
      if (dbMsgs?.length) {
        transcript = dbMsgs
          .map((m) => `${m.role === "user" ? "Person" : "Guide"}: ${m.content}`)
          .join("\n");
      }
    } catch { /* fallback below */ }
  }
  if (!transcript && messages?.length) {
    transcript = messages
      .slice(-16)
      .map((m) => `${m.role === "user" ? "Person" : "Guide"}: ${m.content}`)
      .join("\n");
  }

  const prompt = `Based on this conflict resolution conversation, suggest exactly 3 practical action steps the person can take in real life.

${transcript ? `Conversation:\n${transcript}\n\n` : ""}Rules:
- Each action must be under 12 words
- Specific and immediately actionable
- Realistic and constructive

Return ONLY a JSON array of exactly 3 strings, no markdown:
["action 1", "action 2", "action 3"]`;

  try {
    const raw = await chatComplete(
      [{ role: "user", content: prompt }],
      { temperature: 0.5, num_predict: 120 }
    );
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return res.json({ actions: [] });

    const texts = JSON.parse(match[0])
      .filter((a) => typeof a === "string" && a.trim())
      .slice(0, 3);

    const items = texts.map((text) => ({
      session_id: session_id || null,
      user_id: user_id || null,
      text: text.trim(),
      status: "todo",
      priority: "medium",
    }));

    // Save to DB — silently skip if table missing
    let saved = items.map((a, i) => ({ ...a, id: `temp_${i}` }));
    try {
      const { data } = await supabase.from("action_items").insert(items).select();
      if (data?.length) saved = data;
    } catch { /* non-fatal */ }

    return res.json({ actions: saved });
  } catch (err) {
    console.error("/actions/generate error:", err.message);
    return res.json({ actions: [] });
  }
});

// GET /api/actions/user/:user_id — all actions for this device/user (board view)
router.get("/user/:user_id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("action_items")
      .select("*")
      .eq("user_id", req.params.user_id)
      .order("created_at", { ascending: false });

    if (error) {
      if (TABLE_MISSING(error)) return res.json([]);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data || []);
  } catch {
    return res.json([]);
  }
});

// PUT /api/actions/:id — update status or priority
router.put("/:id", async (req, res) => {
  const { status, priority } = req.body || {};
  const updates = {};
  if (status)   updates.status   = status;
  if (priority) updates.priority = priority;
  if (!Object.keys(updates).length)
    return res.status(400).json({ error: "nothing to update" });

  const { data, error } = await supabase
    .from("action_items")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/actions/:id
router.delete("/:id", async (req, res) => {
  await supabase.from("action_items").delete().eq("id", req.params.id).catch(() => {});
  return res.json({ success: true });
});

export default router;
