import React, { useEffect, useRef, useState } from "react";
import { getBotReply } from "../utils/ruleEngine";
import "../components/chatbot.css";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello — I'm Peace Bridge. Tell me what’s happening or how you’re feeling." },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastCategory, setLastCategory] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInput("");
    setIsTyping(true);

    try {
      const result = await getBotReply(text, {
        lastCategory,
        history: messages.map((m) => ({ sender: m.sender, text: m.text })),
      });

      setLastCategory(result.category || lastCategory);

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: result.reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry — something went wrong. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
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
                  <div className="bubble-text">{m.text}</div>
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
          <button className="send-btn" onClick={send}>Send</button>
        </footer>
      </div>
    </div>
  );
}
