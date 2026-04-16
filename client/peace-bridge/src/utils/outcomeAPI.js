const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * sessionId   – Supabase session UUID (preferred — fetches from DB)
 * mode        – "chatbot" | "roleplay" | "mediator"
 * fallbackMsgs – [{ role, content }] used if DB returns nothing
 */
export async function generateOutcome(sessionId, mode = "chatbot", fallbackMsgs = []) {
  const res = await fetch(`${API_BASE}/api/outcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId || null,
      messages: fallbackMsgs,
      mode,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}
