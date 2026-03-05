const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function sendChat(message, sessionId = null) {
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId || null,
        message: message || "",
      }),
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
    return {
      text: "I’m sorry, I had trouble responding just now. Could you try again?",
      data: { debug_mode: "CLIENT_FALLBACK" },
    };
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
