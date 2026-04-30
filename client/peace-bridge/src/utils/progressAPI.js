const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export function getOrCreateUserId() {
  let id = localStorage.getItem("pb_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("pb_user_id", id);
  }
  return id;
}

export async function fetchProgress(userId, limit = 20) {
  const res = await fetch(`${API_BASE}/api/progress?user_id=${encodeURIComponent(userId)}&limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
