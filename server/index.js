import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
console.log("Using model:", model);

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in environment");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/health", (req, res) => res.send("ok"));

app.post("/api/lesson", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "question is required" });
    }

    const system = `
You are an AI teacher.
Return ONLY valid JSON (no markdown, no extra text).
Schema:
{
  "title": string,
  "segments": [
    { "say": string, "write": string[], "seconds": number }
  ]
}
Rules:
- say: spoken explanation
- write: board lines (math steps only; one step per string)
- seconds: integer 2-8
`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Question: ${question}` },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "empty model response" });
    }

    let data;
    try {
      data = JSON.parse(content);
    } catch (err) {
      console.error("Model returned non-JSON:", content);
      return res.status(500).json({ error: "model returned invalid JSON" });
    }

    return res.json(data);
} catch (e) {
  // OpenAI SDK errors often have: status, message, error (object), cause
  console.error("---- /api/lesson ERROR ----");
  console.error("status:", e?.status);
  console.error("message:", e?.message);
  console.error("error:", e?.error);
  console.error("cause:", e?.cause);
  console.error("full:", e);

  return res.status(500).json({
    error: "failed to generate lesson",
    details: e?.message || "unknown",
  });
}
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server on http://localhost:${port}`));