// server/routes/progress.js
import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// GET /api/progress?user_id=xxx&limit=20
router.get("/", async (req, res) => {
  const { user_id, limit = "20" } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id is required" });

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: true })
    .limit(parseInt(limit, 10));

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

export default router;
