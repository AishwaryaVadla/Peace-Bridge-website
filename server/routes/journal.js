import express from "express";
import { supabase } from "../supabaseClient.js";
import { chatComplete } from "../llm.js";

const router = express.Router();

// GET all entries
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET single entry
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Entry not found" });
  res.json(data);
});

// POST create entry
router.post("/", async (req, res) => {
  const { title, content, mood } = req.body;

  const { data, error } = await supabase
    .from("journals")
    .insert([{ title, content, mood }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT update entry
router.put("/:id", async (req, res) => {
  const { title, content, mood } = req.body;

  const { data, error } = await supabase
    .from("journals")
    .update({ title, content, mood })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST generate AI insight for a journal entry
router.post("/insight", async (req, res) => {
  const { content, mood } = req.body || {};
  if (!content) return res.status(400).json({ error: "content is required" });

  const prompt = `You are a compassionate reflection coach reviewing someone's private journal entry.

Provide exactly three things:
1. A brief emotional summary (1–2 sentences) — describe what they seem to be feeling and experiencing.
2. One key insight — a pattern, observation, or deeper truth about the situation.
3. One practical suggestion — something small and concrete they could try next.

Journal mood: ${mood || "unspecified"}
Journal entry:
${content}

Reply in this exact JSON format with no extra text:
{"summary":"...","insight":"...","suggestion":"..."}`;

  try {
    const raw = await chatComplete(
      [{ role: "user", content: prompt }],
      { temperature: 0.5, num_predict: 180 }
    );
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return res.json(JSON.parse(match[0]));
      } catch {}
    }
    // Fallback: return raw text in summary field
    return res.json({ summary: raw.trim(), insight: "", suggestion: "" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// DELETE entry
router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from("journals")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
