import { useState } from "react";

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMessage = { sender: "user", text: input };
    setMessages([...messages, newMessage]);
    setInput("");
    // Temporary bot response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: "I understand. Let's find a calm solution together." }
      ]);
    }, 1000);
  };

  return (
    <main>
      <section className="chatbot" style={{ padding: "40px 0" }}>
        <h2 style={{ fontSize: "2rem", color: "#1a237e", textAlign: "center", marginBottom: "18px" }}>
          Virtual Mediation Assistant
        </h2>
        <p style={{ textAlign: "center", marginBottom: "24px", color: "#555" }}>
          Our chatbot helps you reflect, understand, and find peaceful solutions to conflicts.<br />
          It guides you through calming exercises and conflict resolution steps.
        </p>
        <div
          style={{
            background: "#fff",
            boxShadow: "0 5px 18px rgba(0,0,0,0.10)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "520px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Only display message list if there are messages, keeps space tight above input */}
          {messages.length > 0 && (
            <div style={{ padding: "18px", overflowY: "auto" }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{
                  marginBottom: "12px",
                  textAlign: msg.sender === "user" ? "right" : "left"
                }}>
                  <span style={{
                    display: "inline-block",
                    padding: "8px 18px",
                    borderRadius: "18px",
                    background: msg.sender === "user" ? "#3f51b5" : "#f0f0f0",
                    color: msg.sender === "user" ? "#fff" : "#333"
                  }}>
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* Chat input box, always at the bottom of card */}
          <div style={{
            borderTop: "1px solid #ede7f6",
            display: "flex",
            gap: "18px",
            justifyContent: "center",
            alignItems: "center",
            padding: "18px"
          }}>
            <input
              type="text"
              placeholder="Type your message..."
              style={{
                flex: 1,
                border: "1px solid #bbb",
                borderRadius: "14px",
                padding: "8px 18px",
                fontSize: "1rem"
              }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              style={{
                background: "#3f51b5",
                color: "#fff",
                border: "none",
                padding: "10px 28px",
                borderRadius: "18px",
                fontSize: "1rem",
                cursor: "pointer",
                transition: "background 0.3s"
              }}
            >
              Send
            </button>
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            margin: "32px auto 0 auto",
            fontStyle: "italic",
            color: "#555",
            fontSize: "1.15rem"
          }}
        >
          Start a conversation and take your first step towards peaceful conflict resolution!
        </div>
      </section>
    </main>
  );
}
