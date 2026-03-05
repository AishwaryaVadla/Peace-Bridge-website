// server/routes/chat.js
import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
// Default to faster model now that it's pulled; override with OLLAMA_MODEL env if desired.
const MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";
const SUMMARY_PROMPT = `
You are PeaceBridge, an AI-assisted mediation support system.
Summarize this mediation conversation into:
- 1 validation
- 1 key issue identified
- 1 strength shown
- 1 suggested next step
Keep it concise (3–6 sentences).`.trim();

/**
 * A softer default that doesn't scream "bot template".
 * Keep shape consistent with your frontend.
 */
const DEFAULT_REPLY = {
  assistant_message: "",
  one_question: "",
  next_steps: [],
  primary_emotion: "unknown",
  secondary_emotions: [],
  intensity: "medium",
  safety_level: "normal",
  debug_mode: "FALLBACK_USED",
};

function buildSystemPrompt(phase = "venting") {
  const phaseGuidance = {
    venting:
      "Validate the person’s emotion and make them feel heard. Do not offer solutions, advice, or a different perspective yet.",
    clarifying:
      "Help the person articulate exactly what the core issue is. Ask one concise clarifying question to surface the specific conflict.",
    perspective:
      "Gently help the person consider the other party’s possible viewpoint without assigning blame to anyone.",
    solution:
      "Propose one small, realistic, collaborative step forward. Keep it concrete and immediately actionable.",
    action:
      "Help the person commit to one clear next action. Make it specific, simple, and something they can do today.",
  };

  return `You are PeaceBridge, a compassionate AI mediation companion helping someone work through a real conflict.

Current phase: ${String(phase).toUpperCase()}

Your focus for this response: ${phaseGuidance[phase] || "Stay warm, grounded, and ask one thoughtful question."}

Response rules: Write 3 to 6 sentences only. Ask at most one question. Never repeat phrasing from earlier in the conversation. Never introduce unrelated topics. Write in natural prose — no headings, bullet lists, or numbered steps. Tone: warm, grounded, non-judgmental.`;
}

/**
 * Lightweight emotion detection so chips don't stay UNKNOWN.
 * You can improve this later (or ask the model for labels),
 * but heuristics are stable even when the model fails.
 */
function detectEmotion(userText = "") {
  const t = userText.toLowerCase();

  // Crisis terms (keep conservative)
  const crisis = /suicid|kill myself|end my life|can't go on|hurt myself/;
  const violence = /(kill|attack|hurt (them|someone)|violence|threaten|gun|knife|shoot|stab|beat)/;
  if (crisis.test(t) || violence.test(t)) {
    return {
      primary_emotion: "fear",
      secondary_emotions: ["overwhelmed"],
      intensity: "high",
      safety_level: "crisis",
    };
  }

  if (/(anxious|panic|worried|overwhelmed|nervous)/.test(t)) {
    return {
      primary_emotion: "fear",
      secondary_emotions: ["anxious", "overwhelmed"],
      intensity: "high",
      safety_level: "normal",
    };
  }

  if (/(stressed|stress|burnt out|exhausted)/.test(t)) {
    return {
      primary_emotion: "stressed",
      secondary_emotions: ["overwhelmed"],
      intensity: "medium",
      safety_level: "normal",
    };
  }

  if (/(failing|failure|worthless|hopeless|depressed|sad|cry)/.test(t)) {
    return {
      primary_emotion: "sad",
      secondary_emotions: ["fear"],
      intensity: "high",
      safety_level: "normal",
    };
  }

  if (/(angry|mad|furious|rage|pissed)/.test(t)) {
    return {
      primary_emotion: "angry",
      secondary_emotions: ["frustrated"],
      intensity: "medium",
      safety_level: "normal",
    };
  }

  if (/(frustrated|stuck|helpless)/.test(t)) {
    return {
      primary_emotion: "frustrated",
      secondary_emotions: ["anxious"],
      intensity: "medium",
      safety_level: "normal",
    };
  }

  return {
    primary_emotion: "unknown",
    secondary_emotions: [],
    intensity: "medium",
    safety_level: "normal",
  };
}

function containsCrisisLanguage(text = "") {
  const t = text.toLowerCase();
  const crisis = /suicid|kill myself|end my life|can't go on|hurt myself/;
  const violence = /(kill|attack|hurt (them|someone)|violence|threaten|gun|knife|shoot|stab|beat)/;
  return crisis.test(t) || violence.test(t);
}

function determinePhase(currentPhase, userText, turnCount) {
  const msg = (userText || "").toLowerCase();

  if (!currentPhase || currentPhase === "crisis") return "venting";

  switch (currentPhase) {
    case "venting":
      if (turnCount >= 2 || msg.length > 80) return "clarifying";
      return "venting";
    case "clarifying":
      if (/\b(they|them|he |she |he’s|she’s)\b/.test(msg) || turnCount >= 5) return "perspective";
      return "clarifying";
    case "perspective":
      if (/what (should|can|do) i|how (do|can) i|what if|next step/i.test(msg) || turnCount >= 9) return "solution";
      return "perspective";
    case "solution":
      if (turnCount >= 12) return "action";
      return "solution";
    case "action":
      return "action";
    default:
      return "venting";
  }
}

function pickFallback(userText = "", emotion = "unknown") {
  const t = userText.toLowerCase();

  if (t.includes("coworker") || t.includes("argument") || t.includes("blame")) {
    return "That sounds frustrating — especially if it feels like they won’t own their part. What do you want most right now: to be understood, to fix the working relationship, or to make sure this doesn’t happen again?";
  }

  if (emotion === "angry" || emotion === "frustrated") {
    return "Yeah, I get why that would get under your skin. Before we choose what to do next, what’s the one line you *wish* you had said in that moment?";
  }

  return "I hear you. Let’s slow it down for a second — what part of this is hitting you the hardest right now?";
}

/**
 * Timeout wrapper so a hung Ollama call doesn't stall your UI.
 */
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

// Simple semaphore to avoid piling requests on Ollama
let locked = false;
const waiters = [];

async function acquireLock() {
  if (!locked) {
    locked = true;
    return;
  }
  await new Promise((resolve) => waiters.push(resolve));
  locked = true;
}

function releaseLock() {
  locked = false;
  const next = waiters.shift();
  if (next) next();
}

async function generateAndStoreSummary(messages, sessionId) {
  try {
    const convo = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n")
      .slice(-6000);

    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: SUMMARY_PROMPT },
        { role: "user", content: convo },
      ],
      stream: false,
      options: {
        temperature: 0.4,
        top_p: 0.9,
        num_ctx: 1024,
        num_predict: 120,
      },
    };

    const r = await fetchWithTimeout(
      `${OLLAMA_URL}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      45000
    );

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.warn("Auto-summary Ollama error:", r.status, errText);
      return;
    }

    const data = await r.json();
    const summary = data?.message?.content?.trim();
    if (!summary) return;

    try {
      await supabase.from("session_summaries").insert({
        session_id: sessionId || null,
        summary,
        raw_messages: messages,
      });
    } catch (e) {
      console.warn("Auto-summary store failed:", e.message);
    }
  } catch (e) {
    console.warn("Auto-summary generation failed:", e.message);
  }
}

router.post("/", async (req, res) => {
  await acquireLock();
  try {
    const { message, session_id } = req.body || {};
    const userText = (message || "").trim();

    if (!userText) {
      return res.status(400).json({ error: "message is required" });
    }

    const emotion = detectEmotion(userText);
    const fallbackText = pickFallback(userText, emotion.primary_emotion);
    let sessionId = session_id || null;
    let currentPhase = null;
    let turnCount = 0;

    // Session handling
    try {
      if (sessionId) {
        const { data: existing, error } = await supabase
          .from("sessions")
          .select("*")
          .eq("id", sessionId)
          .single();
        if (!error && existing) {
          currentPhase = existing.current_phase;
          turnCount = existing.turn_count || 0;
        } else {
          sessionId = null; // force new session
        }
      }
      if (!sessionId) {
        const { data: created, error: insertErr } = await supabase
          .from("sessions")
          .insert({})
          .select()
          .single();
        if (!insertErr && created) {
          sessionId = created.id;
          currentPhase = created.current_phase;
          turnCount = created.turn_count || 0;
        }
      }
    } catch (e) {
      console.warn("Session fetch/create failed:", e.message);
    }

    const newTurnCount = (turnCount || 0) + 1;
    const nextPhase = determinePhase(currentPhase, userText, newTurnCount);

    // Safety override BEFORE any mediation/phase logic
    if (containsCrisisLanguage(userText)) {
      try {
        if (sessionId) {
          await supabase
            .from("sessions")
            .update({
              current_phase: "crisis",
              turn_count: newTurnCount,
            })
            .eq("id", sessionId);
          await supabase.from("session_messages").insert([
            { session_id: sessionId, role: "user", content: userText },
            {
              session_id: sessionId,
              role: "assistant",
              content:
                "I’m really sorry you’re in this situation. If you or anyone is in danger or thinking about self-harm, please reach out to local emergency services right away. In the U.S., you can call or text 988 (Suicide & Crisis Lifeline). If it’s safe, is there someone nearby you trust who can stay with you and help you get support?",
            },
          ]);
        }
      } catch (e) {
        console.warn("Crisis session update failed:", e.message);
      }
      return res.json({
        ...DEFAULT_REPLY,
        assistant_message:
          "I’m really sorry you’re in this situation. If you or anyone is in danger or thinking about self-harm, please reach out to local emergency services right away. In the U.S., you can call or text 988 (Suicide & Crisis Lifeline). If it’s safe, is there someone nearby you trust who can stay with you and help you get support?",
        primary_emotion: "fear",
        secondary_emotions: ["overwhelmed"],
        intensity: "high",
        safety_level: "crisis",
        debug_mode: "CRISIS_OVERRIDE",
        session_id: sessionId,
      });
    }

    if (emotion.safety_level === "crisis") {
      return res.json({
        ...DEFAULT_REPLY,
        assistant_message:
          "I’m really sorry you’re in this situation. If you or anyone is in danger or thinking about self-harm, please reach out to local emergency services right away. In the U.S., you can call or text 988 (Suicide & Crisis Lifeline). If it’s safe, is there someone nearby you trust who can stay with you and help you get support?",
        primary_emotion: emotion.primary_emotion,
        secondary_emotions: emotion.secondary_emotions,
        intensity: emotion.intensity,
        safety_level: "crisis",
        debug_mode: "CRISIS_OVERRIDE",
        session_id: sessionId,
      });
    }

    // Update session BEFORE calling model
    try {
      if (sessionId) {
        await supabase
          .from("sessions")
          .update({
            current_phase: nextPhase,
            turn_count: newTurnCount,
          })
          .eq("id", sessionId);
      }
    } catch (e) {
      console.warn("Session pre-LLM update failed:", e.message);
    }

    // Fetch last 8 messages from DB for context
    let contextMessages = [];
    if (sessionId) {
      try {
        const { data: previousMessages } = await supabase
          .from("session_messages")
          .select("role, content")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(8);
        contextMessages = previousMessages ? previousMessages.reverse() : [];
      } catch (e) {
        console.warn("Context fetch failed:", e.message);
      }
    }

    // Build chat messages (DB-driven context)
    const chatMessages = [
      { role: "system", content: buildSystemPrompt(nextPhase) },
      ...contextMessages,
      { role: "user", content: userText },
    ];

    const payload = {
      model: MODEL,
      messages: chatMessages,
      stream: false,
      options: {
        temperature: 0.8,
        top_p: 0.9,
        num_ctx: 1024,
        num_predict: 120,
      },
    };

    const t0 = Date.now();
    const r = await fetchWithTimeout(
      `${OLLAMA_URL}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      45000
    );
    console.log("Ollama ms:", Date.now() - t0);

    if (!r.ok) {
      const errText = await r.text();
      console.error("Ollama error:", r.status, errText);

      return res.json({
        ...DEFAULT_REPLY,
        assistant_message: fallbackText,
        primary_emotion: emotion.primary_emotion,
        secondary_emotions: emotion.secondary_emotions,
        intensity: emotion.intensity,
        safety_level: emotion.safety_level,
        debug_mode: "FALLBACK_USED_OLLAMA_ERROR",
        session_id: sessionId,
      });
    }

    const data = await r.json();
    const reply = data?.message?.content?.trim() || "";

    if (!reply) {
      // Even on empty reply, try to persist phase/turns
      try {
        if (sessionId) {
        await supabase
          .from("sessions")
          .update({
            current_phase: nextPhase,
            turn_count: newTurnCount,
          })
          .eq("id", sessionId);
          await supabase.from("session_messages").insert([
            { session_id: sessionId, role: "user", content: userText },
            { session_id: sessionId, role: "assistant", content: fallbackText },
          ]);
          if (nextPhase === "action" && newTurnCount >= 6) {
            // Fire and forget auto-summary
            (async () => {
              const summaryMessages = [
                ...contextMessages,
                { role: "user", content: userText },
                { role: "assistant", content: fallbackText },
              ];
              await generateAndStoreSummary(summaryMessages, sessionId);
            })().catch(() => {});
          }
        }
      } catch (e) {
        console.warn("Session update failed:", e.message);
      }

      return res.json({
        ...DEFAULT_REPLY,
        assistant_message: fallbackText,
        primary_emotion: emotion.primary_emotion,
        secondary_emotions: emotion.secondary_emotions,
        intensity: emotion.intensity,
        safety_level: emotion.safety_level,
        debug_mode: "FALLBACK_USED_EMPTY_REPLY",
        session_id: sessionId,
      });
    }

    const showEmotion = emotion.primary_emotion !== "unknown";

    // Persist session state + messages (best effort)
    try {
      if (sessionId) {
        await supabase
          .from("sessions")
          .update({
            current_phase: nextPhase,
            turn_count: newTurnCount,
          })
          .eq("id", sessionId);
        await supabase.from("session_messages").insert([
          { session_id: sessionId, role: "user", content: userText },
          { session_id: sessionId, role: "assistant", content: reply },
        ]);
        if (nextPhase === "action" && newTurnCount >= 6) {
          // Fire and forget auto-summary
          (async () => {
            const summaryMessages = [
              ...contextMessages,
              { role: "user", content: userText },
              { role: "assistant", content: reply },
            ];
            await generateAndStoreSummary(summaryMessages, sessionId);
          })().catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Session update failed:", e.message);
    }

    return res.json({
      ...DEFAULT_REPLY,
      assistant_message: reply,
      primary_emotion: showEmotion ? emotion.primary_emotion : null,
      secondary_emotions: showEmotion ? emotion.secondary_emotions : [],
      intensity: showEmotion ? emotion.intensity : null,
      safety_level: emotion.safety_level,
      debug_mode: "AI_USED",
      session_id: sessionId,
    });
  } catch (err) {
    console.error("Chat route error:", err);

    // Best-effort emotion inference from request
    const lastUser = Array.isArray(req.body?.messages)
      ? [...req.body.messages].reverse().find((m) => m?.role === "user")
      : null;

    const userText = lastUser?.content || "";
    const emotion = detectEmotion(userText);
    const fallbackText = pickFallback(userText, emotion.primary_emotion);

    return res.json({
      ...DEFAULT_REPLY,
      assistant_message: fallbackText,
      primary_emotion: emotion.primary_emotion,
      secondary_emotions: emotion.secondary_emotions,
      intensity: emotion.intensity,
      safety_level: emotion.safety_level,
      debug_mode: "FALLBACK_USED_EXCEPTION",
      session_id: sessionId,
    });
  } finally {
    releaseLock();
  }
});

export default router;
