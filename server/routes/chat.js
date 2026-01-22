// server/routes/chat.js
import express from "express";

const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
// Default to faster model now that it's pulled; override with OLLAMA_MODEL env if desired.
const MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

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

/**
 * Keep the system prompt clean — DO NOT embed few-shot text inside the prompt.
 * Few-shot belongs as messages (below) so the model learns the tone by example.
 */
const SYSTEM_PROMPT = `
You are PeaceBridge: a warm, emotionally intelligent conflict/support companion.

STYLE:
- Sound human, not robotic.
- Do NOT use headings like "Next steps:".
- Avoid bullet lists unless the user asks for a list.
- Keep responses short: 3–7 sentences.
- Use a gentle, empathetic tone. Light emojis are okay (max 1).
- End with ONE thoughtful question.
- Avoid generic filler like "I'm here to listen and help" unless it truly fits.
- Do not introduce new topics (e.g., job search) unless the user mentions them in THIS conversation.

PACE:
- Do not dump advice. Offer at most ONE small suggestion per turn.
- Prioritize reflection and reassurance before problem-solving.

SAFETY:
- If user expresses self-harm intent or immediate danger, respond with crisis-safe guidance and encourage reaching local emergency services.
- Otherwise, do not mention policies.

TASK:
- Help the user feel understood and grounded, then guide them one step at a time.
`.trim();

function buildSystemMessages() {
  return [
    { role: "system", content: SYSTEM_PROMPT },
  ];
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
  if (crisis.test(t)) {
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

router.post("/", async (req, res) => {
  await acquireLock();
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    // Find latest user message text for emotion chip computation
    const lastUser = [...messages].reverse().find((m) => m?.role === "user");
    const userText = lastUser?.content || "";

    const emotion = detectEmotion(userText);
    const fallbackText = pickFallback(userText, emotion.primary_emotion);

    // Build chat messages
    const chatMessages = [...buildSystemMessages(), ...messages.slice(-6)];

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

    // If crisis detected, you may want to override the model entirely:
    if (emotion.safety_level === "crisis") {
      return res.json({
        ...DEFAULT_REPLY,
        assistant_message:
          "I’m really sorry you’re feeling this much pain. If you’re in immediate danger or thinking about harming yourself, please call your local emergency number right now. If you’re in the U.S., you can call or text **988** for the Suicide & Crisis Lifeline. If you can, tell me: are you safe right now, and are you alone?",
        primary_emotion: emotion.primary_emotion,
        secondary_emotions: emotion.secondary_emotions,
        intensity: emotion.intensity,
        safety_level: "crisis",
        debug_mode: "CRISIS_OVERRIDE",
      });
    }

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
      });
    }

    const data = await r.json();
    const reply = data?.message?.content?.trim() || "";

    if (!reply) {
      return res.json({
        ...DEFAULT_REPLY,
        assistant_message: fallbackText,
        primary_emotion: emotion.primary_emotion,
        secondary_emotions: emotion.secondary_emotions,
        intensity: emotion.intensity,
        safety_level: emotion.safety_level,
        debug_mode: "FALLBACK_USED_EMPTY_REPLY",
      });
    }

    const showEmotion = emotion.primary_emotion !== "unknown";

    return res.json({
      ...DEFAULT_REPLY,
      assistant_message: reply,
      primary_emotion: showEmotion ? emotion.primary_emotion : null,
      secondary_emotions: showEmotion ? emotion.secondary_emotions : [],
      intensity: showEmotion ? emotion.intensity : null,
      safety_level: emotion.safety_level,
      debug_mode: "AI_USED",
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
    });
  } finally {
    releaseLock();
  }
});

export default router;
