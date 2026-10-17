// Vercel serverless function: proxies prompts to the Anthropic Messages API.
// Env vars: ANTHROPIC_API_KEY (required), ACCESS_CODE (optional; if set, callers must send it).
const crypto = require("crypto");

const ALLOWED = new Set(["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]);
const DEFAULT_MODEL = "claude-sonnet-5-5";

const same = (a, b) => {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const key = process.env.ANTHROPIC_API_KEY;
  const code = process.env.ACCESS_CODE;

  if (req.method === "GET") {
    return res.status(200).json({ configured: !!key, accessCode: !!code });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!key) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY isn’t set on the server. Add it in the Vercel project settings and redeploy.",
      code: "not_configured",
    });
  }
  if (code && !same(req.headers["x-access-code"], code)) {
    return res.status(401).json({ error: "Access code required.", code: "access_code" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = null; }
  }
  if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) {
    return res.status(400).json({ error: "Missing prompt." });
  }
  if (body.prompt.length > 400000) {
    return res.status(413).json({ error: "Prompt too large." });
  }

  const model = ALLOWED.has(body.model) ? body.model : DEFAULT_MODEL;
  const maxTokens = Math.min(Math.max(parseInt(body.maxTokens, 10) || 8000, 256), 12000);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: body.prompt }],
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (j.error && j.error.message) || "Anthropic API error " + r.status;
      if (r.status === 429) return res.status(429).json({ error: msg, code: "rate_limited" });
      return res.status(502).json({ error: msg, code: "upstream" });
    }
    const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    if (!text) return res.status(502).json({ error: "Empty answer from Claude.", code: "empty" });
    return res.status(200).json({ text, stopReason: j.stop_reason, model: j.model || model });
  } catch (e) {
    return res.status(502).json({ error: "Couldn’t reach the Anthropic API.", code: "network" });
  }
};
