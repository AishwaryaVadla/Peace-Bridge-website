// server/routes/scenarios.js
import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// GET /api/scenarios
router.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("scenarios")
    .select("id, title, context, difficulty")
    .order("created_at");
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

// GET /api/scenarios/:id
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error || !data) return res.status(404).json({ error: "Scenario not found" });
  return res.json(data);
});

export default router;
