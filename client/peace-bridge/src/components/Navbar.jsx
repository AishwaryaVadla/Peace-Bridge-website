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
        <li><Link to="/" className="hover:text-blue-600">Home</Link></li>
        <li><Link to="/chatbot" className="hover:text-blue-600">Chatbot</Link></li>
        <li><Link to="/teaching" className="hover:text-blue-600">Teaching</Link></li>
        <li><Link to="/journal" className="hover:text-blue-600">Journal</Link></li>
        <li><Link to="/about" className="hover:text-blue-600">About</Link></li>
      </ul>
    </nav>
  )
}
