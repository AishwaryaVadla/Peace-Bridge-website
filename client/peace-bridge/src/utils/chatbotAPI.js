export async function sendChat(messages) {
  try {
    const res = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
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
