import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  {
    label: "Core Communication",
    icon: "💬",
    topics: [
      "Active Listening",
      "Emotional Validation",
      "Nonviolent Communication",
      "Empathy in Conflict",
    ],
  },
  {
    label: "Conflict Techniques",
    icon: "🛠️",
    topics: [
      "De-escalation",
      "Reframing",
      "Boundary Setting",
      "Finding Common Ground",
    ],
  },
  {
    label: "Emotional Intelligence",
    icon: "🧠",
    topics: [
      "Recognizing Triggers",
      "Regulating Emotions",
      "Perspective-Taking",
      "Self-Compassion",
    ],
  },
  {
    label: "Real-Life Applications",
    icon: "🌍",
    topics: [
      "Workplace Conflicts",
      "Family Disputes",
      "Difficult Conversations",
      "Community Disputes",
    ],
  },
];

const CONTENT = {
  "Active Listening": {
    summary: "Fully engaging with what someone communicates — verbally and emotionally.",
    body: `Active listening is more than hearing words. It means giving someone your complete attention and making them feel genuinely understood before you respond.

Key principles:
• Give full attention — put distractions aside, make eye contact
• Don't interrupt — let the person finish their thought
• Reflect back — "What I'm hearing is…" to confirm understanding
• Ask clarifying questions — "Can you tell me more about that?"
• Avoid jumping to solutions — people often need to feel heard first

Why it matters: Most conflicts escalate because one or both parties feel unheard. When someone feels genuinely listened to, defensiveness drops and real dialogue becomes possible.`,
    practice: "Let's practice active listening. I'll play someone who feels ignored in team meetings. Respond to what I say as if you're genuinely trying to understand — not fix — my situation.",
  },
  "Emotional Validation": {
    summary: "Acknowledging someone's feelings without judgment or minimizing.",
    body: `Emotional validation means communicating that another person's feelings make sense given their experience — even if you see the situation differently.

What it sounds like:
• "I can understand why that would be frustrating."
• "That makes complete sense given what you've been through."
• "It sounds like you've been carrying a lot."

What it is NOT:
• Agreement — you're not saying they're right, just that their feelings are real
• Minimizing — avoid "it's not that bad" or "others have it worse"
• Fixing — validation comes before problem-solving

Why it matters: People who feel emotionally validated are far more likely to engage in productive dialogue and consider other perspectives.`,
    practice: "Let's practice emotional validation. I'll share something frustrating with you. Respond by validating my feelings before offering any advice or perspective.",
  },
  "Nonviolent Communication": {
    summary: "A framework for expressing yourself without triggering defensiveness.",
    body: `Nonviolent Communication (NVC), developed by Marshall Rosenberg, gives you a four-part structure to express yourself and hear others without blame or judgment.

The four components:
1. Observation — describe what you observe without evaluation ("When I see/hear…")
2. Feeling — name your emotional response ("I feel…")
3. Need — identify the underlying need driving the feeling ("Because I need…")
4. Request — make a specific, actionable request ("Would you be willing to…?")

Example:
Instead of: "You never listen to me"
NVC version: "When I'm speaking and you look at your phone, I feel dismissed because I need to feel heard. Would you be willing to put your phone down when we talk?"

Why it matters: NVC separates observation from evaluation, and feelings from blame — making it much harder for the other person to become defensive.`,
    practice: "Let's practice NVC. I'll give you a blaming statement and you rewrite it using the four NVC components: Observation, Feeling, Need, Request.",
  },
  "Empathy in Conflict": {
    summary: "Understanding the emotional experience of someone you're in conflict with.",
    body: `Empathy in conflict means genuinely trying to understand the other party's emotional experience — not just their argument.

Cognitive vs. Emotional Empathy:
• Cognitive empathy — understanding what someone thinks or why they hold their position
• Emotional empathy — feeling what it might be like to be in their situation

Empathy does not mean:
• Agreeing with them
• Abandoning your own position
• Excusing harmful behavior

Empathy in practice:
Ask yourself: "What might this person be afraid of? What do they need that they're not getting?"
This one question can transform a conflict from opposition to problem-solving.

Why it matters: Empathy is the single most reliable way to reduce defensiveness and open a path toward resolution.`,
    practice: "Let's practice empathy. I'll describe a conflict from my perspective. Your job is to respond by naming what you think I might be feeling and what I might need — without agreeing or disagreeing with me.",
  },
  "De-escalation": {
    summary: "Lowering emotional intensity before it blocks productive conversation.",
    body: `De-escalation is the practice of reducing emotional tension so a conversation can continue productively. It does not mean suppressing emotions — it means creating space for them to be heard safely.

Key techniques:
• Lower your own voice and slow your pace
• Acknowledge the emotion directly: "I can see this is really upsetting"
• Avoid defensive or dismissive language ("calm down", "you're overreacting")
• Create a pause: "Can we take a moment before we continue?"
• Remove triggers: change the setting if the environment is adding pressure

The golden rule: You cannot de-escalate someone else until you've de-escalated yourself first.

Why it matters: When emotions run too high, the rational parts of the brain essentially go offline. De-escalation restores access to problem-solving and empathy.`,
    practice: "Let's practice de-escalation. I'll play someone who is escalating — raising their voice, speaking in absolutes, becoming accusatory. Respond in a way that lowers the temperature without dismissing what I'm feeling.",
  },
  "Reframing": {
    summary: "Shifting how a conflict is described to open new possibilities.",
    body: `Reframing means restating a problem in a way that changes how it's perceived — turning blame into need, positions into interests, and obstacles into shared challenges.

Examples:
• "You're always late" → "Punctuality is something that matters a lot to me"
• "He's completely unreasonable" → "It sounds like you two have very different priorities right now"
• "This is your fault" → "It sounds like something went wrong for both of you here"

Reframing in mediation:
A skilled mediator constantly reframes — taking a hostile statement and reflecting it back as a need or concern that both parties can engage with.

Why it matters: The way a conflict is framed determines whether parties see themselves as opponents or as people with a shared problem to solve. Reframing changes the game.`,
    practice: "Let's practice reframing. I'll give you a blaming or hostile statement. Reframe it into something that names the underlying concern or need without assigning fault.",
  },
  "Boundary Setting": {
    summary: "Communicating what you will and won't accept — clearly and without aggression.",
    body: `Boundaries are not walls — they are clear statements about what you need in order to continue engaging respectfully.

How to set a boundary:
1. Name the behavior: "When you raise your voice at me…"
2. State the impact: "I find it very hard to hear what you're saying"
3. State the boundary: "I need us to speak calmly, or I'll need to take a break"
4. Follow through — a boundary without a consequence teaches people it isn't real

What good boundaries sound like:
• "I'm willing to talk about this, but not when we're both this angry"
• "I need you to stop interrupting me before I can continue"
• "I can't keep having this conversation if it becomes personal"

Why it matters: Without boundaries, conflict conversations become unsafe — and unsafe conversations don't produce resolution.`,
    practice: "Let's practice boundary setting. I'll play someone who keeps interrupting or escalating. Use clear, calm boundary language to address the behavior without attacking the person.",
  },
  "Finding Common Ground": {
    summary: "Identifying shared values, needs, or goals beneath opposing positions.",
    body: `In almost every conflict, both parties share at least one underlying need — even when their stated positions are opposite.

Positions vs. Interests:
• Position: "I want full custody of the kids"
• Interest: "I want my children to be safe and to have a stable, loving home"

Both parents likely share that interest — the conflict is over the position, not the underlying need.

How to find common ground:
• Ask "Why is this important to you?" rather than "What do you want?"
• Listen for shared values (safety, fairness, respect, stability)
• Name the shared concern out loud: "It sounds like you both want what's best for the team"

Why it matters: Common ground isn't compromise — it's a foundation. Once people see what they share, they can often find creative solutions that serve both parties.`,
    practice: "Let's find common ground. I'll play two conflicting parties taking opposite positions. Help us identify what we might actually have in common beneath the surface disagreement.",
  },
  "Recognizing Triggers": {
    summary: "Identifying what causes you to react emotionally in conflict situations.",
    body: `A trigger is something that activates a strong emotional response — often disproportionate to the immediate situation because it connects to a deeper wound or fear.

Common conflict triggers:
• Feeling dismissed or not listened to
• Being blamed or accused unfairly
• Feeling disrespected or talked down to
• Sensing that your values are being challenged
• Being compared to someone else negatively

How to recognize a trigger in yourself:
• Your emotional response feels bigger than the situation warrants
• You're replaying the incident over and over
• You feel a physical reaction — tight chest, heat in your face, clenched jaw

What to do when triggered:
Pause. Name it internally: "I'm triggered right now." This alone — labeling the emotion — reduces its intensity by activating the prefrontal cortex.

Why it matters: You cannot respond wisely to a conflict while you are inside a triggered state. Awareness is the first step toward choice.`,
    practice: "Let's practice recognizing triggers. Describe a recent situation where your reaction felt bigger than expected. I'll help you explore what might be underneath it.",
  },
  "Regulating Emotions": {
    summary: "Managing your emotional state so it supports — rather than derails — conversation.",
    body: `Emotional regulation is not suppression. It is the ability to feel an emotion, acknowledge it, and choose how you respond — rather than react automatically.

Techniques for in-the-moment regulation:
• Box breathing — inhale 4s, hold 4s, exhale 6s, repeat
• Labeling — say to yourself "I'm feeling angry right now"
• Grounding — name 5 things you can see, 4 you can feel, 3 you can hear
• Creating distance — "Let me think about that for a moment"

Longer-term regulation habits:
• Regular physical movement
• Journaling to process feelings before difficult conversations
• Identifying your own patterns and what situations tend to elevate you

Why it matters: When you can regulate your own emotional state, you become a stabilizing force in any conflict — rather than an accelerant.`,
    practice: "Let's practice staying regulated under pressure. I'll play someone pushing your buttons during a difficult conversation. Respond in a way that shows you're managing your emotional state — not suppressing it, but not letting it take over either.",
  },
  "Perspective-Taking": {
    summary: "Genuinely imagining the world as the other party experiences it.",
    body: `Perspective-taking is the cognitive skill of stepping outside your own viewpoint and genuinely considering how someone else experiences the same situation.

It is different from empathy:
• Perspective-taking is cognitive — understanding their thinking
• Empathy is emotional — feeling what they feel
Both are valuable, and they work together.

How to practice it:
• Ask: "What might this look like from their position?"
• Consider: "What past experience might be shaping how they see this?"
• Try: "If I had their background, values, and fears — how would I interpret this situation?"

The bias challenge: Our brains default to assuming others share our values and context. Perspective-taking requires actively overriding that assumption.

Why it matters: The inability to take another person's perspective is at the root of most sustained conflicts. It turns "we see this differently" into "you are wrong."`,
    practice: "Let's practice perspective-taking. I'll describe a conflict I'm in. Your job is to articulate how the other person in the conflict might be experiencing the same situation — as fairly and generously as possible.",
  },
  "Self-Compassion": {
    summary: "Treating yourself with the same kindness you would offer a good friend.",
    body: `Self-compassion, developed by Dr. Kristin Neff, has three components:

1. Self-kindness — speaking to yourself as you would speak to someone you care about
2. Common humanity — recognizing that struggle and failure are universal human experiences
3. Mindfulness — observing painful feelings without over-identifying with them

Why it matters in conflict:
People who are hard on themselves tend to be hard on others. They also tend to be more defensive in conflict, because admitting fault feels catastrophic rather than normal.

Self-compassion in practice:
When you've contributed to a conflict, instead of "I'm terrible, I always do this," try: "I made a mistake. That's human. What can I learn here and what can I do differently?"

The research: Self-compassion is strongly linked to emotional resilience, accountability, and the ability to apologize genuinely.`,
    practice: "Let's practice self-compassion. Think about a conflict where you felt you handled it badly. Tell me about it and I'll help you process it with self-compassion rather than self-criticism.",
  },
  "Workplace Conflicts": {
    summary: "Navigating disagreements in professional settings with care and clarity.",
    body: `Workplace conflicts are especially complex because they involve power dynamics, performance stakes, and ongoing relationships that can't easily be ended.

Most common sources:
• Communication breakdowns — unclear expectations, missed messages
• Role ambiguity — unclear responsibilities leading to blame
• Values misalignment — different views on work ethic, quality, or process
• Unequal workload or credit
• Interpersonal friction under deadline pressure

Key principles for professional conflicts:
• Separate the issue from the person
• Address behavior, not character ("When this report was submitted late" not "You're unreliable")
• Choose the right setting — never in front of others, never over email for complex issues
• Document where appropriate

What managers need to understand: Most workplace conflicts that escalate were resolvable early — they grew because they weren't addressed directly.`,
    practice: "Let's practice a workplace conflict. I'll play a colleague who is taking credit for your work in team meetings. Use what you've learned to address this directly, professionally, and without aggression.",
  },
  "Family Disputes": {
    summary: "Resolving conflict within the complex dynamics of family relationships.",
    body: `Family disputes carry decades of history, shared identity, and unspoken rules — making them uniquely difficult to navigate.

What makes family conflict different:
• History — past grievances are almost always in the room
• Role rigidity — people are seen as "the difficult one" or "the peacemaker"
• High stakes — relationships that can't simply be walked away from
• Enmeshment — boundaries are often unclear or contested

Common family conflict patterns:
• Triangulation — involving a third family member in a two-person dispute
• Stonewalling — one party shuts down to avoid confrontation
• Escalation cycles — small issues explode into larger ones repeatedly

Approaches that help:
• Address one issue at a time — family conflicts tend to collapse into everything at once
• Speak in first-person throughout
• Separate the current issue from the historical grievance
• Agree on ground rules before the conversation`,
    practice: "Let's practice a family dispute. I'll play a sibling who feels like they were treated unfairly compared to you growing up. Help navigate this conversation toward understanding rather than blame.",
  },
  "Difficult Conversations": {
    summary: "Having conversations most people avoid — with honesty and care.",
    body: `Difficult conversations are ones where the stakes feel high, opinions differ, and emotions run strong. Most people avoid them — which typically makes the underlying issue worse.

The three conversations inside every difficult conversation (Douglas Stone, Bruce Patton):
1. The "What happened?" conversation — each person has a different story about the facts
2. The feelings conversation — there are unexpressed emotions on both sides
3. The identity conversation — each person is worried about what this says about who they are

How to start:
• Start with curiosity, not conclusions: "I want to understand what happened from your perspective"
• Share your own experience using "I" language
• Name the meta-issue if needed: "This is a hard conversation and I want us both to get through it well"

The goal is not "winning" or even agreement — it is mutual understanding.`,
    practice: "Let's practice a difficult conversation. I'll give you a scenario where you need to tell someone something they don't want to hear. Navigate it with honesty, care, and clarity.",
  },
  "Community Disputes": {
    summary: "Mediating conflicts that involve shared spaces, resources, or values.",
    body: `Community disputes — between neighbors, organizations, or public stakeholders — often involve competing needs for the same resource, space, or identity.

What makes them distinct:
• Multiple parties — rarely just two people
• Ongoing proximity — parties must continue to share the same space
• Public stakes — outcomes affect people beyond those at the table
• Power imbalances — some voices are structurally louder than others

Key approaches:
• Establish ground rules collaboratively at the start
• Ensure all parties have equal speaking time
• Focus on interests and needs, not positions
• Look for integrative solutions — ones that address multiple parties' needs simultaneously
• Document agreements clearly and follow up

The role of a mediator in community disputes is particularly important: holding the space neutrally so all voices are heard, and helping the group move from complaint to co-creation.`,
    practice: "Let's practice a community dispute. I'll play two neighbors in conflict over a shared space. Help mediate a conversation between them — stay neutral, draw out both perspectives, and move toward a solution.",
  },
};

export default function TeachingSection() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState(0);
  const [activeTopic, setActiveTopic] = useState(CATEGORIES[0].topics[0]);

  const current = CONTENT[activeTopic];

  const handlePractice = () => {
    navigate("/chatbot", { state: { practiceSkill: activeTopic, practicePrompt: current.practice } });
  };

  return (
    <section className="teaching-section">
      <motion.h2
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="teaching-title"
      >
        Learning Hub
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="teaching-subtitle"
      >
        Build real mediation skills — then practice them directly with the AI.
      </motion.p>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 }}>
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => { setActiveCat(i); setActiveTopic(cat.topics[0]); }}
            style={{
              padding: "8px 18px",
              borderRadius: 20,
              border: "1px solid #3f51b5",
              background: activeCat === i ? "#3f51b5" : "white",
              color: activeCat === i ? "white" : "#3f51b5",
              fontWeight: activeCat === i ? 700 : 500,
              cursor: "pointer",
              fontSize: "0.9rem",
              transition: "all 0.15s",
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", maxWidth: 1100, margin: "0 auto" }}>

        {/* Topics sidebar */}
        <div style={{
          flexShrink: 0,
          width: 210,
          background: "rgba(255,255,255,0.92)",
          borderRadius: 12,
          padding: "12px 8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.07)",
        }}>
          {CATEGORIES[activeCat].topics.map((topic) => (
            <button
              key={topic}
              onClick={() => setActiveTopic(topic)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                background: activeTopic === topic ? "#e8eaf6" : "transparent",
                color: activeTopic === topic ? "#1a237e" : "#444",
                fontWeight: activeTopic === topic ? 700 : 400,
                cursor: "pointer",
                fontSize: "0.9rem",
                marginBottom: 2,
                transition: "all 0.12s",
              }}
            >
              {activeTopic === topic ? "▸ " : ""}{topic}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTopic}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.22 }}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 14,
              padding: "28px 32px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            <h3 style={{ margin: "0 0 6px", color: "#1a237e", fontSize: "1.3rem" }}>{activeTopic}</h3>
            <p style={{ margin: "0 0 20px", color: "#5c6bc0", fontSize: "0.95rem", fontStyle: "italic" }}>
              {current.summary}
            </p>

            <div style={{ color: "#333", fontSize: "0.95rem", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {current.body}
            </div>

            {/* Practice button */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #eee" }}>
              <p style={{ margin: "0 0 12px", fontSize: "0.88rem", color: "#666" }}>
                Ready to apply this skill? The AI will guide you through a practice scenario.
              </p>
              <button
                onClick={handlePractice}
                style={{
                  background: "linear-gradient(135deg, #3f51b5, #5c6bc0)",
                  color: "white",
                  border: "none",
                  padding: "11px 24px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                🎯 Practice: {activeTopic}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
