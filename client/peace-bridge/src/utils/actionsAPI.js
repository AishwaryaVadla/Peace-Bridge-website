const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function generateActions(sessionId, userId, fallbackMessages = []) {
  try {
    const res = await fetch(`${API_BASE}/api/actions/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, user_id: userId, messages: fallbackMessages }),
    });
    if (!res.ok) return { actions: [] };
    return res.json();
  } catch {
    return { actions: [] };
  }
}

export async function fetchUserActions(userId) {
  const res = await fetch(`${API_BASE}/api/actions/user/${encodeURIComponent(userId)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createAction(userId, sessionId, text, priority = "medium") {
  const res = await fetch(`${API_BASE}/api/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, session_id: sessionId, text, priority }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateAction(id, updates) {
  const res = await fetch(`${API_BASE}/api/actions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteAction(id) {
  await fetch(`${API_BASE}/api/actions/${id}`, { method: "DELETE" });
}
