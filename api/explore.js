export default async function handler(req, res) {
   console.log("🔥 API HIT");

  let body = req.body;

    // 🔥 Fix for Vercel parsing
    if (!body) {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(JSON.parse(data)));
      });
    }

    console.log("Body:", body);
  const { query } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  // -------- Agent 1: Discovery --------
  const discoveryPrompt = `
  Give top 10 results for: "${query}"
  Return ONLY JSON like:
  [
    { "place": "...", "country": "..." }
  ]
  `;

  const discovery = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: discoveryPrompt }] }]
      })
    }
  );

  const discoveryData = await discovery.json();
  const rawText = discoveryData.candidates[0].content.parts[0].text;

  // -------- Agent 2: Verification --------
  const verifyPrompt = `
  Clean and verify this list. Keep only real places.
  Return same JSON format:
  ${rawText}
  `;

  const verify = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: verifyPrompt }] }]
      })
    }
  );

  const verifyData = await verify.json();
  const finalText = verifyData.candidates[0].content.parts[0].text;

  try {
    const parsed = JSON.parse(finalText);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: "Parsing failed", raw: finalText });
  }
}




