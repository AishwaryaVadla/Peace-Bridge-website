import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Chatbot from './pages/Chatbot';
import TeachingSection from './pages/TeachingSection';
import Footer from './components/Footer';

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/teaching" element={<TeachingSection />} />
      </Routes>
      <Footer />
    </Router>
  );
}