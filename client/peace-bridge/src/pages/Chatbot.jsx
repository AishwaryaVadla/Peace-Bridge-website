import React, { useEffect, useRef, useState } from "react";
import "../components/chatbot.css";
import { detectEmotion } from "../utils/ruleEngine";
import { sendChat } from "../utils/chatbotAPI";

const greetings = [
  "Hi, I’m Peace Bridge. What’s going on for you today?",
  "Hey there — what’s on your mind right now?",
  "I’m here with you. What’s happening today?",
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
  const inFlightRef = useRef(null);
  const bottomRef = useRef(null);

  const resetChat = () => {
    setMessages([{ sender: "bot", text: getGreeting(), meta: {} }]);
    setInput("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const send = async () => {
    if (isSending) return;
    const text = input.trim();
    if (!text) return;

    const userMsg = { sender: "user", text, meta: {} };
    const reqId = Date.now();
    inFlightRef.current = reqId;

    setInput("");
    setIsSending(true);
    setIsTyping(true);
    setMessages((prev) => [...prev, userMsg]);

    try {
      const historyForApi = [...messages, userMsg].map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const { text: assistantText, data } = await sendChat(historyForApi);

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
      }
    } catch (e) {
      console.error(e);
      // Only append one fallback per request
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
          <button className="send-btn alt" onClick={resetChat} disabled={isSending}>
            New Chat
          </button>
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

        <footer className="chat-input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe your situation..."
            rows={1}
            className="chat-input"
          />
          <button className="send-btn" onClick={send} disabled={isSending}>Send</button>
        </footer>
      </div>
    </div>
  );
}
