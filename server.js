import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

/**
 * CORS – povolíme konkrétne originy + OPTIONS preflight
 * (TOTO ti teraz padalo na woodcrafters.flox.sk)
 */
const ALLOWED_ORIGINS = new Set([
  "https://www.dohajan.sk",
  "https://dohajan.sk",
  "https://woodcrafters.flox.sk",
  "https://www.woodcrafters.flox.sk"
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Povoliť iba whitelisted originy
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // dôležité pre cache proxy
  res.setHeader("Vary", "Origin");

  // CORS hlavičky (pre POST fetch)
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Preflight odpoveď
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/**
 * POST /api/chat
 */
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = String(req.body?.message ?? "").trim();

    if (!userMessage) {
      return res.status(400).json({ reply: "Napíš mi prosím správu a poradím ti. 🙂" });
    }

    // Prompt z ENV
    const SYSTEM_PROMPT =
      process.env.SYSTEM_PROMPT ||
      "Si Huu – poradca DOHAJAN. Odpovedaj po slovensky, stručne, vecne a odporuč konkrétne produkty z DOHAJAN s linkami, ak sú známe.";

    // Timeout – nech request nikdy nevisí
    const controller = new AbortController();
    const timeoutMs = 20000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // ✅ Native fetch (Node 18+)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ]
      })
    });

    clearTimeout(timer);

    // Ak OpenAI vráti ne-JSON, nech to nespadne
    const raw = await response.text();
    let data = null;
    try { data = JSON.parse(raw); } catch { data = null; }

    if (!response.ok) {
      console.log("OpenAI error status:", response.status);
      console.log("OpenAI error body:", raw);
      return res
        .status(500)
        .json({ reply: "Prepáč, teraz mám technický problém. Skús to o chvíľu." });
    }

    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Prepáč, teraz som nedostal odpoveď.";

    return res.json({ reply });
  } catch (err) {
    console.log("Server error:", err?.name || err, err?.message || "");
    return res
      .status(500)
      .json({ reply: "Prepáč, práve sa neviem pripojiť. Skús to o chvíľu." });
  }
});

// Healthcheck (užitočné na Render)
app.get("/", (req, res) => res.send("Huu backend beží ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Huu backend beží na porte " + PORT));
