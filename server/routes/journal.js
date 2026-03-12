import express from "express";
import { supabase } from "../supabaseClient.js";

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
