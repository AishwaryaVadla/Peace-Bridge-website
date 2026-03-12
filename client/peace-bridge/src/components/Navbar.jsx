import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../cpact_lab_logo.jpg";

export default function Navbar() {
  const [highContrast, setHighContrast] = useState(false);

  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    document.body.classList.toggle("high-contrast", next);
  };

  return (
    <nav className="navbar">
      <div>
        <div className="nav-logo">
          <img src={logo} alt="CPACT Lab" className="nav-logo-img small" />
          <h1>Peace Bridge</h1>
        </div>
      </div>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/chatbot">Chatbot</Link></li>
        <li><Link to="/roleplay">Role-Play</Link></li>
        <li><Link to="/teaching">Teaching</Link></li>
        <li><Link to="/journal">Journal</Link></li>
        <li><Link to="/blogs">Blogs</Link></li>
        <li><Link to="/about">About</Link></li>
        <li>
          <button
            onClick={toggleContrast}
            aria-pressed={highContrast}
            aria-label="Toggle high contrast mode"
            title="Toggle high contrast mode"
            style={{
              background: highContrast ? "#ff0" : "transparent",
              color: highContrast ? "#000" : "#555",
              border: "1px solid currentColor",
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            ◑ Contrast
          </button>
        </li>
      </ul>
    </nav>
  );
}
