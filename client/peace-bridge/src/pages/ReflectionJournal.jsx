import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getJournals,
  createJournal,
  updateJournal,
  deleteJournal,
  getJournalInsight,
} from "../utils/journalAPI.js";

const PROMPTS = [
  "What emotion did you feel most strongly today?",
  "What happened that triggered that feeling?",
  "How did you react, and what would you try differently next time?",
  "What strengths did you use during this situation?",
  "One small step I can take to feel better or resolve this is...",
  "What am I grateful for about this situation (or myself) today?",
];

const MOODS = [
  { value: "calm",       label: "🙂 Calm" },
  { value: "reflective", label: "🤔 Reflective" },
  { value: "hopeful",    label: "😊 Hopeful" },
  { value: "frustrated", label: "😤 Frustrated" },
  { value: "anxious",    label: "😟 Anxious" },
  { value: "sad",        label: "😢 Sad" },
  { value: "angry",      label: "😡 Angry" },
  { value: "heavy",      label: "😔 Heavy" },
];

const DRAFT_KEY = "peacebridge_journal_draft";

function parsContent(raw) {
  if (!raw) return PROMPTS.map(() => "");
  if (Array.isArray(raw)) return PROMPTS.map((_, i) => raw[i]?.answer || "");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return PROMPTS.map((_, i) => parsed[i]?.answer || "");
  } catch {}
  return PROMPTS.map(() => "");
}

function serializeContent(answers) {
  return JSON.stringify(PROMPTS.map((p, i) => ({ prompt: p, answer: answers[i] || "" })));
}

function flattenContent(answers) {
  return answers
    .map((a, i) => `${PROMPTS[i]}\n${a || "(no answer)"}`)
    .join("\n\n");
}

function MoodFrequency({ entries }) {
  if (!entries.length) return null;
  const counts = {};
  entries.forEach((e) => { if (e.mood) counts[e.mood] = (counts[e.mood] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const max = sorted[0]?.[1] || 1;
  return (
    <div style={{ marginTop: 20, padding: "12px 14px", background: "#f5f5ff", borderRadius: 10 }}>
      <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: "0.85rem", color: "#444" }}>
        Mood patterns
      </p>
      {sorted.map(([mood, count]) => {
        const m = MOODS.find((x) => x.value === mood);
        return (
          <div key={mood} style={{ marginBottom: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 2 }}>
              <span>{m?.label || mood}</span>
              <span style={{ color: "#888" }}>{count}×</span>
            </div>
            <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3 }}>
              <div style={{ height: 6, borderRadius: 3, background: "#5c6bc0", width: `${(count / max) * 100}%`, transition: "width 0.4s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReflectionJournal() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [activeEntryId, setActiveEntryId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftStep, setDraftStep] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState(() => PROMPTS.map(() => ""));
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMood, setDraftMood] = useState("reflective");

  // Post-save insight state
  const [savedEntry, setSavedEntry] = useState(null);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    getJournals()
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, [draftStep]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ draftAnswers, draftStep, draftTitle, draftMood }));
  }, [draftAnswers, draftStep, draftTitle, draftMood]);

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d?.draftAnswers) {
        setDraftAnswers(d.draftAnswers);
        setDraftStep(d.draftStep ?? 0);
        setDraftTitle(d.draftTitle ?? "");
        setDraftMood(d.draftMood ?? "reflective");
      }
    } catch {}
  }, []);

  const resetDraft = () => {
    setDraftAnswers(PROMPTS.map(() => ""));
    setDraftTitle("");
    setDraftMood("reflective");
    setDraftStep(0);
    localStorage.removeItem(DRAFT_KEY);
  };

  const startNew = () => {
    setSavedEntry(null);
    setInsight(null);
    setActiveEntryId(null);
    setIsEditing(true);
    resetDraft();
  };

  const fetchInsight = async (_entry, answers, mood) => {
    setInsightLoading(true);
    setInsight(null);
    try {
      const flat = flattenContent(answers);
      const result = await getJournalInsight(flat, mood);
      setInsight(result);
    } catch {
      setInsight(null);
    } finally {
      setInsightLoading(false);
    }
  };

  const saveEntry = async () => {
    setSaving(true);
    setError(null);
    try {
      const _entry = await createJournal({
        title: draftTitle || `Reflection – ${new Date().toLocaleDateString()}`,
        content: serializeContent(draftAnswers),
        mood: draftMood,
      });
      setEntries((prev) => [_entry, ...prev]);
      setSavedEntry({ entry: _entry, answers: [...draftAnswers], mood: draftMood });
      resetDraft();
      setIsEditing(false);
      fetchInsight(_entry, draftAnswers, draftMood);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEntry = (id) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    setSavedEntry(null);
    setInsight(null);
    setActiveEntryId(id);
    setIsEditing(false);
    setDraftAnswers(parsContent(e.content));
    setDraftTitle(e.title || "");
    setDraftMood(e.mood || "reflective");
    setDraftStep(0);
  };

  const enterEditMode = (id) => { openEntry(id); setIsEditing(true); };

  const saveEdit = async () => {
    if (!activeEntryId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateJournal(activeEntryId, {
        title: draftTitle || `Reflection – ${new Date().toLocaleDateString()}`,
        content: serializeContent(draftAnswers),
        mood: draftMood,
      });
      setEntries((prev) => prev.map((e) => (e.id === activeEntryId ? updated : e)));
      setIsEditing(false);
      setActiveEntryId(null);
      resetDraft();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this reflection? This cannot be undone.")) return;
    try {
      await deleteJournal(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (activeEntryId === id) { setActiveEntryId(null); setIsEditing(false); }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAnswerChange = (value) => {
    setDraftAnswers((prev) => { const c = [...prev]; c[draftStep] = value; return c; });
  };

  const exportEntries = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "peacebridge_reflections.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const talkItThrough = (answers, mood) => {
    const flat = flattenContent(answers);
    navigate("/chatbot", {
      state: {
        practiceSkill: "Journal Reflection",
        practicePrompt: `I'd like to talk through something I've been reflecting on. Here's my journal entry:\n\n${flat}\n\nMood: ${mood}\n\nCan you help me process this?`,
      },
    });
  };

  const practiceIt = () => navigate("/roleplay");

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderSidebar = () => (
    <div className="journal-list">
      <div className="journal-actions">
        <button className="nav-button" onClick={startNew}>+ New Reflection</button>
        <button className="nav-button alt" onClick={exportEntries} title="Download as JSON">Export</button>
      </div>

      <MoodFrequency entries={entries} />

      <div style={{ marginTop: 16 }}>
        {loading && <p className="muted">Loading…</p>}
        {!loading && entries.length === 0 && (
          <p className="muted">No reflections yet — start your first one.</p>
        )}
        <ul>
          {entries.map((e) => {
            const answers = parsContent(e.content);
            const preview = answers[0]?.slice(0, 72) || "— no text yet";
            const mood = MOODS.find((m) => m.value === e.mood);
            return (
              <li key={e.id} className="journal-item">
                <button
                  style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, flex: 1 }}
                  onClick={() => openEntry(e.id)}
                >
                  <strong style={{ fontSize: "0.9rem", color: "#1a237e" }}>
                    {e.title || new Date(e.created_at).toLocaleDateString()}
                  </strong>
                  {mood && <span style={{ marginLeft: 6, fontSize: "0.82em" }}>{mood.label}</span>}
                  <div className="muted small" style={{ marginTop: 2 }}>{preview}</div>
                </button>
                <div className="journal-item-actions">
                  <button className="nav-button" onClick={() => enterEditMode(e.id)}>Edit</button>
                  <button className="nav-button alt" onClick={() => handleDelete(e.id)}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="journal-editor">
      <div className="editor-header">
        <button className="nav-button alt" onClick={() => { setIsEditing(false); setActiveEntryId(null); }}>← Back</button>
        <div style={{ flex: 1 }} />
        <button className="nav-button" onClick={activeEntryId ? saveEdit : saveEntry} disabled={saving}>
          {saving ? "Saving…" : activeEntryId ? "Save Edit" : "Save Reflection"}
        </button>
      </div>

      {/* Title */}
      <input
        type="text"
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        placeholder="Entry title (optional)"
        className="reflection-input"
        style={{ width: "100%", marginBottom: 16 }}
      />

      {/* Mood picker — emoji buttons */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: "0.88rem", color: "#555" }}>
          How are you feeling?
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setDraftMood(m.value)}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                border: `1.5px solid ${draftMood === m.value ? "#3f51b5" : "#ddd"}`,
                background: draftMood === m.value ? "#e8eaf6" : "white",
                color: draftMood === m.value ? "#1a237e" : "#555",
                fontWeight: draftMood === m.value ? 700 : 400,
                cursor: "pointer",
                fontSize: "0.88rem",
                transition: "all 0.12s",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guided prompts */}
      <div className="chatbox">
        <div className="system-bubble">
          <strong>Guided reflection</strong>
          <div className="muted small">Answer honestly — saved privately.</div>
        </div>

        <AnimatePresence initial={false}>
          <motion.div
            key={draftStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.22 }}
            className="prompt-block"
          >
            <div className="prompt-bubble">{PROMPTS[draftStep]}</div>
            <textarea
              ref={inputRef}
              value={draftAnswers[draftStep]}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your reflection here…"
              rows={5}
              className="reflection-input"
            />
            <div className="editor-controls">
              <button className="nav-button alt" onClick={() => setDraftStep((s) => Math.max(s - 1, 0))} disabled={draftStep === 0}>← Prev</button>
              <span className="muted small">{draftStep + 1} / {PROMPTS.length}</span>
              <button className="nav-button" onClick={() => setDraftStep((s) => Math.min(s + 1, PROMPTS.length - 1))} disabled={draftStep === PROMPTS.length - 1}>Next →</button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  const renderInsightCard = (ins, answers, mood) => {
    const moodObj = MOODS.find((m) => m.value === mood);
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
          <h3 style={{ color: "#1a237e", margin: 0 }}>Reflection saved</h3>
          {moodObj && <p className="muted" style={{ margin: "4px 0 0" }}>Mood: {moodObj.label}</p>}
        </div>

        {insightLoading && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#5c6bc0", fontSize: "0.9rem" }}>
            <div className="dots" style={{ display: "inline-flex", gap: 5, marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5c6bc0", display: "inline-block", animation: "blink 1s infinite" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5c6bc0", display: "inline-block", animation: "blink 1s infinite", animationDelay: "0.15s" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5c6bc0", display: "inline-block", animation: "blink 1s infinite", animationDelay: "0.3s" }} />
            </div>
            <div>Generating your reflection insight…</div>
          </div>
        )}

        {ins && !insightLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ background: "#f0f3ff", border: "1px solid #c5cae9", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}
          >
            <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#1a237e", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              🧠 Your Reflection Insight
            </p>

            {ins.summary && (
              <p style={{ margin: "10px 0 0", color: "#333", lineHeight: 1.65 }}>{ins.summary}</p>
            )}
            {ins.insight && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #d1d5e8" }}>
                <span style={{ fontWeight: 600, color: "#3f51b5", fontSize: "0.88rem" }}>💡 Insight: </span>
                <span style={{ color: "#333", fontSize: "0.95rem" }}>{ins.insight}</span>
              </div>
            )}
            {ins.suggestion && (
              <div style={{ marginTop: 10 }}>
                <span style={{ fontWeight: 600, color: "#388e3c", fontSize: "0.88rem" }}>🌱 Suggestion: </span>
                <span style={{ color: "#333", fontSize: "0.95rem" }}>{ins.suggestion}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="nav-button"
            onClick={() => talkItThrough(answers, mood)}
            style={{ flex: 1, minWidth: 160, textAlign: "center" }}
          >
            💬 Talk this through
          </button>
          <button
            className="nav-button alt"
            onClick={practiceIt}
            style={{ flex: 1, minWidth: 160, textAlign: "center" }}
          >
            🎭 Practice this situation
          </button>
          <button
            className="nav-button alt"
            onClick={() => { setSavedEntry(null); setInsight(null); }}
            style={{ flex: 1, minWidth: 120, textAlign: "center" }}
          >
            View entries
          </button>
        </div>
      </motion.div>
    );
  };

  const renderEntryView = () => {
    const e = entries.find((x) => x.id === activeEntryId);
    if (!e) return <p className="muted">Entry not found.</p>;
    const answers = parsContent(e.content);
    const mood = MOODS.find((m) => m.value === e.mood);
    return (
      <div className="entry-view">
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <button className="nav-button alt" onClick={() => setActiveEntryId(null)}>← Back</button>
          <div style={{ flex: 1 }} />
          <button className="nav-button alt" onClick={() => talkItThrough(answers, e.mood)}>💬 Talk this through</button>
          <button className="nav-button" onClick={() => enterEditMode(e.id)}>Edit</button>
          <button className="nav-button alt" onClick={() => handleDelete(e.id)}>Delete</button>
        </div>

        <h3 style={{ margin: "0 0 4px", color: "#1a237e" }}>
          {e.title || new Date(e.created_at).toLocaleString()}
        </h3>
        {mood && <span style={{ fontSize: "0.9rem", color: "#666", display: "block", marginBottom: 16 }}>{mood.label}</span>}

        <div className="entry-contents">
          {PROMPTS.map((p, i) => (
            <div key={i} className="entry-row">
              <div className="entry-prompt">{p}</div>
              <div className="entry-answer">{answers[i] || <span className="muted">— no answer</span>}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main style={{ padding: 24 }}>
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="page-title">
        Reflection Journal
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="muted" style={{ textAlign: "center", marginBottom: 8 }}>
        Reflect · Understand · Grow — guided and private.
      </motion.p>

      {error && <div style={{ color: "red", textAlign: "center", marginBottom: 12 }}>Error: {error}</div>}

      <div className="reflection-layout">
        <aside className="reflection-sidebar">{renderSidebar()}</aside>

        <section className="reflection-main">
          {isEditing ? renderEditor()
          : savedEntry ? renderInsightCard(insight, savedEntry.answers, savedEntry.mood)
          : activeEntryId ? renderEntryView()
          : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontSize: "1.1rem", color: "#1a237e", fontWeight: 600, marginBottom: 8 }}>Welcome to your Reflection Journal</p>
              <p className="muted" style={{ marginBottom: 24 }}>Each reflection is guided, private, and followed by AI-powered insights.</p>
              <button className="nav-button" onClick={startNew}>Start a Reflection</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
