import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// CORS – povolíme dohajan.sk aj www.dohajan.sk
app.use(function (req, res, next) {
  const origin = req.headers.origin;

  if (origin === "https://www.dohajan.sk" || origin === "https://dohajan.sk") {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Preflight iba pre endpoint chatu
app.options("/api/chat", function (req, res) {
  res.sendStatus(204);
});

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = String((req.body && req.body.message) || "");

    // Prompt čítame z ENV, aby sa server už nerozbil pri úpravách textu
    const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || "Si Huu – poradca DOHAJAN.";

    // Timeout, nech to nikdy nevisí
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
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

    clearTimeout(timer);

    const data = await response.json();

    if (!response.ok) {
      console.log("OpenAI error:", data);
      return res.status(500).json({ reply: "Prepáč, teraz mám technický problém. Skús to o chvíľu." });
    }

    const reply =
      data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
        ? data.choices[0].message.content
        : "Prepáč, teraz som nedostal odpoveď.";

    res.json({ reply });
  } catch (err) {
    console.log("Server error:", err);
    res.status(500).json({ reply: "Prepáč, práve sa neviem pripojiť. Skús to o chvíľu." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Huu backend beží na porte " + PORT));
