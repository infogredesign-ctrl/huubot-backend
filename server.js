import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ✅ CORS – povolíme dohajan.sk aj www.dohajan.sk
app.use(function (req, res, next) {
  const origin = req.headers.origin;

  if (origin === "https://www.dohajan.sk" || origin === "https://dohajan.sk") {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ⚠️ Preflight len pre /api/chat (nie globálne *)
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = String(req.body.message || "");
    console.log("CHAT:", userMessage);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: process.env.SYSTEM_PROMPT || "Si poradca matracov DOHAJAN." },
          { role: "user", content: userMessage }
        ]
      })
    });

    const data = await response.json();

    res.json({
      reply:
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content
          ? data.choices[0].message.content
          : "Prepáč, teraz som nedostal odpoveď."
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ reply: "Prepáč, nastala technická chyba." });
  }
});

// ✅ Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Huu backend beží na porte", PORT);
});
