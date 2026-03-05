import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const FALLBACK_QUOTES = [
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
];

export default function Home() {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    let alive = true;

    const pickFallback = () => {
      const random = Math.floor(Math.random() * FALLBACK_QUOTES.length);
      return FALLBACK_QUOTES[random];
    };

    const loadQuote = async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/quote`);
        if (!resp.ok) throw new Error(`Quote API ${resp.status}`);
        const data = await resp.json();
        if (!alive) return;
        const text = data.quote && data.author ? `${data.quote} — ${data.author}` : data.quote;
        setQuote(text || pickFallback());
      } catch (e) {
        console.error("Quote fetch failed, using fallback:", e);
        if (alive) setQuote(pickFallback());
      }
    };

    loadQuote();
    const interval = setInterval(loadQuote, 10000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <main>
      <section id="home" className="hero">
        <h1>Welcome to Peace Bridge</h1>

        <p style={{ marginBottom: "30px" }}>
          A digital platform for building harmony, resolving conflicts,
          and nurturing understanding through guided conversations,
          peaceful practices, and community teachings.
        </p>

        <div className="quote-card">
          <p>{quote}</p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <Link to="/chatbot" className="nav-button" style={{ marginRight: "15px" }}>
            Try the Chatbot
          </Link>

          <Link to="/teaching" className="nav-button alt">
            Explore Lessons
          </Link>
        </div>
      </section>
    </main>
  );
}
