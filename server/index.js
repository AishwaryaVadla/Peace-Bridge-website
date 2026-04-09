import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import chatRouter from "./routes/chat.js";
import blogsRouter from "./routes/blogs.js";
import sessionSummaryRouter from "./routes/sessionSummary.js";
import quoteRouter from "./routes/quote.js";
import roleplayRouter from "./routes/roleplay.js";
import scenariosRouter from "./routes/scenarios.js";
import journalRouter from "./routes/journal.js";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://aishwaryavadla.github.io",
      "https://hishamsaif05-peacebridge-space.hf.space",
    ],
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Serve built frontend if present (HF Space)
const distPath = path.join(process.cwd(), "public");
app.use(express.static(distPath));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/chat", chatRouter);
app.use("/api/blogs", blogsRouter);
app.use("/api/session-summary", sessionSummaryRouter);
app.use("/api/quote", quoteRouter);
app.use("/api/roleplay", roleplayRouter);
app.use("/api/scenarios", scenariosRouter);
app.use("/api/journal", journalRouter);

// Catch-all: serve frontend for non-API routes
app.get("/*path", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Allow up to 5 minutes for long Ollama responses
server.timeout = 5 * 60 * 1000;
server.keepAliveTimeout = 5 * 60 * 1000 + 1000;
