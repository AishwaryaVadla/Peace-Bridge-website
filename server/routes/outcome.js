import express from "express";
import { supabase } from "../supabaseClient.js";
import { chatComplete } from "../llm.js";

const router = express.Router();

const OUTCOME_PROMPT = `You are an impartial conflict mediator analyst.

Analyze this conversation and respond with ONLY a JSON object in this exact format:
{
  "summary": "2-3 sentence neutral summary of the conflict",
  "perspective_a": "The first party's core concern and what they need",
  "perspective_b": "The other party's likely perspective and what they need (infer from context if not directly stated)",
  "resolution": "A balanced, fair suggested resolution that addresses both sides",
  "next_step": "One concrete actionable next step both parties could take"
}

No extra text outside the JSON.`;

router.post("/", async (req, res) => {
  try {
    const { session_id, messages: inlineMsgs, mode = "chatbot" } = req.body;

    if (!session_id && (!inlineMsgs || inlineMsgs.length === 0)) {
      return res.status(400).json({ error: "Provide session_id or messages" });
    }

    let msgs = [];

    // Prefer DB fetch; fall back to inline messages passed from frontend
    if (session_id) {
      const { data, error: dbErr } = await supabase
        .from("session_messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at", { ascending: true });

      if (!dbErr && data && data.length > 0) {
        msgs = data;
      }
    }

    // Fallback: use inline messages if DB returned nothing
    if (msgs.length === 0 && inlineMsgs && inlineMsgs.length > 0) {
      msgs = inlineMsgs; // expected shape: [{ role, content }]
    }

    if (msgs.length === 0) {
      return res.status(400).json({ error: "No messages found for this session" });
    }

    // Build readable conversation transcript
    let conversation;
    if (mode === "mediator") {
      // Mediator mode: party_a, party_b, mediator roles
      conversation = msgs
        .map((m) => {
          if (m.role === "mediator") return `Mediator: ${m.content}`;
          if (m.role === "party_a") return `Party A: ${m.content}`;
          if (m.role === "party_b") return `Party B: ${m.content}`;
          return `${m.role}: ${m.content}`;
        })
        .join("\n");
    } else {
      // Chatbot / Roleplay: user/assistant roles
      conversation = msgs
        .map((m) => (m.role === "user" ? `Person: ${m.content}` : `Mediator AI: ${m.content}`))
        .join("\n");
    }

    const raw = await chatComplete(
      [
        { role: "system", content: OUTCOME_PROMPT },
        {
          role: "user",
          content: `Analyze this conflict conversation:\n\n${conversation.slice(0, 5000)}`,
        },
      ],
      { temperature: 0.5, num_predict: 400, max_tokens: 500 }
    );

    // Extract JSON
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      // LLM didn't return JSON — return raw text wrapped in structure
      return res.json({
        outcome: {
          summary: raw,
          perspective_a: "",
          perspective_b: "",
          resolution: "",
          next_step: "",
        },
      });
    }

    let outcome;
    try {
      outcome = JSON.parse(match[0]);
    } catch {
      outcome = { summary: raw, perspective_a: "", perspective_b: "", resolution: "", next_step: "" };
    }

    return res.json({ outcome });
  } catch (err) {
    console.error("Outcome error:", err);
    res.status(500).json({ error: "Failed to generate outcome" });
  }
});

export default router;
