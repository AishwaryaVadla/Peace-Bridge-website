import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../components/Chatbot.css";
import { detectEmotion } from "../utils/ruleEngine";
import { sendChat, sendSessionSummary } from "../utils/chatbotAPI";


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

// ── Crisis detection (mirrors backend) ────────────────────────────────────
const CRISIS_PATTERN =
  /suicid|kill myself|end my life|end it all|can't go on|hurt myself|harm myself|self.harm|want to die|wanna die|don't want to (be here|live|exist)|no reason to live|better off (without me|dead|gone)|can't take it anymore|can't handle (this|it|life) anymore|nothing to live for|thinking about (ending|hurting)|make it stop (forever|permanently)|disappear forever|hopeless and alone|nobody (cares|would miss me)/i;

function isCrisis(text) {
  return CRISIS_PATTERN.test(text);
}

function CrisisCard() {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: "#fff8f0",
        border: "2px solid #e53935",
        borderRadius: 12,
        padding: "18px 20px",
        margin: "10px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: "1.3rem" }}>🚨</span>
        <strong style={{ color: "#b71c1c", fontSize: "1rem" }}>You don't have to face this alone</strong>
      </div>
      <p style={{ color: "#5d3a3a", fontSize: "0.92rem", margin: "0 0 14px", lineHeight: 1.6 }}>
        It sounds like you're going through something really painful right now. Please reach out to a crisis counselor — they're available 24/7 and are there to listen without judgment.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <a
          href="https://988lifeline.org"
          target="_blank"
          rel="noreferrer"
          style={{
            background: "#e53935",
            color: "white",
            borderRadius: 8,
            padding: "9px 14px",
            fontWeight: 700,
            fontSize: "0.92rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          📞 Call or text 988 — Suicide & Crisis Lifeline (US)
        </a>
        <a
          href="https://www.crisistextline.org"
          target="_blank"
          rel="noreferrer"
          style={{
            background: "#f5f5f5",
            color: "#333",
            borderRadius: 8,
            padding: "9px 14px",
            fontSize: "0.9rem",
            textDecoration: "none",
            border: "1px solid #ddd",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          💬 Text HOME to 741741 — Crisis Text Line
        </a>
        <a
          href="https://www.iasp.info/resources/Crisis_Centres/"
          target="_blank"
          rel="noreferrer"
          style={{
            color: "#555",
            fontSize: "0.85rem",
            textDecoration: "underline",
          }}
        >
          🌍 International crisis centre directory
        </a>
      </div>
    </div>
  );
}

function PhrasingSuggestions({ suggestions, onSelect }) {
  const [open, setOpen] = useState(false);
  if (!suggestions?.length) return null;
  return (
    <div className="phrasing-box">
      <button className="phrasing-toggle" onClick={() => setOpen((v) => !v)}>
        💬 Try rephrasing <span className="phrasing-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul className="phrasing-list">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                className="phrasing-item-btn"
                onClick={() => onSelect(s)}
                title="Click to use this phrasing"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const greetings = [
  "Hi, I'm Peace Bridge. What's going on for you today?",
  "Hey there — what's on your mind right now?",
  "I'm here with you. What's happening today?",
  "Welcome back. What would you like to talk about?",
];

const getGreeting = () => greetings[Math.floor(Math.random() * greetings.length)];

export default function Chatbot() {
  const [messages, setMessages] = useState(() => [
    { sender: "bot", text: getGreeting(), meta: {} },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [slowResponse, setSlowResponse] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState("");
  const inFlightRef = useRef(null);
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const location = useLocation();
  const CHAT_PERSIST_KEY = "pb_chat_session";

  // If arriving from Learning Hub "Practice" button, seed the first bot message
  useEffect(() => {
    const { practiceSkill, practicePrompt } = location.state || {};
    if (practiceSkill && practicePrompt) {
      sessionStorage.removeItem(CHAT_PERSIST_KEY);
      setMessages([
        {
          sender: "bot",
          text: `🎯 Practicing: **${practiceSkill}**\n\n${practicePrompt}`,
          meta: {},
        },
      ]);
      // Clear state so refreshing doesn't re-trigger
      window.history.replaceState({}, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore conversation if user navigated away (e.g. to mindfulness) and came back
  useEffect(() => {
    const saved = sessionStorage.getItem(CHAT_PERSIST_KEY);
    if (saved) {
      try {
        const { messages: savedMsgs, sessionId: savedSid } = JSON.parse(saved);
        if (Array.isArray(savedMsgs) && savedMsgs.length > 1) {
          setMessages(savedMsgs);
          if (savedSid) setSessionId(savedSid);
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist conversation on every message update so navigating away doesn't lose it
  useEffect(() => {
    if (messages.length > 1) {
      sessionStorage.setItem(CHAT_PERSIST_KEY, JSON.stringify({ messages, sessionId }));
    }
  }, [messages, sessionId]);

  const resetChat = () => {
    stopSpeaking();
    sessionStorage.removeItem(CHAT_PERSIST_KEY);
    setMessages([{ sender: "bot", text: getGreeting(), meta: {} }]);
    setInput("");
    setSummary("");
    setSummaryError("");
    setSessionId(null);
  };

  useEffect(() => {
    if (messages.length > 1 || isTyping) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

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
    if (isSending) return;
    const text = input.trim();
    if (!text) return;

    stopSpeaking();
    const reqId = Date.now();
    const userMsgId = `user_${reqId}`;
    const userMsg = { id: userMsgId, sender: "user", text, meta: {}, phrasing: [] };
    inFlightRef.current = reqId;

    setInput("");
    setIsSending(true);

    // Show crisis card immediately — don't wait for the API
    if (isCrisis(text)) {
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: `crisis_${reqId}`, sender: "crisis", text: "", meta: {} },
      ]);
      setIsSending(false);
      return;
    }

    setIsTyping(true);
    setSlowResponse(false);
    setMessages((prev) => [...prev, userMsg]);

    const slowTimer = setTimeout(() => setSlowResponse(true), 10000);

    try {
      const { text: assistantText, data } = await sendChat(text, sessionId);

      const isCurrent = inFlightRef.current === reqId;

      let bubbleText = assistantText;
      if (data.next_steps?.length) {
        bubbleText += "\n\nNext steps:\n" + data.next_steps.map((s) => `• ${s}`).join("\n");
      }
      if (data.one_question) {
        bubbleText += `\n\n${data.one_question}`;
      }

      const heuristic = detectEmotion(text);
      const backendEmotion = data.primary_emotion;
      const primaryEmotion =
        backendEmotion && backendEmotion !== "unknown"
          ? backendEmotion
          : heuristic && heuristic !== "NEUTRAL"
          ? heuristic
          : null;

      const secondaryEmotions =
        Array.isArray(data.secondary_emotions) && data.secondary_emotions.length
          ? data.secondary_emotions
          : primaryEmotion
          ? [primaryEmotion.toLowerCase()]
          : [];

      const botMsg = {
        sender: "bot",
        text: bubbleText || "Sorry—no response text.",
        meta: {
          primary_emotion: primaryEmotion,
          secondary_emotions: secondaryEmotions,
          intensity: data.intensity || "medium",
          safety_level: data.safety_level || "normal",
          debug_mode: data.debug_mode,
        },
        suggestGrounding: !!data.suggest_mindfulness,
      };

      if (isCurrent) {
        if (data.phrasing_suggestions?.length) {
          setMessages((p) =>
            p.map((m) => (m.id === userMsgId ? { ...m, phrasing: data.phrasing_suggestions } : m))
          );
        }
        setMessages((p) => [...p, botMsg]);
        if (voiceEnabled && bubbleText) speak(bubbleText);
        if (data.session_id && data.session_id !== sessionId) {
          setSessionId(data.session_id);
        }
      }
    } catch (e) {
      console.error(e);
      if (inFlightRef.current === reqId) {
        setMessages((p) => [
          ...p,
          { sender: "bot", text: "Sorry, I had trouble responding just now. Could you try again?", meta: {} },
        ]);
      }
    } finally {
      clearTimeout(slowTimer);
      if (inFlightRef.current === reqId) {
        setIsTyping(false);
        setSlowResponse(false);
        setIsSending(false);
        inFlightRef.current = null;
        inputRef.current?.focus();
      }
    }
  };

  const summarize = async () => {
    if (isSummarizing) return;
    setSummaryError("");
    setIsSummarizing(true);
    try {
      const historyForApi = messages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));
      const data = await sendSessionSummary(historyForApi, sessionId);
      setSummary(data.summary);
    } catch (e) {
      setSummaryError(e.message || "Could not generate summary");
    } finally {
      setIsSummarizing(false);
    }
  };


  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chatpage">
      <div className="chatcard">
        <header className="chat-header">
          <div>
            <h3>🕊️ Peace Bridge — Mediation Assistant</h3>
            <p className="muted-small">🤝 AI-guided conflict mediation</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="send-btn alt" onClick={resetChat} disabled={isSending || isSummarizing}>
              🔄 New Chat
            </button>
            <button className="send-btn" onClick={summarize} disabled={isSummarizing || messages.length < 2}>
              {isSummarizing ? "⏳ Summarizing..." : "📋 End Session"}
            </button>
          </div>
        </header>

        <div className="chat-window">
          <div className="messages" role="log" aria-live="polite" aria-label="Conversation messages">
            {messages.map((m, i) => m.sender === "crisis" ? (
              <CrisisCard key={m.id || i} />
            ) : (
              <div
                key={m.id || i}
                className={`bubble-row ${m.sender === "user" ? "bubble-row-user" : "bubble-row-bot"}`}
              >
                {m.sender === "bot" && <div className="avatar bot-avatar">🕊️</div>}
                <div style={{ display: "flex", flexDirection: "column", alignItems: m.sender === "user" ? "flex-end" : "flex-start", minWidth: 0 }}>
                  <div className={`bubble ${m.sender === "user" ? "bubble-user" : "bubble-bot"}`}>
                    <div className="bubble-text">
                      {m.text.split("\n").map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                    {m.sender === "bot" && m.meta?.primary_emotion && (
                      <div className="emotion-chip">
                        {m.meta.primary_emotion.toUpperCase()}
                        {m.meta.secondary_emotions?.length
                          ? ` • ${m.meta.secondary_emotions.join(", ")}`
                          : ""}
                        {m.meta.intensity ? ` • ${m.meta.intensity}` : ""}
                      </div>
                    )}
                  </div>
                  {m.sender === "bot" && m.suggestGrounding && (
                    <div className="grounding-nudge">
                      🌬️ Feeling overwhelmed?{" "}
                      <Link
                        to="/mindfulness"
                        state={{ fromChat: true }}
                        className="grounding-nudge-link"
                      >
                        Try a quick grounding exercise →
                      </Link>
                    </div>
                  )}
                  {m.sender === "user" && <PhrasingSuggestions suggestions={m.phrasing} onSelect={setInput} />}
                </div>
                {m.sender === "user" && <div className="avatar user-avatar">🙂</div>}
              </div>
            ))}

            {isTyping && (
              <div className="bubble-row bubble-row-bot">
                <div className="avatar bot-avatar">🕊️</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="bubble bubble-bot typing">
                    <div className="dots"><span></span><span></span><span></span></div>
                  </div>
                  {slowResponse && (
                    <span style={{ fontSize: "0.78rem", color: "#888", fontStyle: "italic", paddingLeft: 4 }}>
                      ⏳ Still thinking — this one is taking a little longer…
                    </span>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {summary && (
          <div className="card" style={{ marginTop: 16 }}>
            <h3>📋 Session Summary</h3>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{summary}</p>
          </div>
        )}

        {summaryError && (
          <div className="alert" style={{ marginTop: 12 }}>
            {summaryError}
          </div>
        )}

        <footer className="chat-input-area" style={{ flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "flex-end" }}>
            <textarea
              value={input}
              ref={inputRef}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="💬 Describe your situation..."
              rows={1}
              className="chat-input"
              aria-label="Type your mediation message"
            />
            {SpeechRecognitionAPI && (
              <button
                onClick={toggleMic}
                disabled={isSending}
                aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
                aria-pressed={isListening}
                title={isListening ? "Stop listening" : "Speak your message"}
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
            <button className="send-btn" onClick={send} disabled={isSending} aria-label="Send message">Send ➤</button>
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
