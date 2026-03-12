export default function Footer() {
  return (
    <footer className="footer" style={{ padding: 0 }}>
      <div style={{
        background: "#fff8e1",
        borderTop: "1px solid #ffe082",
        color: "#6d4c00",
        padding: "8px 20px",
        fontSize: "0.82rem",
        textAlign: "center",
        lineHeight: 1.5,
      }}>
        <strong>⚠️ Educational use only.</strong> PeaceBridge is an AI-based mediation training
        simulator. It does not provide professional legal, mediation, or mental health advice. If you
        are in crisis, call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline).
      </div>
      <div style={{ padding: "12px 20px", textAlign: "center" }}>
        © 2026 Peace Bridge | Kansas State University - CPACT Lab
      </div>
    </footer>
  );
}
