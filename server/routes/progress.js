// server/routes/progress.js
import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// GET /api/progress?user_id=xxx&limit=20
router.get("/", async (req, res) => {
  const { user_id, limit = "20" } = req.query;
  if (!user_id) return res.status(400).json({ error: "user_id is required" });

  try {
    const { data, error } = await supabase
      .from("practice_sessions")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true })
      .limit(parseInt(limit, 10));

    // Any Supabase error (e.g. table not yet created) → empty array so UI shows onboarding CTA
    if (error) {
      console.warn("/api/progress supabase error:", error.code, error.message);
      return res.json([]);
    }
    return res.json(data || []);
  } catch (err) {
    console.error("/api/progress error:", err.message);
    return res.json([]);
  }
});

export default router;
