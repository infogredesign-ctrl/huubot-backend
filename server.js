import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const SYSTEM_PROMPT = `
SEM VLOŽ CELÝ HUu PROMPT
(bez zmeny, bez úprav)
`;

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Prepáč, nastala technická chyba." });
  }
});

app.listen(3000, () => {
  console.log("Huu backend beží");
});
