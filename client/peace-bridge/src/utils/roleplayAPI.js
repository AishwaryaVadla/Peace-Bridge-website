const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function getScenarios() {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/scenarios`);
  } catch (networkErr) {
    throw new Error(`Cannot reach server at ${API_BASE} — ${networkErr.message}`);
  }
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch {}
    throw new Error(`Server returned ${res.status}${detail ? `: ${detail}` : ""} (${API_BASE})`);
  }
  return res.json();
}

export async function startRoleplay(scenarioId, customContext = "") {
  const res = await fetch(`${API_BASE}/api/roleplay/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_id: scenarioId, custom_context: customContext || "" }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch {}
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json();
}

export async function sendRoleplay(message, sessionId) {
  const res = await fetch(`${API_BASE}/api/roleplay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch {}
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json();
}

export async function endRoleplay(sessionId) {
  const res = await fetch(`${API_BASE}/api/roleplay/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch {}
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json();
}
