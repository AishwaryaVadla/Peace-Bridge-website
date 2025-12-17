import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div>
        <h1>Peace Bridge</h1>
      </div>
      <ul className="nav-links">
        <li><Link to="/" className="hover:text-blue-600">Home</Link></li>
        <li><Link to="/chatbot" className="hover:text-blue-600">Chatbot</Link></li>
        <li><Link to="/teaching" className="hover:text-blue-600">Teaching</Link></li>
        <li><Link to="/journal" className="hover:text-blue-600">Journal</Link></li>
        <li><a href="#about" className="hover:text-blue-600">About</a></li>
      </ul>
    </nav>
  )
}
