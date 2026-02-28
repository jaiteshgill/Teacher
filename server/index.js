import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

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
Return JSON with:
- title: string
- segments: array of { say: string, write: string[], seconds: number }
Rules:
- say = what is spoken (explanation)
- write = what goes on the board (math steps only)
- Keep segments short (2–8 seconds).
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Question: ${question}` },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content || "{}";
    const data = JSON.parse(content);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed to generate lesson" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server on http://localhost:${port}`));