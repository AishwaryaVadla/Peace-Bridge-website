import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { startMediation, sendMediatorMessage, endMediation } from "../utils/mediatorAPI";

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const DISPUTE_TYPES = [
  "Family",
  "Marital",
  "Intergenerational",
  "Tenant - Landlord",
  "Neighbor Disputes",
  "Workplace",
  "Elder Care",
  "Business - Customer",
  "Business - Business",
  "Defamation",
  "School & Education",
  "High Tech",
  "Sport",
  "Couple",
  "Racial",
  "Religious",
  "Geopolitical",
  "Other",
];

function PartyAvatar({ name, color }) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: "50%",
      background: color, color: "white",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: "1.1rem", flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

const INPUT_STYLE = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #c5cae9", fontSize: "0.95rem",
  background: "white", color: "#333", boxSizing: "border-box",
};
const LABEL_STYLE = { display: "block", fontWeight: 600, color: "#555", marginBottom: 6, fontSize: "0.88rem" };

function PartyForm({ label, color, value, onChange }) {
  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div style={{
        fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase",
        letterSpacing: "0.06em", color, marginBottom: 12,
        paddingBottom: 6, borderBottom: `2px solid ${color}`,
      }}>
        {label}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={LABEL_STYLE}>Name <span style={{ color: "#e53935" }}>*</span></label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g. Margaret"
          style={INPUT_STYLE}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={LABEL_STYLE}>Role in dispute <span style={{ color: "#888", fontWeight: 400 }}>(optional)</span></label>
        <input
          type="text"
          value={value.role}
          onChange={(e) => onChange({ ...value, role: e.target.value })}
          placeholder="e.g. Mother, Tenant, Employee"
          style={INPUT_STYLE}
        />
      </div>
      <div>
        <label style={LABEL_STYLE}>Their side of the story <span style={{ color: "#e53935" }}>*</span></label>
        <textarea
          value={value.story}
          onChange={(e) => onChange({ ...value, story: e.target.value })}
          placeholder="Describe their perspective, what happened, and what they want from this mediation…"
          rows={4}
          style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
        />
      </div>
    </div>
  );
}

function DebriefCard({ debrief, onReset }) {
  if (!debrief) return null;
  return (
    <div style={{
      margin: "20px 0", padding: "20px 24px",
      background: "#e8f5e9", border: "1px solid #81c784",
      borderRadius: 10, color: "#1b5e20", lineHeight: 1.7,
    }}>
      <strong style={{ fontSize: "1rem" }}>🏅 Mediator Debrief</strong>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {debrief.well_done && (
          <div style={{ background: "#c8e6c9", borderRadius: 8, padding: "10px 14px" }}>
            <span style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>✅ What you did well</span>
            <span>{debrief.well_done}</span>
          </div>
        )}
        {debrief.improve && (
          <div style={{ background: "#fff9c4", borderRadius: 8, padding: "10px 14px", color: "#5d4037" }}>
            <span style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>🔧 Area to improve</span>
            <span>{debrief.improve}</span>
          </div>
        )}
        {debrief.tip && (
          <div style={{ background: "#e3f2fd", borderRadius: 8, padding: "10px 14px", color: "#1a237e" }}>
            <span style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>💡 Technique for next time</span>
            <span>{debrief.tip}</span>
          </div>
        )}
        {debrief.next_step && (
          <div style={{ background: "#f3e5f5", borderRadius: 8, padding: "10px 14px", color: "#4a148c" }}>
            <span style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>🗣️ Phrase to try</span>
            <span>{debrief.next_step}</span>
          </div>
        )}
      </div>
      <button
        className="send-btn"
        style={{ marginTop: 16 }}
        onClick={onReset}
      >
        Start New Session
      </button>
    </div>
  );
}

export default function MediatorMode() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Setup state ──────────────────────────────────────────────────────────────
  const incomingState = location.state || {};
  const [disputeType, setDisputeType] = useState(incomingState.disputeType || "Family");
  const [isStarting, setIsStarting] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [formA, setFormA] = useState({ name: "", role: "", story: "" });
  const [formB, setFormB] = useState({ name: "", role: "", story: "" });

  // ── Session state ────────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState(null);
  const [partyA, setPartyA] = useState(null);   // { name, role, emotional_state, opening }
  const [partyB, setPartyB] = useState(null);
  const [disputeSummary, setDisputeSummary] = useState("");

  // ── Chat state ───────────────────────────────────────────────────────────────
  // message shape: { type: "party_a"|"party_b"|"mediator"|"system", text, name? }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState("");

  // ── Room controls ────────────────────────────────────────────────────────────
  // activeParties: ["a","b"] = joint, ["a"] = caucus with A, ["b"] = caucus with B
  const [activeParties, setActiveParties] = useState(["a", "b"]);

  // ── Debrief ──────────────────────────────────────────────────────────────────
  const [ending, setEnding] = useState(false);
  const [debrief, setDebrief] = useState(null);
  const [debriefError, setDebriefError] = useState("");

  // ── Voice ────────────────────────────────────────────────────────────────────
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState("");
  const recognitionRef = useRef(null);
  const speakingRef = useRef(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, debrief]);

  // Stop speech on unmount
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // ── Voice helpers ─────────────────────────────────────────────────────────────
  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    speakingRef.current = false;
  };

  // Speak an array of { text, pitch } entries one after another
  const speakSequential = (queue) => {
    if (!voiceEnabled || !window.speechSynthesis || !queue.length) return;
    stopSpeaking();
    let idx = 0;
    const next = () => {
      if (idx >= queue.length) { speakingRef.current = false; return; }
      const { text, pitch } = queue[idx++];
      const utt = new SpeechSynthesisUtterance(text);
      utt.pitch = pitch;
      utt.rate = 0.95;
      utt.onend = next;
      utt.onerror = next;
      speakingRef.current = true;
      window.speechSynthesis.speak(utt);
    };
    next();
  };

  const toggleMic = () => {
    if (!SpeechRecognitionAPI) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    setMicError("");
    const rec = new SpeechRecognitionAPI();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript || "";
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
      setIsListening(false);
    };
    rec.onerror = (e) => {
      setMicError(e.error === "not-allowed" ? "Mic access denied." : "Could not hear you.");
      setIsListening(false);
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  // Auto-start when arriving from a preset scenario via "Act as Mediator"
  useEffect(() => {
    if (incomingState.autoStart && !sessionId) {
      setIsStarting(true);
      startMediation(incomingState.disputeType || "Other", null, null, incomingState.disputeDetails || "")
        .then((data) => {
          setSessionId(data.session_id);
          setPartyA(data.party_a);
          setPartyB(data.party_b);
          setDisputeSummary(data.dispute_summary || "");
          setMessages([
            { type: "system", text: `Mediation session started: ${data.dispute_summary || incomingState.disputeType}` },
            { type: "party_a", text: data.party_a.opening, name: data.party_a.name },
            { type: "party_b", text: data.party_b.opening, name: data.party_b.name },
          ]);
          // Clear navigation state so refresh doesn't re-trigger
          window.history.replaceState({}, "");
        })
        .catch((e) => setSetupError(e.message || "Failed to start session."))
        .finally(() => setIsStarting(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleParty = (party) => {
    setActiveParties((prev) => {
      if (prev.includes(party)) {
        // Don't allow deselecting both
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== party);
      }
      return [...prev, party];
    });
  };

  const roomLabel = () => {
    if (activeParties.includes("a") && activeParties.includes("b")) return "Joint meeting";
    if (activeParties.includes("a")) return `Private caucus with ${partyA?.name || "Party A"}`;
    return `Private caucus with ${partyB?.name || "Party B"}`;
  };

  // ── Start session ─────────────────────────────────────────────────────────────
  const handleStart = async () => {
    setSetupError("");
    if (!formA.name.trim() || !formA.story.trim() || !formB.name.trim() || !formB.story.trim()) {
      setSetupError("Please fill in both parties' names and their side of the story.");
      return;
    }
    setIsStarting(true);
    try {
      const data = await startMediation(
        disputeType,
        { name: formA.name.trim(), role: formA.role.trim(), story: formA.story.trim() },
        { name: formB.name.trim(), role: formB.role.trim(), story: formB.story.trim() }
      );
      setSessionId(data.session_id);
      setPartyA(data.party_a);
      setPartyB(data.party_b);
      setDisputeSummary(data.dispute_summary || "");
      setMessages([
        { type: "system", text: `Mediation session started: ${data.dispute_summary || disputeType}` },
        { type: "party_a", text: data.party_a.opening, name: data.party_a.name },
        { type: "party_b", text: data.party_b.opening, name: data.party_b.name },
      ]);
    } catch (e) {
      setSetupError(e.message || "Failed to start session. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  // ── Send mediator message ─────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping || debrief) return;
    setInput("");
    setChatError("");
    setIsTyping(true);
    setMessages((prev) => [...prev, { type: "mediator", text }]);

    try {
      const data = await sendMediatorMessage(sessionId, text, activeParties);
      const newMsgs = [];
      if (data.party_a_reply) newMsgs.push({ type: "party_a", text: data.party_a_reply, name: partyA?.name });
      if (data.party_b_reply) newMsgs.push({ type: "party_b", text: data.party_b_reply, name: partyB?.name });
      if (newMsgs.length) {
        setMessages((prev) => [...prev, ...newMsgs]);
        // Speak replies sequentially: Party A (pitch 1.0) then Party B (pitch 1.2)
        const ttsQueue = [];
        if (data.party_a_reply) ttsQueue.push({ text: data.party_a_reply, pitch: 1.0 });
        if (data.party_b_reply) ttsQueue.push({ text: data.party_b_reply, pitch: 1.2 });
        speakSequential(ttsQueue);
      }
    } catch (e) {
      setChatError(e.message || "Something went wrong. Please try again.");
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── End session / debrief ─────────────────────────────────────────────────────
  const handleEnd = async () => {
    if (ending || debrief) return;
    setEnding(true);
    setDebriefError("");
    try {
      const data = await endMediation(sessionId);
      setDebrief(data.debrief);
    } catch (e) {
      setDebriefError(`Debrief failed: ${e.message}`);
    } finally {
      setEnding(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const reset = () => {
    setSessionId(null);
    setPartyA(null); setPartyB(null);
    setDisputeSummary("");
    setMessages([]);
    setInput("");
    setChatError("");
    setActiveParties(["a", "b"]);
    setDebrief(null); setDebriefError("");
    setEnding(false);
    setFormA({ name: "", role: "", story: "" });
    setFormB({ name: "", role: "", story: "" });
    setSetupError("");
  };

  // ── SETUP SCREEN ──────────────────────────────────────────────────────────────
  if (!sessionId) {
    // Loading state when auto-starting from a preset scenario
    if (isStarting) {
      return (
        <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", gap: 8, marginBottom: 16 }}>
              {[0, 0.15, 0.3].map((d, i) => (
                <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: "#5c6bc0", display: "inline-block", animation: "blink 1s infinite", animationDelay: `${d}s` }} />
              ))}
            </div>
            <p style={{ color: "#3f51b5", fontWeight: 500 }}>Preparing your mediation session…</p>
          </div>
        </div>
      );
    }

    return (
      <div className="page">
        <div className="pageHeader">
          <div>
            <h1>🤝 Mediator Mode</h1>
            <p className="subtle">Fill in both parties' details and step in as the mediator.</p>
          </div>
          <button
            className="send-btn"
            style={{ background: "white", color: "#3f51b5", border: "1px solid #3f51b5", alignSelf: "flex-start" }}
            onClick={() => navigate("/roleplay")}
          >
            ← Back to Role-Play
          </button>
        </div>

        {setupError && <div className="alert" style={{ marginTop: 16 }}>{setupError}</div>}

        <div className="card" style={{ maxWidth: 800, margin: "28px auto", padding: "28px 32px" }}>
          {/* Dispute type */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontWeight: 600, color: "#1a237e", marginBottom: 8 }}>
              Type of dispute
            </label>
            <select
              value={disputeType}
              onChange={(e) => setDisputeType(e.target.value)}
              style={{ ...INPUT_STYLE, cursor: "pointer" }}
            >
              {DISPUTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Two-party form */}
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 28 }}>
            <PartyForm label="Party 1" color="#3f51b5" value={formA} onChange={setFormA} />
            <div style={{ width: 1, background: "#e8eaf6", flexShrink: 0, alignSelf: "stretch" }} />
            <PartyForm label="Party 2" color="#e65100" value={formB} onChange={setFormB} />
          </div>

          {isStarting ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0f3ff", border: "1px solid #c5cae9", borderRadius: 10, padding: "12px 18px" }}>
              <div style={{ display: "inline-flex", gap: 5 }}>
                {[0, 0.15, 0.3].map((d, i) => (
                  <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#5c6bc0", display: "inline-block", animation: "blink 1s infinite", animationDelay: `${d}s` }} />
                ))}
              </div>
              <span style={{ color: "#3f51b5", fontSize: "0.92rem", fontWeight: 500 }}>
                Preparing your mediation session…
              </span>
            </div>
          ) : (
            <button
              className="send-btn"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleStart}
              disabled={!formA.name.trim() || !formA.story.trim() || !formB.name.trim() || !formB.story.trim()}
            >
              🤝 Start Mediation Session
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── CHAT SCREEN ───────────────────────────────────────────────────────────────
  const COLORS = { a: "#3f51b5", b: "#e65100" };

  return (
    <div className="chatpage">
      <div className="chatcard" style={{ maxWidth: 860 }}>

        {/* Header */}
        <header className="chat-header" style={{ flexWrap: "wrap", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>🤝 Mediating: {disputeType}</h3>
            {disputeSummary && <p className="muted-small">{disputeSummary}</p>}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              className="send-btn"
              style={{ background: "white", color: "#3f51b5", border: "1px solid #3f51b5" }}
              onClick={reset}
            >
              ← New Session
            </button>
            {!debrief && (
              <button
                className="send-btn"
                style={{ background: "#fff3e0", color: "#e65100", border: "1px solid #e65100" }}
                onClick={handleEnd}
                disabled={ending}
              >
                {ending ? "⏳ Ending…" : "🏁 End Session"}
              </button>
            )}
          </div>
        </header>

        {/* Party info bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "stretch",
          padding: "12px 16px", background: "#f5f5ff",
          borderBottom: "1px solid #e8eaf6", gap: 12,
        }}>
          {/* Party A */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <PartyAvatar name={partyA?.name} color={COLORS.a} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, color: COLORS.a, fontSize: "0.95rem" }}>{partyA?.name}</p>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#666" }}>{partyA?.role}</p>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#888", fontStyle: "italic" }}>{partyA?.emotional_state}</p>
            </div>
          </div>

          {/* Center divider */}
          <div style={{ display: "flex", alignItems: "center", color: "#bbb", fontSize: "1.2rem", flexShrink: 0 }}>⚖️</div>

          {/* Party B */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, justifyContent: "flex-end", textAlign: "right" }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, color: COLORS.b, fontSize: "0.95rem" }}>{partyB?.name}</p>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#666" }}>{partyB?.role}</p>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#888", fontStyle: "italic" }}>{partyB?.emotional_state}</p>
            </div>
            <PartyAvatar name={partyB?.name} color={COLORS.b} />
          </div>
        </div>

        {/* Room controls */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 16px", background: "#fafafa",
          borderBottom: "1px solid #eee", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.78rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            In room:
          </span>
          {["a", "b"].map((p) => {
            const party = p === "a" ? partyA : partyB;
            const color = COLORS[p];
            const active = activeParties.includes(p);
            return (
              <button
                key={p}
                onClick={() => toggleParty(p)}
                title={active ? `Remove ${party?.name} from room` : `Bring ${party?.name} back into room`}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 20,
                  border: `1.5px solid ${color}`,
                  background: active ? color : "white",
                  color: active ? "white" : color,
                  cursor: "pointer", fontSize: "0.83rem", fontWeight: 600,
                  transition: "all 0.15s",
                }}
              >
                {active ? "✓" : "+"} {party?.name}
              </button>
            );
          })}
          <span style={{
            marginLeft: "auto", fontSize: "0.8rem",
            color: activeParties.length === 2 ? "#3f51b5" : "#e65100",
            fontWeight: 500, fontStyle: "italic",
          }}>
            {roomLabel()}
          </span>
        </div>

        {/* Messages */}
        <div className="chat-window">
          <div className="messages" role="log" aria-live="polite" aria-label="Mediation session messages">
            {messages.map((m, i) => {
              if (m.type === "system") {
                return (
                  <div key={i} style={{ textAlign: "center", padding: "8px 16px" }}>
                    <span style={{ fontSize: "0.78rem", color: "#999", background: "#f5f5f5", padding: "4px 12px", borderRadius: 12 }}>
                      {m.text}
                    </span>
                  </div>
                );
              }

              if (m.type === "mediator") {
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "center", padding: "4px 16px" }}>
                    <div style={{
                      background: "#e8eaf6", borderRadius: 12, padding: "10px 16px",
                      maxWidth: "60%", textAlign: "center",
                    }}>
                      <p style={{ margin: "0 0 4px", fontSize: "0.72rem", color: "#7986cb", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        You (Mediator)
                      </p>
                      <p style={{ margin: 0, fontSize: "0.93rem", color: "#333", lineHeight: 1.5 }}>{m.text}</p>
                    </div>
                  </div>
                );
              }

              const isA = m.type === "party_a";
              const color = isA ? COLORS.a : COLORS.b;
              const name = m.name || (isA ? "Party A" : "Party B");

              return (
                <div key={i} className={`bubble-row ${isA ? "bubble-row-bot" : "bubble-row-user"}`} style={{ alignItems: "flex-start" }}>
                  {isA && <PartyAvatar name={name} color={color} />}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: isA ? "flex-start" : "flex-end" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "0.75rem", fontWeight: 600, color, paddingLeft: isA ? 2 : 0, paddingRight: isA ? 0 : 2 }}>
                      {name}
                    </p>
                    <div style={{
                      background: isA ? "#e8eaf6" : "#fff3e0",
                      borderRadius: 12, padding: "10px 14px",
                      maxWidth: 380,
                      border: `1px solid ${isA ? "#c5cae9" : "#ffe0b2"}`,
                    }}>
                      <p style={{ margin: 0, fontSize: "0.93rem", color: "#333", lineHeight: 1.55 }}>{m.text}</p>
                    </div>
                  </div>
                  {!isA && <PartyAvatar name={name} color={color} />}
                </div>
              );
            })}

            {isTyping && (
              <div style={{ display: "flex", justifyContent: "center", padding: "8px 16px" }}>
                <div style={{ background: "#f5f5f5", borderRadius: 12, padding: "10px 18px", display: "flex", gap: 5 }}>
                  {[0, 0.15, 0.3].map((d, i) => (
                    <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#9fa8da", display: "inline-block", animation: "blink 1s infinite", animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            )}

            {chatError && (
              <div className="alert" style={{ margin: "8px 16px" }}>{chatError}</div>
            )}

            {(debrief || debriefError || ending) && (
              <div style={{ padding: "0 8px" }}>
                {ending && !debrief && (
                  <p style={{ textAlign: "center", color: "#888", fontSize: "0.9rem" }}>⏳ Generating your debrief…</p>
                )}
                {debrief && <DebriefCard debrief={debrief} onReset={reset} />}
                {debriefError && <div className="alert">{debriefError}</div>}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <footer className="chat-input-area" style={{ flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
            <textarea
              value={input}
              ref={inputRef}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={debrief ? "Session has ended." : `Type as mediator — speaking to ${roomLabel().toLowerCase()}…`}
              rows={1}
              className="chat-input"
              disabled={!!debrief}
              aria-label="Type your mediator message"
              style={{ flex: 1, resize: "none", height: 42 }}
            />

            {SpeechRecognitionAPI && (
              <button
                onClick={toggleMic}
                disabled={!!debrief}
                aria-label={isListening ? "Stop recording" : "Speak your message"}
                aria-pressed={isListening}
                title={isListening ? "Stop listening" : "Speak your message"}
                style={{
                  height: 42, width: 42, borderRadius: 8, flexShrink: 0,
                  border: `1px solid ${isListening ? "#f44336" : "#c5cae9"}`,
                  background: isListening ? "#f44336" : "white",
                  color: isListening ? "white" : "#555",
                  cursor: "pointer", fontSize: "1rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {isListening ? "⏹" : "🎤"}
              </button>
            )}

            <button
              className="send-btn"
              onClick={handleSend}
              disabled={isTyping || !!debrief}
              aria-label="Send message"
              style={{ height: 42, flexShrink: 0 }}
            >
              Send ➤
            </button>

            <button
              onClick={() => { const next = !voiceEnabled; setVoiceEnabled(next); if (!next) stopSpeaking(); }}
              title={voiceEnabled ? "Mute party voices" : "Unmute party voices"}
              aria-label={voiceEnabled ? "Mute party voices" : "Unmute party voices"}
              aria-pressed={voiceEnabled}
              style={{
                height: 42, width: 42, borderRadius: 8, flexShrink: 0,
                border: `1px solid ${voiceEnabled ? "#3f51b5" : "#c5cae9"}`,
                background: voiceEnabled ? "#3f51b5" : "white",
                color: voiceEnabled ? "white" : "#aaa",
                cursor: "pointer", fontSize: "1rem",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {voiceEnabled ? "🔊" : "🔇"}
            </button>
          </div>

          {(isListening || micError) && (
            <div style={{ fontSize: "0.78rem", paddingLeft: 2 }}>
              {isListening ? (
                <span style={{ color: "#f44336", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f44336", display: "inline-block", animation: "pulse 1s infinite" }} />
                  Listening…
                </span>
              ) : (
                <span style={{ color: "#c62828" }}>⚠️ {micError}</span>
              )}
            </div>
          )}
        </footer>

      </div>
    </div>
  );
}
