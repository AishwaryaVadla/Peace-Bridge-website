const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function startMediation(disputeType, partyAInput = null, partyBInput = null) {
  const res = await fetch(`${API_BASE}/api/mediator/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dispute_type: disputeType,
      party_a_input: partyAInput,
      party_b_input: partyBInput,
    }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch {}
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json();
}

export async function sendMediatorMessage(sessionId, message, activeParties) {
  const res = await fetch(`${API_BASE}/api/mediator/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message, active_parties: activeParties }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch {}
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json();
}

export async function endMediation(sessionId) {
  const res = await fetch(`${API_BASE}/api/mediator/end`, {
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
