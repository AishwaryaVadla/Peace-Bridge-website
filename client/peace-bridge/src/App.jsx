import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Chatbot from './pages/Chatbot';
import TeachingSection from './pages/TeachingSection';
import ReflectionJournal from "./pages/ReflectionJournal";
import About from "./pages/About";
import Blogs from "./pages/Blogs";
import BlogView from "./pages/BlogView";
import BlogNew from "./pages/BlogNew";
import BlogEdit from "./pages/BlogEdit";
import Roleplay from "./pages/Roleplay";
import Mindfulness from "./pages/Mindfulness";
import Footer from './components/Footer';
import AIDisclaimer from './components/AIDisclaimer';

export default function App() {
  return (
    <Router>
      <Navbar />
      <div id="main-content">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/roleplay" element={<Roleplay />} />
        <Route path="/teaching" element={<TeachingSection />} />
        <Route path="/journal" element={<ReflectionJournal />} />
        <Route path="/mindfulness" element={<Mindfulness />} />
        <Route path="/about" element={<About />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/blogs/new" element={<BlogNew />} />
        <Route path="/blogs/:id" element={<BlogView />} />
        <Route path="/blogs/:id/edit" element={<BlogEdit />} />
      </Routes>
      </div>
      <div style={{ marginTop: 32 }}>
        <AIDisclaimer />
      </div>
      <Footer />
    </Router>
  );
}