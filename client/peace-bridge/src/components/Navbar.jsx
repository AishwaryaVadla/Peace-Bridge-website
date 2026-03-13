import { Link } from "react-router-dom";
import logo from "../../cpact_lab_logo.jpg";

export default function Navbar() {
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
      </ul>
    </nav>
  );
}
