import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../cpact_lab_logo.jpg";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Chatbot", to: "/chatbot" },
  { label: "Role-Play", to: "/roleplay" },
  { label: "Teaching", to: "/teaching" },
  { label: "Journal", to: "/journal" },
  { label: "Blogs", to: "/blogs" },
  { label: "About", to: "/about" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <img src={logo} alt="CPACT Lab" className="nav-logo-img small" />
        <h1>Peace Bridge</h1>
      </div>

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
