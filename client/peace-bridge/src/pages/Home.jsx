import { useState, useEffect } from "react"
import Chatbot from "../pages/Chatbot"
import TeachingSection from "../pages/TeachingSection"
import { Link } from "react-router-dom";

export default function Home() {
  const quotes = [
    "Peace begins with a smile. – Mother Teresa",
    "When the power of love overcomes the love of power, the world will know peace. – Jimi Hendrix",
    "Be kind, for everyone you meet is fighting a hard battle. – Plato",
    "The quieter you become, the more you can hear. – Ram Dass",
    "Peace is not absence of conflict, it is the ability to handle conflict by peaceful means. – Ronald Reagan",
    "An eye for an eye only ends up making the whole world blind. – Mahatma Gandhi",
    "You cannot shake hands with a clenched fist. – Indira Gandhi",
    "We can never obtain peace in the outer world until we make peace with ourselves. – Dalai Lama",
    "The best way to destroy an enemy is to make him a friend. – Abraham Lincoln",
    "If you want peace, you don’t talk to your friends. You talk to your enemies. – Desmond Tutu",
    "Peace is the only battle worth waging. – Albert Camus",
    "Let us forgive each other – only then will we live in peace. – Leo Tolstoy",
    "Courage is the price that life exacts for granting peace. – Amelia Earhart",
    "If we have no peace, it is because we have forgotten that we belong to each other. – Mother Teresa",
    "The more we sweat in peace, the less we bleed in war. – Vijaya Lakshmi Pandit",
    "You find peace not by rearranging the circumstances of your life, but by realizing who you are. – Eckhart Tolle",
  ]

  const [quote, setQuote] = useState("")

  useEffect(() => {
  // Set first quote immediately on mount
  const random = Math.floor(Math.random() * quotes.length);
  setQuote(quotes[random]);

  // Then set every 5 seconds
  const interval = setInterval(() => {
    const random = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[random]);
  }, 5000);
  return () => clearInterval(interval);
}, []);



  return (
    <main>
      {/* Hero / Home Section */}
      <section id="home" className="hero">
        <h1>Welcome to Peace Bridge</h1>
        <p style={{ marginBottom: "30px" }}>
          A digital platform for building harmony, resolving conflicts, and nurturing understanding through
          guided conversations and teachings.
        </p>

        <div className="quote-card">
          <p>{quote}</p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <Link to="#chatbot" className="nav-button" style={{ marginRight: "15px" }}>
            Try the Chatbot
          </Link>
          <Link to="#teaching" className="nav-button alt">
            Explore Lessons
          </Link>
        </div>
      </section>
    </main>
  )
}
