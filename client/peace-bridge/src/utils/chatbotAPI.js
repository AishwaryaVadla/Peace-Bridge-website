const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const CHAT_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes — covers long voice / complex messages

export async function sendChat(message, sessionId = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId || null,
        message: message || "",
      }),
      signal: controller.signal,
    });

    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      data = {};
    }

    const text =
      data.assistant_message ||
      data.reply ||
      data.text ||
      (res.ok ? "" : "I’m still thinking — give me a moment and try again?");

    if (!text) {
      throw new Error(`Empty assistant message (HTTP ${res.status})`);
    }

    return { text, data };
  } catch (err) {
    console.error("sendChat error:", err);
    const timedOut = err.name === "AbortError";
    return {
      text: timedOut
        ? "That took longer than expected — the response may still be processing. Please try sending a shorter message or try again in a moment."
        : "I’m sorry, I had trouble responding just now. Could you try again?",
      data: { debug_mode: timedOut ? "CLIENT_TIMEOUT" : "CLIENT_FALLBACK" },
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendSessionSummary(messages, sessionId) {
  const res = await fetch(`${API_BASE}/api/session-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, session_id: sessionId || null }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.summary) {
    throw new Error("Empty summary");
  }
  return data;
}
