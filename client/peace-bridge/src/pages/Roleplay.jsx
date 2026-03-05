import { useState, useEffect, useRef } from "react";
import { getScenarios, startRoleplay, sendRoleplay, endRoleplay } from "../utils/roleplayAPI";

const DIFFICULTY_COLOR = {
  beginner: "#4caf50",
  intermediate: "#ff9800",
  advanced: "#f44336",
};


const SCORE_COLOR = (v) => {
  if (v >= 4) return "#4caf50";
  if (v >= 3) return "#ff9800";
  return "#f44336";
};

const DIRECTION_ICON = { improving: "↑", stable: "→", declining: "↓" };
const DIRECTION_COLOR = { improving: "#4caf50", stable: "#888", declining: "#f44336" };

function ScoreBar({ score }) {
  const [expanded, setExpanded] = useState(false);
  if (!score?.scores) return null;

  const dims = [
    { key: "empathy", label: "Empathy" },
    { key: "clarity", label: "Clarity" },
    { key: "assertiveness", label: "Assertiveness" },
    { key: "de_escalation", label: "De-escalation" },
  ];

  const dir = score.direction || "stable";

  return (
    <div style={{ marginTop: 6, maxWidth: 400 }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          fontSize: "0.8rem",
          color: "#555",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ color: DIRECTION_COLOR[dir], fontWeight: 600 }}>
          {DIRECTION_ICON[dir]} {dir}
        </span>
        <span style={{ color: "#aaa" }}>·</span>
        <span style={{ color: "#3f51b5" }}>Conflict score</span>
        <span style={{ color: "#aaa", transform: expanded ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>›</span>
      </button>

      {expanded && (
        <div
          style={{
            marginTop: 6,
            padding: "8px 12px",
            background: "#f9f9f9",
            borderRadius: 8,
            fontSize: "0.8rem",
          }}
        >
          {dims.map(({ key, label }) => {
            const val = score.scores[key] || 1;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ width: 100, color: "#555", flexShrink: 0 }}>{label}</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: n <= val ? SCORE_COLOR(val) : "#e0e0e0",
                      }}
                    />
                  ))}
                </div>
                <span style={{ color: SCORE_COLOR(val), fontWeight: 600 }}>{val}/5</span>
              </div>
            );
          })}
          {score.note && (
            <p style={{ margin: "8px 0 0", color: "#666", fontStyle: "italic", lineHeight: 1.4 }}>
              {score.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Roleplay() {
  const [scenarios, setScenarios] = useState([]);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [scenarioError, setScenarioError] = useState("");

  const [selectedScenario, setSelectedScenario] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [startError, setStartError] = useState("");

  // crisis
  const [crisis, setCrisis] = useState(false);
  const [crisisMessage, setCrisisMessage] = useState("");

  // debrief
  const [ending, setEnding] = useState(false);
  const [debrief, setDebrief] = useState(null);
  const [debriefError, setDebriefError] = useState("");

  const bottomRef = useRef(null);

  useEffect(() => {
    const DIFFICULTY_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };
    getScenarios()
      .then((data) => setScenarios(data.sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 9) - (DIFFICULTY_ORDER[b.difficulty] ?? 9))))
      .catch((e) => setScenarioError(e.message))
      .finally(() => setLoadingScenarios(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, debrief]);

  const pickScenario = async (scenario) => {
    setStartError("");
    setSelectedScenario(scenario);
    setMessages([]);
    setInput("");
    setCrisis(false);
    setDebrief(null);
    try {
      const data = await startRoleplay(scenario.id);
      setSessionId(data.session_id);
      setMessages([{ sender: "bot", text: data.reply }]);
    } catch (e) {
      setStartError(e.message || "Failed to start the scenario. Please try again.");
      setSelectedScenario(null);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isTyping || crisis || debrief) return;
    setInput("");
    setIsTyping(true);
    setMessages((prev) => [...prev, { sender: "user", text }]);
    try {
      const data = await sendRoleplay(text, sessionId);

      if (data.crisis) {
        setCrisis(true);
        setCrisisMessage(data.crisis_message);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.reply, coaching: data.coaching || null, score: data.score || null },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Something went wrong — please try again." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEnd = async (sid = sessionId) => {
    if (ending || debrief) return;
    setEnding(true);
    setDebriefError("");
    try {
      const data = await endRoleplay(sid);
      setDebrief(data.debrief);
    } catch (e) {
      setDebriefError(`Debrief failed: ${e.message}`);
    } finally {
      setEnding(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    setSelectedScenario(null);
    setSessionId(null);
    setMessages([]);
    setInput("");
    setStartError("");
    setCrisis(false);
    setCrisisMessage("");
    setDebrief(null);
    setDebriefError("");
    setEnding(false);
  };

  // ── Scenario picker ──────────────────────────────────────────────────────────
  if (!selectedScenario) {
    return (
      <div className="page">
        <div className="pageHeader">
          <div>
            <h1>Role-Play Practice</h1>
            <p className="subtle">Practice conflict resolution skills in a safe, guided environment.</p>
          </div>
        </div>

        {startError && <div className="alert">{startError}</div>}

        {loadingScenarios ? (
          <p className="subtle" style={{ marginTop: 24 }}>Loading scenarios…</p>
        ) : scenarioError ? (
          <div className="alert">{scenarioError}</div>
        ) : scenarios.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40, marginTop: 24 }}>
            <p className="subtle">No scenarios available yet.</p>
            <p className="subtle" style={{ fontSize: "0.9rem", marginTop: 8 }}>
              Add rows to the <code>scenarios</code> table in Supabase to get started.
            </p>
          </div>
        ) : (
          <div className="cardList" style={{ marginTop: 24 }}>
            {scenarios.map((s) => (
              <button
                key={s.id}
                className="card"
                style={{ cursor: "pointer", textAlign: "left", border: "none", width: "100%", background: "white" }}
                onClick={() => pickScenario(s)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <h3 style={{ margin: 0, color: "#1a237e" }}>{s.title}</h3>
                  {s.difficulty && (
                    <span
                      className="tag"
                      style={{
                        background: DIFFICULTY_COLOR[s.difficulty] + "22",
                        color: DIFFICULTY_COLOR[s.difficulty],
                        flexShrink: 0,
                      }}
                    >
                      {s.difficulty}
                    </span>
                  )}
                </div>
                <p className="subtle" style={{ marginTop: 10, fontSize: "0.95rem" }}>{s.context}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Chat view ────────────────────────────────────────────────────────────────
  return (
    <div className="chatpage">
      <div className="chatcard">
        <header className="chat-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>🎭 {selectedScenario.title}</h3>
            <p className="muted-small">{selectedScenario.context}</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="send-btn"
                style={{ background: "white", color: "#3f51b5", border: "1px solid #3f51b5" }}
                onClick={reset}
              >
                ← Scenarios
              </button>
              {!debrief && !crisis && (
                <button
                  className="send-btn"
                  style={{ background: "#fff3e0", color: "#e65100", border: "1px solid #e65100" }}
                  onClick={() => handleEnd()}
                  disabled={ending}
                >
                  {ending ? "Ending…" : "End Session"}
                </button>
              )}
            </div>

          </div>
        </header>

        <div className="chat-window">
          <div className="messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`bubble-row ${m.sender === "user" ? "bubble-row-user" : "bubble-row-bot"}`}
              >
                {m.sender === "bot" && <div className="avatar bot-avatar">🎭</div>}
                <div style={{ display: "flex", flexDirection: "column", alignItems: m.sender === "user" ? "flex-end" : "flex-start" }}>
                  <div className={`bubble ${m.sender === "user" ? "bubble-user" : "bubble-bot"}`}>
                    <div className="bubble-text">
                      {m.text.split("\n").map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                  {m.sender === "bot" && m.score && (
                    <ScoreBar score={m.score} />
                  )}
                </div>
                {m.sender === "user" && <div className="avatar user-avatar">🙂</div>}
              </div>
            ))}

            {isTyping && (
              <div className="bubble-row bubble-row-bot">
                <div className="avatar bot-avatar">🎭</div>
                <div className="bubble bubble-bot typing">
                  <div className="dots">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            {crisis && (
              <div
                style={{
                  margin: "16px 0",
                  padding: "16px 20px",
                  background: "#fff3e0",
                  border: "1px solid #ffb74d",
                  borderRadius: 10,
                  color: "#bf360c",
                  lineHeight: 1.6,
                }}
              >
                <strong>Session paused.</strong>
                <p style={{ margin: "8px 0 0" }}>{crisisMessage}</p>
              </div>
            )}

            {(debrief || debriefError || ending) && (
              <div
                style={{
                  margin: "20px 0",
                  padding: "20px 24px",
                  background: "#e8f5e9",
                  border: "1px solid #81c784",
                  borderRadius: 10,
                  color: "#1b5e20",
                  lineHeight: 1.7,
                }}
              >
                <strong style={{ fontSize: "1rem" }}>Session Debrief</strong>
                {ending && !debrief && (
                  <p style={{ margin: "10px 0 0", color: "#555" }}>Generating your feedback…</p>
                )}
                {debrief && (
                  <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap" }}>{debrief}</p>
                )}
                {debriefError && (
                  <p style={{ margin: "10px 0 0", color: "#b71c1c" }}>{debriefError}</p>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <footer className="chat-input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={crisis || debrief ? "Session has ended." : "Respond to the scenario…"}
            rows={1}
            className="chat-input"
            disabled={!!crisis || !!debrief}
          />
          <button
            className="send-btn"
            onClick={send}
            disabled={isTyping || !!crisis || !!debrief}
          >
            Send
          </button>
        </footer>
      </div>
    </div>
  );
}
