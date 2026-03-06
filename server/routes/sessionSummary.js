import express from "express";
import { supabase } from "../supabaseClient.js";
import { chatComplete } from "../llm.js";

const router = express.Router();

const SUMMARY_PROMPT = `
You are PeaceBridge, an AI-assisted mediation support system.
Summarize this mediation conversation into:
- 1 validation
- 1 key issue identified
- 1 strength shown
- 1 suggested next step
Keep it concise (3–6 sentences).`.trim();

router.post("/", async (req, res) => {
  try {
    const { messages, session_id } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const convo = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const t0 = Date.now();
    let summary;
    try {
      summary = await chatComplete(
        [{ role: "system", content: SUMMARY_PROMPT }, { role: "user", content: convo.slice(-6000) }],
        { temperature: 0.4, num_predict: 120 }
      );
      console.log("LLM summary ms:", Date.now() - t0);
    } catch (llmErr) {
      console.error("LLM summary error:", llmErr.message);
      return res.json({ summary: "I wasn’t able to generate a summary just now.", debug_mode: "FALLBACK_USED" });
    }

    summary = summary || "I wasn’t able to generate a summary just now.";

    // optional store in Supabase
    try {
      if (supabase) {
        await supabase.from("session_summaries").insert({
          session_id: session_id || null,
          summary,
          raw_messages: messages,
        });
      }
    } catch (e) {
      console.warn("Supabase summary store failed:", e.message);
    }

    return res.json({ summary, debug_mode: "AI_USED" });
  } catch (err) {
    console.error("Session summary error:", err);
    return res.json({ summary: "I wasn’t able to generate a summary just now.", debug_mode: "FALLBACK_USED_EXCEPTION" });
  }
});

export default router;
