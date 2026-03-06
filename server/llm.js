// Unified LLM helper — uses Claude when ANTHROPIC_API_KEY is set, Ollama otherwise
import Anthropic from "@anthropic-ai/sdk";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

async function fetchWithTimeout(url, options, timeoutMs = 45000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function claudeChat(messages, opts = {}) {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
  let nonSystem = messages.filter((m) => m.role !== "system");

  // Claude requires messages to start with "user" — drop any leading assistant messages
  while (nonSystem.length > 0 && nonSystem[0].role !== "user") {
    nonSystem = nonSystem.slice(1);
  }

  if (nonSystem.length === 0) throw new Error("No user messages to send to Claude");

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.max_tokens ?? 1024,
    temperature: opts.temperature ?? 0.8,
    ...(systemParts.length ? { system: systemParts.join("\n\n") } : {}),
    messages: nonSystem,
  });

  return response.content[0]?.text?.trim() || "";
}

async function ollamaChat(messages, opts = {}) {
  const payload = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: {
      temperature: opts.temperature ?? 0.85,
      top_p: 0.9,
      num_ctx: 1024,
      num_predict: opts.num_predict ?? 160,
    },
  };
  const r = await fetchWithTimeout(
    `${OLLAMA_URL}/api/chat`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    45000
  );
  if (!r.ok) throw new Error(`Ollama ${r.status}`);
  const data = await r.json();
  return data?.message?.content?.trim() || "";
}

export async function chatComplete(messages, opts = {}) {
  if (anthropic) return claudeChat(messages, opts);
  return ollamaChat(messages, opts);
}
