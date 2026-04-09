// server/routes/mediator.js
import express from "express";
import { supabase } from "../supabaseClient.js";
import { chatComplete } from "../llm.js";

const router = express.Router();

// ── Context builder ────────────────────────────────────────────────────────────

function buildPartyContext(allMsgs, partyRole, isJoint, partyAName, partyBName) {
  const RECENT = 14;
  const msgs = (allMsgs || []).slice(-RECENT);
  return msgs.map((m) => {
    if (m.role === "mediator") return { role: "user", content: m.content };
    if (m.role === partyRole) return { role: "assistant", content: m.content };
    if (isJoint) {
      const otherName = m.role === "party_a" ? partyAName : partyBName;
      return { role: "user", content: `[${otherName} said: "${m.content}"]` };
    }
    return null;
  }).filter(Boolean);
}

// ── POST /api/mediator/start ───────────────────────────────────────────────────

router.post("/start", async (req, res) => {
  try {
    const { dispute_type, party_a_input, party_b_input } = req.body || {};
    if (!dispute_type) return res.status(400).json({ error: "dispute_type is required" });

    const hasManualInput =
      party_a_input?.name && party_a_input?.story &&
      party_b_input?.name && party_b_input?.story;

    let partyAData, partyBData, disputeSummary;

    if (hasManualInput) {
      // ── User-provided party details ──────────────────────────────────────────
      const genOpeningsPrompt = `You are setting up a mediation session. Based on each person's story, generate their opening statement to a professional mediator.

Party 1: ${party_a_input.name} (${party_a_input.role || "party"})
Their story: "${party_a_input.story}"

Party 2: ${party_b_input.name} (${party_b_input.role || "party"})
Their story: "${party_b_input.story}"

Return ONLY valid JSON, no markdown:
{
  "party_a_opening": "How ${party_a_input.name} opens to the mediator — 2-3 sentences, in character, based on their story",
  "party_a_emotional_state": "2-3 words describing their emotional state",
  "party_b_opening": "How ${party_b_input.name} opens to the mediator — 2-3 sentences, in character, based on their story",
  "party_b_emotional_state": "2-3 words describing their emotional state",
  "dispute_summary": "One neutral sentence summarising the core conflict between them"
}`;

      const raw = await chatComplete([{ role: "user", content: genOpeningsPrompt }], { temperature: 0.8, num_predict: 500 });
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("LLM did not return valid JSON");
      const gen = JSON.parse(match[0]);

      partyAData = {
        name: party_a_input.name.trim(),
        role: party_a_input.role?.trim() || "Party",
        story: party_a_input.story.trim(),
        emotional_state: gen.party_a_emotional_state || "concerned",
        opening_statement: gen.party_a_opening,
      };
      partyBData = {
        name: party_b_input.name.trim(),
        role: party_b_input.role?.trim() || "Party",
        story: party_b_input.story.trim(),
        emotional_state: gen.party_b_emotional_state || "frustrated",
        opening_statement: gen.party_b_opening,
      };
      disputeSummary = gen.dispute_summary || `${dispute_type} dispute between ${partyAData.name} and ${partyBData.name}`;

    } else {
      // ── Auto-generate both parties ────────────────────────────────────────────
      const setupPrompt = `You are setting up a mediation training session for a conflict resolution platform.

Dispute type: ${dispute_type}
${req.body.dispute_details ? `Scenario context: ${req.body.dispute_details}` : ""}

Create two realistic parties for this mediation. Each party should have a genuine grievance and a distinct emotional state.

Return ONLY valid JSON, no markdown:
{
  "party_a": {
    "name": "First name only",
    "role": "Their relationship/role in the dispute",
    "story": "Their perspective on what happened (2-3 sentences)",
    "emotional_state": "2-3 words",
    "opening_statement": "How they open to the mediator, 2-3 sentences in character"
  },
  "party_b": {
    "name": "First name only (different from party_a)",
    "role": "Their relationship/role in the dispute",
    "story": "Their perspective on what happened (2-3 sentences)",
    "emotional_state": "2-3 words",
    "opening_statement": "How they open to the mediator, 2-3 sentences in character"
  },
  "dispute_summary": "One neutral sentence describing the core conflict"
}`;

      const raw = await chatComplete([{ role: "user", content: setupPrompt }], { temperature: 0.85, num_predict: 600 });
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("LLM did not return valid JSON");
      const parties = JSON.parse(match[0]);

      partyAData = parties.party_a;
      partyBData = parties.party_b;
      disputeSummary = parties.dispute_summary;
    }

    // ── Build system prompts ──────────────────────────────────────────────────
    const partyAPrompt = `You are ${partyAData.name} in a professional mediation session.

Your role: ${partyAData.role}
Your story: ${partyAData.story}
Your emotional state: ${partyAData.emotional_state}

You are speaking with a trained mediator. Respond authentically — stay true to your story, show your feelings, your needs. You may mention the other party by name. Do NOT be immediately agreeable. Keep replies 2–4 sentences.`;

    const partyBPrompt = `You are ${partyBData.name} in a professional mediation session.

Your role: ${partyBData.role}
Your story: ${partyBData.story}
Your emotional state: ${partyBData.emotional_state}

You are speaking with a trained mediator. Respond authentically — stay true to your story, show your feelings, your needs. You may mention the other party by name. Do NOT be immediately agreeable. Keep replies 2–4 sentences.`;

    const memory = {
      mode: "mediator",
      dispute_type,
      dispute_summary: disputeSummary,
      party_a: { ...partyAData, system_prompt: partyAPrompt },
      party_b: { ...partyBData, system_prompt: partyBPrompt },
    };

    const { data: session, error: sessErr } = await supabase
      .from("sessions")
      .insert({ mode: "mediator", scenario_id: null, turn_count: 0, roleplay_memory: memory })
      .select()
      .single();

    if (sessErr) return res.status(500).json({ error: sessErr.message });

    await supabase.from("session_messages").insert([
      { session_id: session.id, role: "party_a", content: partyAData.opening_statement },
      { session_id: session.id, role: "party_b", content: partyBData.opening_statement },
    ]);

    return res.json({
      session_id: session.id,
      party_a: {
        name: partyAData.name,
        role: partyAData.role,
        emotional_state: partyAData.emotional_state,
        opening: partyAData.opening_statement,
      },
      party_b: {
        name: partyBData.name,
        role: partyBData.role,
        emotional_state: partyBData.emotional_state,
        opening: partyBData.opening_statement,
      },
      dispute_summary: disputeSummary,
    });
  } catch (err) {
    console.error("/mediator/start error:", err);
    return res.status(500).json({ error: "Failed to generate mediation scenario" });
  }
});

// ── POST /api/mediator/chat ────────────────────────────────────────────────────

router.post("/chat", async (req, res) => {
  try {
    const { session_id, message, active_parties } = req.body || {};
    if (!session_id || !message?.trim()) {
      return res.status(400).json({ error: "session_id and message are required" });
    }

    const parties = Array.isArray(active_parties) && active_parties.length ? active_parties : ["a", "b"];
    const isJoint = parties.includes("a") && parties.includes("b");
    const mediatorText = message.trim();

    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (!session) return res.status(404).json({ error: "Session not found" });

    const mem = session.roleplay_memory || {};
    const partyA = mem.party_a;
    const partyB = mem.party_b;

    const { data: allMsgs } = await supabase
      .from("session_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    // Save mediator message first
    await supabase.from("session_messages").insert({
      session_id,
      role: "mediator",
      content: mediatorText,
    });

    const results = {};
    const insertMsgs = [];

    if (parties.includes("a") && partyA) {
      const context = buildPartyContext(allMsgs, "party_a", isJoint, partyA.name, partyB?.name || "the other party");
      const replyA = await chatComplete(
        [{ role: "system", content: partyA.system_prompt }, ...context, { role: "user", content: mediatorText }]
      ).catch(() => "I hear what you're saying. Let me think about that.");
      results.party_a_reply = replyA;
      insertMsgs.push({ session_id, role: "party_a", content: replyA });
    }

    if (parties.includes("b") && partyB) {
      const context = buildPartyContext(allMsgs, "party_b", isJoint, partyA?.name || "the other party", partyB.name);
      const replyB = await chatComplete(
        [{ role: "system", content: partyB.system_prompt }, ...context, { role: "user", content: mediatorText }]
      ).catch(() => "I understand. I'll consider that.");
      results.party_b_reply = replyB;
      insertMsgs.push({ session_id, role: "party_b", content: replyB });
    }

    if (insertMsgs.length) {
      await supabase.from("session_messages").insert(insertMsgs);
    }

    await supabase.from("sessions")
      .update({ turn_count: (session.turn_count || 0) + 1 })
      .eq("id", session_id);

    return res.json({ session_id, ...results });
  } catch (err) {
    console.error("/mediator/chat error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/mediator/end ────────────────────────────────────────────────────

router.post("/end", async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ error: "session_id is required" });

    const { data: session } = await supabase.from("sessions").select("*").eq("id", session_id).single();
    const { data: msgs } = await supabase
      .from("session_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    const mem = session?.roleplay_memory || {};
    const nameA = mem.party_a?.name || "Party A";
    const nameB = mem.party_b?.name || "Party B";

    const transcript = (msgs || []).slice(-24).map((m) => {
      const label = m.role === "mediator" ? "Mediator" : m.role === "party_a" ? nameA : nameB;
      return `${label}: ${m.content}`;
    }).join("\n");

    const prompt = `You are a conflict-resolution expert evaluating a student's performance as a mediator.

Dispute: ${mem.dispute_type || "Conflict"}
${mem.dispute_summary ? `Summary: ${mem.dispute_summary}` : ""}

Transcript:
${transcript}

Evaluate the mediator's performance and return ONLY valid JSON, no markdown:
{
  "well_done": "one specific strength of their mediation approach (1-2 sentences)",
  "improve": "one specific area for improvement (1 sentence)",
  "tip": "one concrete mediation technique to try next time (1 sentence)",
  "next_step": "one example phrase they could use to move the session forward"
}`;

    try {
      const raw = await chatComplete([{ role: "user", content: prompt }], { temperature: 0.5, num_predict: 300 });
      const match = raw.match(/\{[\s\S]*\}/);
      const debrief = match ? JSON.parse(match[0]) : { well_done: raw, improve: "", tip: "", next_step: "" };
      await supabase.from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", session_id).catch(() => {});
      return res.json({ session_id, debrief });
    } catch {
      return res.json({ session_id, debrief: { well_done: "Session complete.", improve: "", tip: "", next_step: "" } });
    }
  } catch (err) {
    console.error("/mediator/end error:", err);
    return res.json({ session_id: req.body?.session_id, debrief: { well_done: "Session complete.", improve: "", tip: "", next_step: "" } });
  }
});

export default router;
