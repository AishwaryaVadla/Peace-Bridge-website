const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function fetchJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => ({}));
      errMsg = body.error || errMsg;
    }
    throw new Error(errMsg);
  }

  return res.json();
}

export async function getJournals() {
  return fetchJson("/api/journal");
}

export async function getJournalById(id) {
  return fetchJson(`/api/journal/${id}`);
}

export async function createJournal(entry) {
  return fetchJson("/api/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
}

export async function updateJournal(id, entry) {
  return fetchJson(`/api/journal/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
}

export async function deleteJournal(id) {
  return fetchJson(`/api/journal/${id}`, { method: "DELETE" });
}

export async function getJournalInsight(content, mood) {
  return fetchJson("/api/journal/insight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, mood }),
  });
}
