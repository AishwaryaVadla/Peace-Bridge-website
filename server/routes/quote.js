// server/routes/quote.js
import express from "express";

const router = express.Router();

const QUOTE_API = "https://zenquotes.io/api/random";
const ALT_QUOTE_API = "https://api.quotable.io/quotes/random?limit=1";
const DEFAULT_QUOTE = {
  quote: "Keep going—you’re doing better than you think.",
  author: "Unknown",
  source: "fallback",
};

// simple in-memory cache to avoid hammering public APIs
let cachedQuote = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

router.get("/", async (_req, res) => {
  try {
    const now = Date.now();
    if (cachedQuote && now - cachedAt < CACHE_TTL_MS) {
      return res.json(cachedQuote);
    }

    const response = await fetch(QUOTE_API);
    if (!response.ok) {
      throw new Error(`Quote API error: ${response.status}`);
    }

    const data = await response.json();
    const item = Array.isArray(data) ? data[0] : data;
    const quote = item?.q || item?.quote;
    const author = item?.a || item?.author || "Unknown";

    if (!quote) {
      throw new Error("Quote API returned no quote text");
    }

    const result = {
      quote,
      author,
      source: "zenquotes",
    };

    cachedQuote = result;
    cachedAt = now;
    return res.json(result);
  } catch (err) {
    console.error("Quote fetch error (primary):", err);

    // try alternate source
    try {
      const response = await fetch(ALT_QUOTE_API);
      if (!response.ok) throw new Error(`Alt Quote API error: ${response.status}`);
      const data = await response.json();
      const item = Array.isArray(data) ? data[0] : data;
      const quote = item?.content || item?.quote;
      const author = item?.author || "Unknown";
      if (!quote) throw new Error("Alt Quote API returned no quote text");

      const result = { quote, author, source: "quotable" };
      cachedQuote = result;
      cachedAt = Date.now();
      return res.json(result);
    } catch (err2) {
      console.error("Quote fetch error (fallback):", err2);
      cachedQuote = DEFAULT_QUOTE;
      cachedAt = Date.now();
      return res.json(DEFAULT_QUOTE);
    }
  }
});

export default router;
