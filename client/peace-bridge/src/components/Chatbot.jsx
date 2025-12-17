// src/components/Chatbot.jsx
import React, { useEffect, useRef, useState } from "react";
import { getBotReply } from "../utils/ruleEngine";
import "./chatbot.css";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatbotPage() {
  const [messages, setMessages] = useState(() => {
    // try to restore from localStorage
    try {
      const raw = localStorage.getItem("peacebridge_chat_history_v1");
      return raw ? JSON.parse(raw) : [
        { sender: "bot", text: "Hello — I'm Peace Bridge. Tell me what's happening or how you're feeling." },
      ];
    } catch {
      return [{ sender: "bot", text: "Hello — I'm Peace Bridge. Tell me what's happening or how you're feeling." }];
    }
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState({ lastCategory: null, history: [] });
  const bottomRef = useRef();

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem("peacebridge_chat_history_v1", JSON.stringify(messages));
    } catch {}
    // update context.history for ruleEngine
    const hist = messages.filter(m => m.sender === "user" || m.sender === "bot")
      .map(m => ({ sender: m.sender, text: m.text }));
    setContext(c => ({ ...c, history: hist }));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const handleSend = async (sourceText) => {
    const text = (sourceText ?? input).trim();
    if (!text) return;
    // add user message
    const userMsg = { sender: "user", text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // call rule engine
    try {
      const botResp = await getBotReply(text, { lastCategory: context.lastCategory, history: context.history });
      // simulate slight delay for realism
      await new Promise(res => setTimeout(res, 600 + Math.random() * 600));

      const botMsg = { sender: "bot", text: botResp.reply, meta: { ...botResp } };
      setMessages(prev => [...prev, botMsg]);
      // update context: lastCategory
      setContext(prev => ({ ...prev, lastCategory: botResp.category || prev.lastCategory }));
    } catch (err) {
      setMessages(prev => [...prev, { sender: "bot", text: "Sorry, something went wrong — please try again." }]);
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // quick action: breathing exercise
  const runBreathing = () => {
    // short guided breathing script
    const steps = [
      "Let's try a 30-second breathing exercise: Sit comfortably.",
      "Inhale slowly for 4 seconds.",
      "Hold for 4 seconds.",
      "Exhale slowly for 6 seconds.",
      "Repeat this cycle three times and tell me how you feel."
    ];
    // send steps as bot messages with small delays
    (async () => {
      for (const s of steps) {
        setMessages(prev => [...prev, { sender: "bot", text: s }]);
        await new Promise(r => setTimeout(r, 900));
      }
    })();
  };

  // small helper to render bubble with subtle avatars
  const Bubble = ({ m, idx }) => (
    <div className={`bubble-row ${m.sender === "user" ? "bubble-row-user" : "bubble-row-bot"}`} key={idx}>
      {m.sender === "bot" && <div className="avatar bot-avatar">🕊️</div>}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className={`bubble ${m.sender === "user" ? "bubble-user" : "bubble-bot"}`}
      >
        <div className="bubble-text">{m.text}</div>
      </motion.div>
      {m.sender === "user" && <div className="avatar user-avatar">🙂</div>}
    </div>
  );

  return (
    <div className="chatpage">
      <div className="chatcard">
        <header className="chat-header">
          <div>
            <h3>Peace Bridge — Mediation Assistant</h3>
            <p className="muted-small">Calm, structured guidance for conflict & emotional support</p>
          </div>
          <div className="chat-actions">
            <button className="tiny" onClick={() => { setMessages([{ sender: "bot", text: "Hello — I'm Peace Bridge. Tell me what's happening or how you're feeling." }]); localStorage.removeItem("peacebridge_chat_history_v1"); }}>Reset</button>
            <button className="tiny" onClick={runBreathing}>Breathing</button>
          </div>
        </header>

        <div className="chat-window">
          <div className="messages">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div key={i} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Bubble m={m} idx={i} />
                </motion.div>
              ))}
            </AnimatePresence>

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
            onKeyDown={handleKeyDown}
            placeholder="Describe your situation or ask for guidance..."
            rows={1}
            className="chat-input"
          />
          <button className="send-btn" onClick={() => handleSend()}>Send</button>
        </footer>
      </div>
    </div>
  );
}
