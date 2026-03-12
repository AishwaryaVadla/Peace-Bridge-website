import { useEffect, useRef, useState } from "react";
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
  const [autoSummarized, setAutoSummarized] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inFlightRef = useRef(null);
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  const resetChat = () => {
    stopSpeaking();
    setMessages([{ sender: "bot", text: getGreeting(), meta: {} }]);
    setInput("");
    setSummary("");
    setSummaryError("");
    setAutoSummarized(false);
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
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const send = async () => {
    if (isSending) return;
    const text = input.trim();
    if (!text) return;

    stopSpeaking();
    const userMsg = { sender: "user", text, meta: {} };
    const reqId = Date.now();
    inFlightRef.current = reqId;

    setInput("");
    setIsSending(true);
    setIsTyping(true);
    setMessages((prev) => [...prev, userMsg]);

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
      };

      if (isCurrent) {
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
      if (inFlightRef.current === reqId) {
        setIsTyping(false);
        setIsSending(false);
        inFlightRef.current = null;
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

  useEffect(() => {
    const userCount = messages.filter((m) => m.sender === "user").length;
    if (userCount >= 8 && !autoSummarized && !summary && !isSummarizing) {
      setAutoSummarized(true);
      summarize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

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
            <h3>Peace Bridge — Mediation Assistant</h3>
            <p className="muted-small">Rule-based conflict guidance </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="send-btn alt" onClick={resetChat} disabled={isSending || isSummarizing}>
              New Chat
            </button>
            <button className="send-btn" onClick={summarize} disabled={isSummarizing || messages.length < 2}>
              {isSummarizing ? "Summarizing..." : "End Session"}
            </button>
          </div>
        </header>

        <div className="chat-window">
          <div className="messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`bubble-row ${m.sender === "user" ? "bubble-row-user" : "bubble-row-bot"}`}
              >
                {m.sender === "bot" && <div className="avatar bot-avatar">🕊️</div>}
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
                {m.sender === "user" && <div className="avatar user-avatar">🙂</div>}
              </div>
            ))}

            {isTyping && (
              <div className="bubble-row bubble-row-bot">
                <div className="avatar bot-avatar">🕊️</div>
                <div className="bubble bubble-bot typing">
                  <div className="dots"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {summary && (
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Session Summary</h3>
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Describe your situation..."
              rows={1}
              className="chat-input"
            />
            {SpeechRecognitionAPI && (
              <button
                onClick={toggleMic}
                disabled={isSending}
                title={isListening ? "Stop listening" : "Speak your message"}
                style={{
                  padding: "0 14px",
                  height: 40,
                  borderRadius: 8,
                  border: `1px solid ${isListening ? "#f44336" : "#3f51b5"}`,
                  background: isListening ? "#ffebee" : "white",
                  color: isListening ? "#f44336" : "#3f51b5",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  flexShrink: 0,
                }}
              >
                🎤
              </button>
            )}
            <button className="send-btn" onClick={send} disabled={isSending}>Send</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-end" }}>
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
