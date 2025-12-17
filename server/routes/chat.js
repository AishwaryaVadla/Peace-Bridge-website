import express from "express";
import OpenAI from "openai";

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// A Peace Bridge “system instruction” that makes it interactive + specialized
const INSTRUCTIONS = `
You are Peace Bridge, a calm conflict-resolution mediator.
Goals:
- Do NOT answer in long paragraphs.
- Ask ONE question at a time.
- Provide guidance in small steps.
- Tailor responses to the user’s specific details.
- If user asks "what script?", produce a short message they can send.

Style:
- 2–5 short lines max per turn.
- Use bullet points sparingly (max 2 bullets).
- Empathetic, non-judgmental.
`;

// JSON schema to prevent rambling
const RESPONSE_SCHEMA = {
  name: "peace_bridge_reply",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      assistant_message: { type: "string" },
      one_question: { type: "string" },
      next_steps: {
        type: "array",
        items: { type: "string" },
        maxItems: 2
      },
      script: { type: "string" }
    },
    required: ["assistant_message", "one_question", "next_steps", "script"]
  }
};

router.post("/", async (req, res) => {
  try {
    const { messages } = req.body; // [{role:"user"|"assistant", content:"..."}]

    const response = await client.responses.create({
      model: "gpt-5",
      reasoning: { effort: "low" },
      instructions: INSTRUCTIONS,
      input: messages,
      // Structured output keeps it concise and consistent:
      output: [
        {
          type: "json_schema",
          json_schema: RESPONSE_SCHEMA
        }
      ],
    });

    // Output text will be JSON string with the schema above
    const data = JSON.parse(response.output_text);

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chat service error" });
  }
});

export default router;
