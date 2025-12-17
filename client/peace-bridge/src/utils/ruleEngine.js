// src/utils/ruleEngine.js
// Improved: concise, structured, context-aware (still rule-based)

const CATEGORY_KEYWORDS = {
  interpersonal: ["roommate", "friend", "partner", "argue", "argument", "fight", "yell", "yelled", "angry", "upset"],
  academic: ["group", "project", "professor", "grade", "deadline", "assignment", "class"],
  workplace: ["boss", "manager", "coworker", "office", "job", "work"],
  emotional: ["anxious", "anxiety", "sad", "stressed", "overwhelmed", "panic", "depressed"],
};

// very simple issue detectors (we can expand later)
function detectIssue(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("dish") || t.includes("dishes") || t.includes("clean") || t.includes("chores")) return "chores";
  if (t.includes("late") || t.includes("ignored") || t.includes("disrespect")) return "respect";
  if (t.includes("money") || t.includes("rent") || t.includes("bill")) return "money";
  return "general";
}

function detectCategory(text) {
  const t = (text || "").toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) return cat;
  }
  return "interpersonal";
}

function containsStrongEmotion(text) {
  const t = (text || "").toLowerCase();
  return ["furious", "angry", "very angry", "panic", "overwhelmed", "hate", "can’t handle", "bad day"].some((k) =>
    t.includes(k)
  );
}

// Pull a few useful facts from the user's latest message + history
function extractContext(history) {
  const allUserText = history.filter(h => h.sender === "user").map(h => h.text).join(" ").toLowerCase();

  const issue = detectIssue(allUserText);
  const badDay = allUserText.includes("bad day") || allUserText.includes("work") || allUserText.includes("stressed");
  const apologizedTone = allUserText.includes("feel bad") || allUserText.includes("i feel very bad") || allUserText.includes("regret");

  return { issue, badDay, apologizedTone };
}

// Generate a tailored script based on issue type
function generateScript({ issue }) {
  if (issue === "chores") {
    return [
      "“Hey — I’m sorry I raised my voice earlier. I had a rough day and I reacted badly.”",
      "“Can we agree on a simple plan for dishes (who does what + by when) so it doesn’t build up?”",
      "“If it slips, can we remind each other calmly instead of letting it explode?”",
    ].join("\n");
  }

  if (issue === "money") {
    return [
      "“I want to talk about bills/rent calmly.”",
      "“Can we list what’s due and set a clear split + payment date?”",
      "“If something changes, can we message early so no one feels surprised?”",
    ].join("\n");
  }

  return [
    "“I’m sorry my tone was harsh.”",
    "“I want to solve this, not fight.”",
    "“Can we talk for 5 minutes about what each of us needs going forward?”",
  ].join("\n");
}

// Short, non-paragraph response composer
function formatReply({ summary, steps, question, script }) {
  const lines = [];
  if (summary) lines.push(`**Summary:** ${summary}`);
  if (steps?.length) {
    lines.push("**Try this (3 steps):**");
    steps.forEach((s) => lines.push(`- ${s}`));
  }
  if (script) {
    lines.push("**Message you can send:**");
    lines.push(script);
  }
  if (question) lines.push(`**Quick question:** ${question}`);
  return lines.join("\n");
}

export async function getBotReply(userText, context = {}) {
  const history = context.history || [];
  const category = detectCategory(userText || "");
  const extracted = extractContext(history);
  const issue = extracted.issue;

  // If strong emotion, keep it short and calming
  if (containsStrongEmotion(userText)) {
    return {
      category,
      reply: formatReply({
        summary: "You’re feeling a lot right now — let’s slow it down and prevent more damage.",
        steps: [
          "Take 20 seconds: inhale 4s → hold 2s → exhale 6s (repeat 2x).",
          "Decide your goal: apology, boundary, or a chore plan.",
          "Then we’ll draft a short message together.",
        ],
        question: "What do you want most right now: (A) apologize, (B) set a chore plan, or (C) cool down first?",
      }),
    };
  }

  // Tailored responses for interpersonal/roommate type conflicts
  if (category === "interpersonal") {
    const summary =
      issue === "chores"
        ? "Conflict about shared chores (dishes) + your frustration after a rough day."
        : "Interpersonal tension — likely a mismatch in expectations and communication.";

    const steps =
      issue === "chores"
        ? [
            "Start with a quick repair: apologize for yelling (tone), not for the boundary.",
            "State the expectation clearly: dishes need to be done by a time (ex: same night).",
            "Agree on a simple system: a schedule or “same-day rule” + reminder method.",
          ]
        : [
            "Repair the tone first so they can hear you.",
            "Explain your need/expectation in one sentence.",
            "Ask for a shared agreement (a specific behavior change).",
          ];

    return {
      category,
      reply: formatReply({
        summary,
        steps,
        script: generateScript({ issue }),
        question:
          "Do you want a **soft** message (more empathetic) or a **firm** message (more boundary-based)?",
      }),
    };
  }

  // Other categories (kept concise)
  if (category === "academic") {
    return {
      category,
      reply: formatReply({
        summary: "This sounds like an academic / coordination problem.",
        steps: [
          "Write the problem as facts (no blame).",
          "Propose a 10-minute meeting + assign tasks with deadlines.",
          "If it repeats, escalate to instructor with evidence.",
        ],
        question: "Is this a team member not contributing, or unclear expectations?",
      }),
    };
  }

  if (category === "workplace") {
    return {
      category,
      reply: formatReply({
        summary: "Work conflicts need calm + documentation.",
        steps: [
          "Write down facts (what, when, where).",
          "Request a short 1:1 to clarify expectations.",
          "Use neutral language and propose a solution.",
        ],
        question: "Is this about communication, workload, or respect?",
      }),
    };
  }

  return {
    category,
    reply: formatReply({
      summary: "I’m here with you — let’s make this easier to handle.",
      steps: ["Tell me what happened in one sentence.", "How did it make you feel?", "What outcome do you want?"],
      question: "What’s the one outcome you want most right now?",
    }),
  };
}
