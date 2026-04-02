import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "../../cpact_lab_logo.jpg";

const FONT_SIZES = ["normal", "large", "x-large"];
const FONT_LABELS = { normal: "A", large: "A+", "x-large": "A++" };

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Chatbot", to: "/chatbot" },
  { label: "Role-Play", to: "/roleplay" },
  { label: "Teaching", to: "/teaching" },
  { label: "Journal", to: "/journal" },
  { label: "Mindfulness", to: "/mindfulness" },
  { label: "Blogs", to: "/blogs" },
  { label: "About", to: "/about" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("pb_fontsize") || "normal");

  useEffect(() => {
    document.body.dataset.fontSize = fontSize;
    localStorage.setItem("pb_fontsize", fontSize);
  }, [fontSize]);

  const cycleFont = () => {
    setFontSize((f) => {
      const next = FONT_SIZES[(FONT_SIZES.indexOf(f) + 1) % FONT_SIZES.length];
      return next;
    });
  };

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <img src={logo} alt="CPACT Lab" className="nav-logo-img small" />
        <h1>Peace Bridge</h1>
      </div>

      <button
        onClick={cycleFont}
        aria-label={`Font size: ${fontSize}. Click to increase.`}
        title="Cycle font size"
        style={{
          background: "none",
          border: "1px solid #c5cae9",
          borderRadius: 6,
          padding: "3px 9px",
          cursor: "pointer",
          fontWeight: 700,
          color: "#3f51b5",
          fontSize: fontSize === "x-large" ? "1rem" : fontSize === "large" ? "0.92rem" : "0.82rem",
          flexShrink: 0,
        }}
      >
        {FONT_LABELS[fontSize]}
      </button>

      <button
        className={`nav-hamburger${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="nav-menu"
      >
        <span className="line" />
        <span className="line" />
        <span className="line" />
      </button>

      <ul
        id="nav-menu"
        className={`nav-links${open ? " nav-open" : ""}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {NAV_LINKS.map(({ label, to }) => (
          <li key={label}>
            <Link to={to} onClick={() => setOpen(false)}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
