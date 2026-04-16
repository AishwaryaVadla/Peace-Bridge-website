const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function generateOutcome(sessionId, mode = "chatbot") {
  const res = await fetch(`${API_BASE}/api/outcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, mode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json(); // { outcome: { summary, perspective_a, perspective_b, resolution, next_step } }
}
