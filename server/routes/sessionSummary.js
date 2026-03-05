import express from "express";
import fetch from "node-fetch";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

const SUMMARY_PROMPT = `
You are PeaceBridge, an AI-assisted mediation support system.
Summarize this mediation conversation into:
- 1 validation
- 1 key issue identified
- 1 strength shown
- 1 suggested next step
Keep it concise (3–6 sentences).`.trim();

async function fetchWithTimeout(url, options, timeoutMs = 45000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

router.post("/", async (req, res) => {
  try {
    const { messages, session_id } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const convo = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: SUMMARY_PROMPT },
        { role: "user", content: convo.slice(-6000) },
      ],
      stream: false,
      options: {
        temperature: 0.4,
        top_p: 0.9,
        num_ctx: 1024,
        num_predict: 120,
      },
    };

    const t0 = Date.now();
    const r = await fetchWithTimeout(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("Ollama summary ms:", Date.now() - t0);

    if (!r.ok) {
      const errText = await r.text();
      console.error("Ollama summary error:", r.status, errText);
      return res.json({ summary: "I wasn’t able to generate a summary just now.", debug_mode: "FALLBACK_USED" });
    }

    const data = await r.json();
    const summary = data?.message?.content?.trim() || "I wasn’t able to generate a summary just now.";

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
