import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// ── Breathing exercise ─────────────────────────────────────────────────────
const BREATH_PHASES = [
  { label: "Breathe in…", duration: 4, scale: 1.55, color: "#6fa8ff", bg: "#e8f1ff" },
  { label: "Hold…",       duration: 4, scale: 1.55, color: "#9575cd", bg: "#ede7f6" },
  { label: "Breathe out…",duration: 6, scale: 1.0,  color: "#4db6ac", bg: "#e0f2f1" },
];

function BreathingExercise({ onBack }) {
  const [running, setRunning]   = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [elapsed, setElapsed]   = useState(0);
  const [cycles, setCycles]     = useState(0);
  const intervalRef             = useRef(null);

  const phase = BREATH_PHASES[phaseIdx];
  const progress = elapsed / phase.duration;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= phase.duration) {
          const next = (phaseIdx + 1) % BREATH_PHASES.length;
          if (next === 0) setCycles((c) => c + 1);
          setPhaseIdx(next);
          return 0;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phaseIdx, phase.duration]);

  const stop = () => {
    setRunning(false);
    setPhaseIdx(0);
    setElapsed(0);
    setCycles(0);
    clearInterval(intervalRef.current);
  };

  return (
    <div style={{ textAlign: "center", padding: "8px 0 40px" }}>
      <button className="nav-button alt" onClick={onBack} style={{ marginBottom: 36 }}>← Back</button>

      <h2 style={{ color: "#1a237e", marginBottom: 10, fontSize: "1.6rem" }}>Box Breathing</h2>
      <p className="subtle" style={{ maxWidth: 400, margin: "0 auto 52px", lineHeight: 1.7, fontSize: "0.95rem" }}>
        Inhale 4 s · Hold 4 s · Exhale 6 s — repeat to calm your nervous system.
      </p>

      {/* Animated circle */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 52 }}>
        <motion.div
          animate={{ scale: phase.scale, backgroundColor: phase.bg, borderColor: phase.color }}
          transition={{ duration: phase.duration - 0.1, ease: "easeInOut" }}
          style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: `4px solid ${phase.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: phase.bg,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: phase.color, marginBottom: 6 }}>
              {running ? phase.label : "Ready"}
            </div>
            {running && (
              <div style={{ fontSize: "2.2rem", fontWeight: 700, color: phase.color, lineHeight: 1 }}>
                {phase.duration - elapsed}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Progress bar + cycles */}
      <div style={{ minHeight: 48, marginBottom: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {running && (
          <>
            <div style={{ width: 220, height: 6, background: "#e0e0e0", borderRadius: 3 }}>
              <motion.div
                style={{ height: 6, borderRadius: 3, background: phase.color }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
            <p className="subtle" style={{ fontSize: "0.85rem", margin: 0 }}>
              {cycles > 0 ? `${cycles} cycle${cycles > 1 ? "s" : ""} completed` : "Starting…"}
            </p>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {!running ? (
          <button className="nav-button" onClick={() => setRunning(true)}>▶ Start</button>
        ) : (
          <button className="nav-button alt" onClick={stop}>⏹ Stop</button>
        )}
      </div>
    </div>
  );
}

// ── 5-4-3-2-1 Grounding ────────────────────────────────────────────────────
const GROUNDING_STEPS = [
  { count: 5, sense: "SEE",   icon: "👁️",  prompt: "Name 5 things you can see right now.", color: "#3f51b5" },
  { count: 4, sense: "TOUCH", icon: "✋",  prompt: "Name 4 things you can physically feel or touch.", color: "#7b1fa2" },
  { count: 3, sense: "HEAR",  icon: "👂",  prompt: "Name 3 sounds you can hear around you.", color: "#00838f" },
  { count: 2, sense: "SMELL", icon: "👃",  prompt: "Name 2 things you can smell (or like the smell of).", color: "#558b2f" },
  { count: 1, sense: "TASTE", icon: "👅",  prompt: "Name 1 thing you can taste or would enjoy tasting.", color: "#e65100" },
];

function GroundingExercise({ onBack }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState(GROUNDING_STEPS.map(() => ""));

  const current = GROUNDING_STEPS[step];

  const next = () => {
    if (step < GROUNDING_STEPS.length - 1) setStep((s) => s + 1);
    else setDone(true);
  };

  const reset = () => { setStep(0); setDone(false); setAnswers(GROUNDING_STEPS.map(() => "")); };

  return (
    <div>
      <button className="nav-button alt" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <h2 style={{ color: "#1a237e", marginBottom: 6 }}>5-4-3-2-1 Grounding</h2>
      <p className="subtle" style={{ marginBottom: 28, maxWidth: 480 }}>
        Bring yourself back to the present moment by engaging each sense. Take your time with each step.
      </p>

      {/* Step indicators */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {GROUNDING_STEPS.map((s, i) => (
          <div
            key={i}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: i < step || done ? s.color : i === step ? s.color + "33" : "#e0e0e0",
              color: i < step || done ? "white" : i === step ? s.color : "#999",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.9rem", fontWeight: 700,
              border: i === step && !done ? `2px solid ${s.color}` : "2px solid transparent",
              transition: "all 0.3s",
            }}
          >
            {i < step || done ? "✓" : s.count}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", padding: "32px 0" }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🌿</div>
            <h3 style={{ color: "#2e7d32" }}>Well done.</h3>
            <p className="subtle" style={{ maxWidth: 360, margin: "8px auto 24px" }}>
              You've completed the grounding exercise. Take a moment to notice how you feel now.
            </p>
            <button className="nav-button" onClick={reset}>Do it again</button>
          </motion.div>
        ) : (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div
              style={{
                background: current.color + "11",
                border: `1px solid ${current.color}33`,
                borderRadius: 14,
                padding: "24px 28px",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: "2rem" }}>{current.icon}</span>
                <div>
                  <span style={{ fontSize: "1.4rem", fontWeight: 700, color: current.color }}>
                    {current.count}
                  </span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: current.color, marginLeft: 6 }}>
                    things you can {current.sense}
                  </span>
                </div>
              </div>
              <p style={{ color: "#444", margin: "0 0 16px", lineHeight: 1.6 }}>{current.prompt}</p>
              <textarea
                className="reflection-input"
                rows={3}
                placeholder="Type here or just think about it quietly…"
                value={answers[step]}
                onChange={(e) =>
                  setAnswers((prev) => { const a = [...prev]; a[step] = e.target.value; return a; })
                }
                style={{ width: "100%", marginTop: 0 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="subtle" style={{ fontSize: "0.85rem" }}>
                Step {step + 1} of {GROUNDING_STEPS.length}
              </span>
              <button className="nav-button" onClick={next}>
                {step < GROUNDING_STEPS.length - 1 ? "Next →" : "Finish ✓"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pause Before Responding ────────────────────────────────────────────────
const PAUSE_TIPS = [
  { icon: "⏸️", tip: "Before you reply, pause for 5 seconds.", detail: "A short pause prevents reactive responses that you might regret." },
  { icon: "🤔", tip: "Ask: 'What do I actually want from this conversation?'", detail: "Clarifying your goal shifts you from reacting to responding intentionally." },
  { icon: "👂", tip: "Repeat back what you heard before replying.", detail: '"What I\'m hearing is… is that right?" — this validates and buys thinking time.' },
  { icon: "💬", tip: "Use 'I' statements instead of 'You' accusations.", detail: '"I feel…" is harder to argue with than "You always…"' },
  { icon: "🌡️", tip: "Rate your emotional heat from 1–10 before speaking.", detail: "If you're above 7, consider waiting before you engage." },
];

function PauseTips({ onBack }) {
  return (
    <div>
      <button className="nav-button alt" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <h2 style={{ color: "#1a237e", marginBottom: 6 }}>Pause Before Responding</h2>
      <p className="subtle" style={{ marginBottom: 28, maxWidth: 480 }}>
        The space between stimulus and response is where your power lives. These micro-habits help.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {PAUSE_TIPS.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "16px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{t.icon}</span>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#1a237e" }}>{t.tip}</p>
              <p className="subtle" style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5 }}>{t.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Main Mindfulness page ──────────────────────────────────────────────────
const EXERCISES = [
  {
    id: "breathing",
    title: "Box Breathing",
    icon: "🌬️",
    tagline: "Calm your nervous system in 2 minutes.",
    color: "#3f7be6",
    bg: "#e8f1ff",
  },
  {
    id: "grounding",
    title: "5-4-3-2-1 Grounding",
    icon: "🌿",
    tagline: "Come back to the present moment through your senses.",
    color: "#2e7d32",
    bg: "#e8f5e9",
  },
  {
    id: "pause",
    title: "Pause Before Responding",
    icon: "⏸️",
    tagline: "Micro-habits to respond instead of react.",
    color: "#7b1fa2",
    bg: "#f3e5f5",
  },
];

export default function Mindfulness() {
  const [active, setActive] = useState(null);
  const [hasSavedChat, setHasSavedChat] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setHasSavedChat(!!sessionStorage.getItem("pb_chat_session"));
  }, []);

  return (
    <div className="page" style={{ maxWidth: 700, paddingBottom: 60 }}>
      {/* Return-to-chat banner */}
      {hasSavedChat && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "#e8f1ff",
            border: "1px solid #90aee8",
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span style={{ fontSize: "0.92rem", color: "#1a237e" }}>
            💬 You have an ongoing conversation saved.
          </span>
          <button
            className="nav-button"
            style={{ padding: "7px 16px", fontSize: "0.88rem" }}
            onClick={() => navigate("/chatbot")}
          >
            ← Continue conversation
          </button>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ color: "#1a237e", marginBottom: 4 }}>🌬️ Mindfulness & Grounding</h1>
        <p className="subtle" style={{ marginBottom: 32 }}>
          Emotional regulation exercises to help you stay calm and present during conflict.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!active ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {EXERCISES.map((ex, i) => (
                <motion.button
                  key={ex.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setActive(ex.id)}
                  style={{
                    background: ex.bg,
                    border: `1px solid ${ex.color}33`,
                    borderRadius: 14,
                    padding: "20px 24px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                  }}
                >
                  <span style={{ fontSize: "2.2rem", flexShrink: 0 }}>{ex.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1.05rem", color: ex.color, marginBottom: 4 }}>
                      {ex.title}
                    </div>
                    <div className="subtle" style={{ fontSize: "0.9rem" }}>{ex.tagline}</div>
                  </div>
                  <span style={{ marginLeft: "auto", color: ex.color, fontSize: "1.2rem", flexShrink: 0 }}>→</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {active === "breathing" && <BreathingExercise onBack={() => setActive(null)} />}
            {active === "grounding"  && <GroundingExercise onBack={() => setActive(null)} />}
            {active === "pause"      && <PauseTips onBack={() => setActive(null)} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
