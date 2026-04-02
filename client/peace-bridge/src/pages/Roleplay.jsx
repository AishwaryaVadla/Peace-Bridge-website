import { useState, useEffect, useRef } from "react";
import { getScenarios, startRoleplay, sendRoleplay, endRoleplay } from "../utils/roleplayAPI";

// ── Voice helpers ─────────────────────────────────────────────────────────────
const SpeechRecognitionAPI =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "en-US";
  utt.rate = 1;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

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
  const [pendingScenario, setPendingScenario] = useState(null); // setup screen
  const [customContext, setCustomContext] = useState("");
  const [activeDifficulty, setActiveDifficulty] = useState(null);
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

  const [isStarting, setIsStarting] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState("");
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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

  const CONTEXT_PLACEHOLDER = {
    Workplace: `e.g. "My manager called me out in front of the whole team during yesterday's standup for missing a deadline, but I was never given the full requirements…"`,
    Neighbors: `e.g. "My upstairs neighbor has been moving furniture and playing music past midnight for the past two weeks and it's affecting my sleep…"`,
    Family: `e.g. "Every Thanksgiving my sister insists we go to her in-laws even though we've never once celebrated at our parents' house…"`,
    Business: `e.g. "I paid for a premium service package and three weeks later nothing has been delivered, and my calls keep getting ignored…"`,
    Education: `e.g. "My daughter came home upset after her teacher told her in front of the class that her essay was 'below the standard expected'…"`,
    Sport: `e.g. "I've been training six days a week all season but I'm still being benched while players who joined later are getting more court time…"`,
    "High-Tech": `e.g. "My co-founder wants to ship next week even though we haven't done any QA and I've flagged three critical bugs in the auth flow…"`,
    Elderly: `e.g. "My brother thinks our dad is fine living alone but last week he forgot to take his medication for three days and didn't tell anyone…"`,
    Couple: `e.g. "We keep arguing about finances — I feel like I'm always the one tracking the budget while my partner makes purchases without discussing them…"`,
    "Tenant-Landlord": `e.g. "My landlord has been ignoring my messages about a broken heater for a month and winter is starting…"`,
    Community: `e.g. "The neighborhood association voted to change the park hours without consulting residents who actually use it in the evenings…"`,
    Defamation: `e.g. "A former colleague has been telling people at industry events that I was let go for misconduct, which is completely untrue…"`,
    Intergenerational: `e.g. "My parents keep making major decisions about the family business without including me, even though I've been working there for five years…"`,
    Geopolitical: `e.g. "My neighbor and I used to be close, but since the war started back home they've been hostile toward me — I've done nothing to them personally but I feel their anger every day…"`,
    Religious: `e.g. "I've worked here for three years and my performance reviews have always been strong, but since I started wearing my hijab and taking prayer breaks I've been left out of meetings and skipped for a promotion…"`,
    Racial: `e.g. "I was sitting in the common area reading when security approached me, asked for my ID, and followed me for ten minutes — none of my white neighbors have ever been treated this way…"`,
  };

  const getPlaceholder = (scenario) =>
    CONTEXT_PLACEHOLDER[scenario?.category] ||
    `e.g. "Describe your specific situation here — the AI character will tailor the conversation to your context…"`;

  // Step 1: click card → show setup screen
  const pickScenario = (scenario) => {
    setStartError("");
    setCustomContext("");
    setPendingScenario(scenario);
  };

  // Step 2: confirm on setup screen → actually start
  const confirmStart = async () => {
    const scenario = pendingScenario;
    setStartError("");
    setIsStarting(true);
    setMessages([]);
    setInput("");
    setCrisis(false);
    setDebrief(null);
    try {
      const data = await startRoleplay(scenario.id, customContext.trim());
      setSessionId(data.session_id);
      setMessages([{ sender: "bot", text: data.reply }]);
      setSelectedScenario(scenario);
      setPendingScenario(null);
    } catch (e) {
      setStartError(e.message || "Failed to start the scenario. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const toggleMic = () => {
    if (!SpeechRecognitionAPI) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognitionAPI();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let newText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) newText += e.results[i][0].transcript + " ";
      }
      if (newText) setInput((prev) => (prev ? prev + newText : newText));
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = (e) => {
      setIsListening(false);
      if (e.error === "not-allowed") setMicError("Microphone access was blocked. Please allow mic access in your browser and try again.");
    };
    recognitionRef.current = rec;
    rec.start();
    setMicError("");
    setIsListening(true);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isTyping || crisis || debrief) return;
    stopSpeaking();
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

      const botText = data.reply;
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: botText, coaching: data.coaching || null, score: data.score || null },
      ]);
      if (voiceEnabled && botText) speak(botText);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Something went wrong — please try again." },
      ]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
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
    setPendingScenario(null);
    setCustomContext("");
    setActiveDifficulty(null);
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

  // ── Setup screen (between picker and chat) ───────────────────────────────────
  if (pendingScenario) {
    return (
      <div className="page">
        <div className="pageHeader">
          <div>
            <h1>🎭 {pendingScenario.title}</h1>
            <p className="subtle">Set up your scenario before starting.</p>
          </div>
        </div>

        {startError && <div className="alert">{startError}</div>}

        <div className="card" style={{ maxWidth: 640, margin: "24px auto", padding: "28px 32px" }}>
          {/* Scenario default context */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: "#1a237e" }}>Default scenario</span>
              {pendingScenario.difficulty && (
                <span
                  className="tag"
                  style={{
                    background: DIFFICULTY_COLOR[pendingScenario.difficulty] + "22",
                    color: DIFFICULTY_COLOR[pendingScenario.difficulty],
                  }}
                >
                  {pendingScenario.difficulty}
                </span>
              )}
            </div>
            <p className="subtle" style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.6 }}>
              {pendingScenario.context}
            </p>
          </div>

          {/* Custom context input */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontWeight: 600, color: "#333", marginBottom: 8 }}>
              Your specific situation <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span>
            </label>
            <p className="subtle" style={{ margin: "0 0 10px", fontSize: "0.88rem" }}>
              Describe your real or custom scenario. The AI character will respond to your specific context instead of the default setup.
            </p>
            <textarea
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder={getPlaceholder(pendingScenario)}
              rows={4}
              className="chat-input"
              style={{ width: "100%", resize: "vertical", fontSize: "0.95rem" }}
            />
          </div>

          {isStarting ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#f0f3ff",
                border: "1px solid #c5cae9",
                borderRadius: 10,
                padding: "10px 18px",
              }}>
                <div className="dots" style={{ display: "inline-flex", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5c6bc0", display: "inline-block", animation: "blink 1s infinite" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5c6bc0", display: "inline-block", animation: "blink 1s infinite", animationDelay: "0.15s" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5c6bc0", display: "inline-block", animation: "blink 1s infinite", animationDelay: "0.3s" }} />
                </div>
                <span style={{ color: "#3f51b5", fontSize: "0.92rem", fontWeight: 500 }}>
                  {customContext.trim() ? "Tailoring scenario to your context…" : "Preparing scenario…"}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                className="send-btn"
                style={{ background: "white", color: "#3f51b5", border: "1px solid #3f51b5" }}
                onClick={() => { setPendingScenario(null); setStartError(""); }}
              >
                ← Back
              </button>
              <button className="send-btn" onClick={confirmStart}>
                {customContext.trim() ? "Start with my context" : "Start with default context"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Scenario picker ──────────────────────────────────────────────────────────
  if (!selectedScenario) {
    const DIFFICULTIES = ["All", "beginner", "intermediate", "advanced"];

    const filtered = scenarios.filter((s) =>
      !activeDifficulty || activeDifficulty === "All" ? true : s.difficulty === activeDifficulty
    );

    return (
      <div className="page">
        <div className="pageHeader">
          <div>
            <h1>Role-Play Practice</h1>
            <p className="subtle">Practice conflict resolution skills in a safe, guided environment.</p>
          </div>
        </div>

        {/* Difficulty filter */}
        <div style={{ marginTop: 24 }}>
          <p style={{ margin: "0 0 10px", color: "#666", fontSize: "0.88rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Filter by difficulty
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DIFFICULTIES.map((d) => {
              const isActive = d === "All" ? !activeDifficulty : activeDifficulty === d;
              const color = d === "All" ? "#1a237e" : DIFFICULTY_COLOR[d] || "#1a237e";
              return (
                <button
                  key={d}
                  onClick={() => setActiveDifficulty(d === "All" ? null : d)}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 20,
                    border: `1px solid ${color}`,
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? color : "white",
                    color: isActive ? "white" : color,
                    transition: "all 0.15s",
                    textTransform: d === "All" ? "none" : "capitalize",
                  }}
                >
                  {d === "All" ? "All scenarios" : d}
                </button>
              );
            })}
          </div>
        </div>

        {startError && <div className="alert" style={{ marginTop: 16 }}>{startError}</div>}

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
          <>
            {/* Scenario cards */}
            {filtered.length === 0 && (
              <p className="subtle" style={{ marginTop: 24, textAlign: "center" }}>
                No scenarios found for this filter.
              </p>
            )}
            <div className="cardList" style={{ marginTop: 16 }}>
              {filtered.map((s) => (
                <button
                  key={s.id}
                  className="card"
                  style={{ cursor: "pointer", textAlign: "left", border: "none", width: "100%", background: "white" }}
                  onClick={() => pickScenario(s)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, color: "#1a237e" }}>{s.title}</h3>
                      {s.category && (
                        <span className="tag" style={{ background: "#e8eaf6", color: "#3f51b5" }}>{s.category}</span>
                      )}
                    </div>
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
                  <p className="subtle" style={{ marginTop: 8, fontSize: "0.95rem" }}>{s.context}</p>
                  {s.learning_goal && (
                    <p style={{ marginTop: 6, fontSize: "0.85rem", color: "#5c6bc0" }}>
                      🎯 {s.learning_goal}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </>
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
          <div className="messages" role="log" aria-live="polite" aria-label="Roleplay conversation messages">
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

        <footer className="chat-input-area" style={{ flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "flex-end" }}>
            <textarea
              value={input}
              ref={inputRef}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={crisis || debrief ? "Session has ended." : "Respond to the scenario…"}
              rows={1}
              className="chat-input"
              disabled={!!crisis || !!debrief}
              aria-label="Type your response to the scenario"
            />
            {SpeechRecognitionAPI && (
              <button
                onClick={toggleMic}
                disabled={!!crisis || !!debrief}
                aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
                aria-pressed={isListening}
                title={isListening ? "Stop listening" : "Speak your response"}
                style={{
                  padding: "0 12px",
                  height: 40,
                  borderRadius: 8,
                  border: `1px solid ${isListening ? "#f44336" : "#3f51b5"}`,
                  background: isListening ? "#f44336" : "white",
                  color: isListening ? "white" : "#3f51b5",
                  cursor: "pointer",
                  fontSize: isListening ? "0.78rem" : "1.1rem",
                  fontWeight: 600,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap",
                }}
              >
                {isListening ? <>⏹ Stop</> : <>🎤</>}
              </button>
            )}
            <button
              className="send-btn"
              onClick={send}
              disabled={isTyping || !!crisis || !!debrief}
              aria-label="Send response"
            >
              Send
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            {isListening ? (
              <span style={{ fontSize: "0.8rem", color: "#f44336", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f44336", display: "inline-block", animation: "pulse 1s infinite" }} />
                Listening…
              </span>
            ) : micError ? (
              <span style={{ fontSize: "0.8rem", color: "#c62828" }}>⚠️ {micError}</span>
            ) : (
              <span />
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#666", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => {
                  setVoiceEnabled(e.target.checked);
                  if (!e.target.checked) stopSpeaking();
                }}
                style={{ accentColor: "#3f51b5" }}
              />
              🔊 Voice replies
            </label>
          </div>
        </footer>
      </div>
    </div>
  );
}
