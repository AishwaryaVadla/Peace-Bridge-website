// server/routes/roleplay.js
import express from "express";
import { supabase } from "../supabaseClient.js";
import { chatComplete } from "../llm.js";

const router = express.Router();

const CRISIS_RE =
  /\b(kill (myself|yourself|himself|herself)|suicide|want to die|end (my|this) life|hurt (myself|yourself)|self.?harm|not worth living)\b/i;

// Memory update trigger — every N turns
const MEMORY_UPDATE_INTERVAL = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectEmotionalState(userText) {
  const t = (userText || "").toLowerCase();
  if (/\b(angry|furious|hate|stupid|unfair|ridiculous|never|always|sick of|fed up|don't care|whatever)\b/.test(t)) return "escalating";
  if (/\b(understand|appreciate|sorry|thank|feel|listen|agree|respect|try|help)\b/.test(t)) return "empathetic";
  return "neutral";
}

function buildRoleplaySystemPrompt(scenario, emotionalState, memory) {
  const toneGuidance = {
    escalating: "The user seems frustrated or escalating. Stay in character but slow down slightly, repeat a key concern to show you heard them, and avoid matching their intensity.",
    empathetic: "The user is showing empathy or openness. Respond warmly and begin to show small signs of softening or willingness to talk.",
    neutral: "Maintain natural character. Keep the conversation moving forward.",
  };

  const escalationGuidance = memory?.escalation_level
    ? `\nCurrent escalation level: ${memory.escalation_level}/5. ${
        memory.escalation_level >= 4
          ? "Be more guarded and defensive in tone."
          : memory.escalation_level <= 2
          ? "Remain relatively calm, with mild tension."
          : "Show moderate defensiveness."
      }`
    : "";

  const customContextBlock = memory?.custom_context
    ? `\nUser's specific situation: "${memory.custom_context}" — keep this in mind throughout.`
    : "";

  return `${scenario.system_prompt}${customContextBlock}

Emotional tone guidance (do not break character — use this to inform your delivery):
${toneGuidance[emotionalState]}${escalationGuidance}

Keep your reply to 2–4 sentences. Stay fully in character. Do not summarize or explain — just respond as your character would.`;
}

// ── Memory compression ─────────────────────────────────────────────────────────

async function updateRoleplayMemory(sessionId, olderMsgs, existingMemory) {
  const transcript = olderMsgs
    .map((m) => `${m.role === "user" ? "User" : "Character"}: ${m.content}`)
    .join("\n");

  const existingContext = existingMemory
    ? `\nExisting memory (update/refine it, do not discard):\n${JSON.stringify(existingMemory, null, 2)}\n`
    : "";

  const prompt = `You are analyzing a conflict-resolution roleplay conversation for a research platform.
${existingContext}
New transcript segment:
${transcript}

Return ONLY valid JSON — no explanation, no markdown — in exactly this shape:
{
  "conflict_summary": "one sentence describing the core conflict",
  "emotional_state": {
    "user": "frustrated / calm / empathetic / guarded / etc.",
    "character": "defensive / softening / neutral / etc."
  },
  "character_position": "one sentence on what the character believes",
  "escalation_level": 1,
  "agreements_reached": [],
  "unresolved_points": [],
  "relationship_tone": "one word or short phrase"
}`;

  try {
    const raw = await chatComplete(
      [{ role: "user", content: prompt }],
      { temperature: 0.2, num_predict: 300 }
    );

    // Extract JSON from the response (model may add prose around it)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const newMemory = JSON.parse(jsonMatch[0]);
    // Preserve custom_context set at session start
    if (existingMemory?.custom_context) {
      newMemory.custom_context = existingMemory.custom_context;
    }
    await supabase
      .from("sessions")
      .update({ roleplay_memory: newMemory })
      .eq("id", sessionId);
  } catch {
    // Non-fatal — silently skip if Ollama or parse fails
  }
}

// ── Context builder (3-layer) ──────────────────────────────────────────────────

function buildContext(allMsgs, memory) {
  const RECENT_COUNT = 12;

  if (allMsgs.length <= RECENT_COUNT) {
    return allMsgs.map((m) => ({ role: m.role, content: m.content }));
  }

  const recent = allMsgs.slice(-RECENT_COUNT).map((m) => ({ role: m.role, content: m.content }));

  // Layer 2 — structured long-term memory (if available) or plain excerpt
  let memoryMessage;
  if (memory) {
    memoryMessage = {
      role: "system",
      content: `Long-term memory of this session:\n${JSON.stringify(memory, null, 2)}`,
    };
  } else {
    const older = allMsgs.slice(0, -RECENT_COUNT);
    const excerpt = older
      .map((m) => `${m.role === "user" ? "User" : "Character"}: ${m.content}`)
      .join("\n")
      .slice(0, 800);
    memoryMessage = {
      role: "system",
      content: `Earlier in this session the user and character discussed:\n${excerpt}`,
    };
  }

  return [memoryMessage, ...recent];
}


// ── Conflict trajectory scoring ───────────────────────────────────────────────

async function scoreConflictTurn(userText, botReply, turnNumber) {
  const prompt = `You are a conflict-resolution researcher scoring a single exchange in a roleplay session.

Learner said: "${userText}"
Character replied: "${botReply}"

Score the LEARNER's message only on four dimensions (1 = very low, 5 = very high):
- empathy: Did they acknowledge the other person's feelings?
- clarity: Was their message clear and specific?
- assertiveness: Did they state their needs without aggression or passivity?
- de_escalation: Did their message reduce tension rather than increase it?

Also give direction: "improving", "stable", or "declining" (compared to a typical opening message).
And a brief note (one sentence) on what stood out.

Return ONLY valid JSON, no markdown:
{
  "turn": ${turnNumber},
  "scores": { "empathy": 0, "clarity": 0, "assertiveness": 0, "de_escalation": 0 },
  "direction": "stable",
  "note": ""
}`;

  try {
    const raw = await chatComplete(
      [{ role: "user", content: prompt }],
      { temperature: 0.2, num_predict: 180 }
    );
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const score = JSON.parse(jsonMatch[0]);
    // Clamp scores 1–5
    for (const k of Object.keys(score.scores || {})) {
      score.scores[k] = Math.min(5, Math.max(1, Math.round(score.scores[k])));
    }
    return score;
  } catch {
    return null;
  }
}

async function appendTrajectoryScore(sessionId, score, existingTrajectory) {
  try {
    const updated = [...(existingTrajectory || []), score];
    await supabase.from("sessions").update({ conflict_trajectory: updated }).eq("id", sessionId);
  } catch { /* non-fatal */ }
}

// ── Live coaching ──────────────────────────────────────────────────────────────

async function runCoaching(userText, sessionId) {
  const prompt = `You are a conflict-resolution coach evaluating a single message sent during a mediation roleplay.

Message: "${userText}"

Evaluate strictly and return ONLY valid JSON, no markdown:
{
  "tone": "calm / neutral / slightly aggressive / aggressive",
  "empathy": "low / medium / high",
  "suggestion": "one concrete improvement (1 sentence)"
}`;

  try {
    const raw = await chatComplete(
      [{ role: "user", content: prompt }],
      { temperature: 0.2, num_predict: 120 }
    );
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// ── Rewrite helper ─────────────────────────────────────────────────────────────

async function runRewrite(userText) {
  const prompt = `Rewrite the following message to be calm, respectful, and clear. Keep the same intent but improve the tone for a conflict resolution conversation. Return ONLY the rewritten message with no explanation or quotes.

Original: "${userText}"`;

  try {
    return await chatComplete(
      [{ role: "user", content: prompt }],
      { temperature: 0.5, num_predict: 150 }
    );
  } catch {
    return null;
  }
}

// ── Debrief engine ─────────────────────────────────────────────────────────────

async function runDebrief(sessionId, scenarioTitle, memory) {
  try {
  const { data: msgs, error: msgsErr } = await supabase
    .from("session_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (msgsErr) console.error("runDebrief msgs error:", msgsErr);
  if (!msgs || msgs.length < 2) {
    return { well_done: "Session was too short to evaluate.", improve: "", tip: "", next_step: "" };
  }

  const memoryContext = memory
    ? `\nSession memory:\n${JSON.stringify(memory, null, 2)}\n`
    : "";

  const transcript = msgs
    .slice(-20)
    .map((m) => `${m.role === "user" ? "Learner" : "Character"}: ${m.content}`)
    .join("\n");

  const prompt = `You are a conflict-resolution coach reviewing a roleplay practice session.
Scenario: "${scenarioTitle}"${memoryContext}

Recent transcript:
${transcript}

Return ONLY valid JSON, no markdown:
{
  "well_done": "one specific thing the learner did well (1–2 sentences)",
  "improve": "one specific area to improve (1 sentence)",
  "tip": "one concrete technique for next time (1 sentence)",
  "next_step": "one actionable opening phrase they can use, e.g. \\"Try starting with: I understand your concern about…\\""
}`;

  try {
    const raw = await chatComplete(
      [{ role: "user", content: prompt }],
      { temperature: 0.5, num_predict: 300 }
    );
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed;
    }
    // Fallback: return raw text in well_done field
    return { well_done: raw, improve: "", tip: "", next_step: "" };
  } catch (ollamaErr) {
    console.error("runDebrief Ollama error:", ollamaErr?.message);
    return { well_done: "Unable to generate debrief at this time.", improve: "", tip: "", next_step: "" };
  }
  } catch (outerErr) {
    console.error("runDebrief outer error:", outerErr?.message);
    return { well_done: "Unable to generate debrief at this time.", improve: "", tip: "", next_step: "" };
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/roleplay/start
router.post("/start", async (req, res) => {
  try {
    const { scenario_id, custom_context } = req.body || {};
    if (!scenario_id) return res.status(400).json({ error: "scenario_id is required" });

    const { data: scenario, error: scErr } = await supabase
      .from("scenarios")
      .select("*")
      .eq("id", scenario_id)
      .single();

    if (scErr || !scenario) return res.status(404).json({ error: "Scenario not found" });

    const hasCustomContext = custom_context && custom_context.trim().length > 0;

    // If custom context provided, generate a personalized opener via LLM
    let starterMessage = scenario.starter_message;
    if (hasCustomContext) {
      try {
        const prompt = `${scenario.system_prompt}

The user has provided this specific situation context: "${custom_context.trim()}"

Open the conversation as your character would, addressing the user's specific situation directly. Keep it to 2-3 sentences, stay fully in character.`;
        starterMessage = await chatComplete([{ role: "user", content: prompt }], { temperature: 0.8 });
      } catch {
        // Fall back to default starter if LLM fails
        starterMessage = scenario.starter_message;
      }
    }

    // Store custom_context in roleplay_memory so all future turns are aware of it
    const initialMemory = hasCustomContext
      ? { custom_context: custom_context.trim() }
      : null;

    const { data: session, error: sessErr } = await supabase
      .from("sessions")
      .insert({ mode: "roleplay", scenario_id, turn_count: 0, roleplay_memory: initialMemory })
      .select()
      .single();

    if (sessErr) return res.status(500).json({ error: sessErr.message });

    await supabase.from("session_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: starterMessage,
    });

    return res.json({ session_id: session.id, reply: starterMessage });
  } catch (err) {
    console.error("Roleplay /start error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/roleplay  (continue)
router.post("/", async (req, res) => {
  try {
    const { message, session_id } = req.body || {};

    const userText = (message || "").trim();
    if (!userText || !session_id) {
      return res.status(400).json({ error: "session_id and message are required" });
    }

    // Crisis guard — exit roleplay immediately
    if (CRISIS_RE.test(userText)) {
      return res.json({
        session_id,
        reply: null,
        crisis: true,
        crisis_message:
          "I noticed something in what you wrote that concerns me. This practice session is paused. If you or someone you know is struggling, please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988.",
      });
    }

    // Fetch session (includes roleplay_memory)
    const { data: session, error: sessErr } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessErr || !session) return res.status(404).json({ error: "Session not found" });
    if (session.mode !== "roleplay") return res.status(400).json({ error: "Not a roleplay session" });

    // Fetch scenario separately
    const { data: scenario, error: scErr } = await supabase
      .from("scenarios")
      .select("system_prompt")
      .eq("id", session.scenario_id)
      .single();

    if (scErr || !scenario) return res.status(404).json({ error: "Scenario not found" });

    const turnCount = (session.turn_count || 0) + 1;
    const emotionalState = detectEmotionalState(userText);
    const memory = session.roleplay_memory || null;
    const trajectory = session.conflict_trajectory || [];

    // Fetch ALL messages (no limit — memory compression handles context size)
    const { data: allMsgs } = await supabase
      .from("session_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    const context = buildContext(allMsgs || [], memory);
    const systemPrompt = buildRoleplaySystemPrompt(scenario, emotionalState, memory);

    const reply = await chatComplete(
      [{ role: "system", content: systemPrompt }, ...context, { role: "user", content: userText }]
    ).catch(() => "I didn't quite catch that — could you say that again?");

    // Persist messages + update turn count
    await Promise.all([
      supabase.from("sessions").update({ turn_count: turnCount }).eq("id", session_id),
      supabase.from("session_messages").insert([
        { session_id, role: "user", content: userText },
        { session_id, role: "assistant", content: reply },
      ]),
    ]);

    // Trigger structured memory update every N turns (fire-and-forget)
    if (turnCount % MEMORY_UPDATE_INTERVAL === 0 && (allMsgs?.length || 0) > MEMORY_UPDATE_INTERVAL) {
      const olderMsgs = (allMsgs || []).slice(0, -(MEMORY_UPDATE_INTERVAL / 2));
      updateRoleplayMemory(session_id, olderMsgs, memory).catch(() => {});
    }

    // Conflict trajectory scoring — fully fire-and-forget (does not block response)
    scoreConflictTurn(userText, reply, turnCount)
      .then((s) => { if (s) appendTrajectoryScore(session_id, s, trajectory).catch(() => {}); })
      .catch(() => {});

    return res.json({ session_id, reply, emotional_state: emotionalState });
  } catch (err) {
    console.error("Roleplay continue error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/roleplay/coaching  (live feedback on user message)
router.post("/coaching", async (req, res) => {
  try {
    const { message, session_id } = req.body || {};
    const userText = (message || "").trim();
    if (!userText) return res.status(400).json({ error: "message is required" });
    const coaching = await runCoaching(userText, session_id);
    return res.json({ coaching });
  } catch (err) {
    console.error("Roleplay /coaching error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/roleplay/rewrite  (suggest improved phrasing)
router.post("/rewrite", async (req, res) => {
  try {
    const { message } = req.body || {};
    const userText = (message || "").trim();
    if (!userText) return res.status(400).json({ error: "message is required" });
    const rewrite = await runRewrite(userText);
    return res.json({ rewrite: rewrite || userText });
  } catch (err) {
    console.error("Roleplay /rewrite error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/roleplay/end  (debrief)
router.post("/end", async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ error: "session_id is required" });

    // Use select("*") so missing optional columns (roleplay_memory etc.) don't cause errors
    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    let scenarioTitle = "Conflict Practice";
    if (session?.scenario_id) {
      const { data: sc } = await supabase
        .from("scenarios")
        .select("title")
        .eq("id", session.scenario_id)
        .single();
      if (sc?.title) scenarioTitle = sc.title;
    }

    // runDebrief catches all its own errors — always returns a structured object
    const debrief = await runDebrief(session_id, scenarioTitle, session?.roleplay_memory ?? null);

    // Fire-and-forget: mark session ended (column may not exist yet)
    (async () => { try { await supabase.from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", session_id); } catch {} })();

    return res.json({ session_id, debrief });
  } catch (err) {
    console.error("Roleplay /end error:", err?.message, err?.stack);
    return res.json({ session_id: req.body?.session_id, debrief: `[Debug] End route threw: ${err?.message}. Check server logs.` });
  }
});

export default router;
