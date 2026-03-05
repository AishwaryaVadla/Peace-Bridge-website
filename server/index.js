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

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/chat", chatRouter);
app.use("/api/blogs", blogsRouter);
app.use("/api/session-summary", sessionSummaryRouter);
app.use("/api/quote", quoteRouter);
app.use("/api/roleplay", roleplayRouter);
app.use("/api/scenarios", scenariosRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
