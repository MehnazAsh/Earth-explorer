// -------------------------------
// 🔧 Helper: Extract JSON safely
// -------------------------------
function extractJSON(text) {
  try {
    console.log("inside extractJSON");

    text = text.replace(/```json|```/g, "").trim();
    console.log("clean text:", text);

    // ✅ Try normal JSON first
    const match = text.match(/\[[\s\S]*\]/);

    if (match) {
      console.log("✅ JSON detected");
      return JSON.parse(match[0]);
    }

    // 🚨 Fallback: parse plain text list
    console.log("⚠️ No JSON found, using fallback parsing");

    const lines = text.split("\n");

    const places = [];

    for (let line of lines) {
      line = line.trim();

      // Match: "1. Bali, Indonesia" OR "Bali (Indonesia)"
      const match1 = line.match(/^\d*\.?\s*(.+),\s*(.+)$/);
      const match2 = line.match(/(.+)\s*\((.+)\)/);

      if (match1) {
        places.push({
          place: match1[1].trim(),
          country: match1[2].trim()
        });
      } else if (match2) {
        places.push({
          place: match2[1].trim(),
          country: match2[2].trim()
        });
      }
    }

    if (places.length > 0) {
      console.log("✅ Fallback parsed:", places);
      return places;
    }

    throw new Error("No valid format found");

  } catch (err) {
    console.error("❌ JSON extraction failed:", text);
    return null;
  }
}


// -------------------------------
// 🚀 API Handler
// -------------------------------
export default async function handler(req, res) {
  try {
    console.log("🔥 API HIT");

    let body = req.body;

// 🔧 Handle Vercel raw body (string case)
if (typeof body === "string") {
  try {
    body = JSON.parse(body);
  } catch (e) {
    console.error("❌ Failed to parse body");
    body = {};
  }
}
console.log("📥 Incoming body:", body);
const { query } = body || {};

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // -------------------------------
    // 🧠 AGENT 1: Generate places
    // -------------------------------
    const genResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You MUST return ONLY valid JSON.

Do NOT include:
- any explanation
- any text before or after
- markdown formatting

Return EXACTLY this format:

[
  { "place": "Bali", "country": "Indonesia" },
  { "place": "Santorini", "country": "Greece" }
]

Query: ${query}
`
                }
              ]
            }
          ]
        })
      }
    );

    const genData = await genResponse.json();
console.log("Response from gemini", genData);
    let rawText =
      genData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("🧠 Raw Gemini:", rawText);

    const places = extractJSON(rawText);

    if (!places) {
      console.warn("⚠️ Using fallback (generation failed)");
      return res.status(200).json([
        { place: "Bali", country: "Indonesia" },
        { place: "Santorini", country: "Greece" }
      ]);
    }

    // -------------------------------
    // 🧠 AGENT 2: Verify places
    // -------------------------------
    const verifyResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
Verify this list contains real places.
Fix any incorrect ones.

Return ONLY valid JSON array in same format.

${JSON.stringify(places)}
                  `
                }
              ]
            }
          ]
        })
      }
    );

    const verifyData = await verifyResponse.json();

    let verifiedText =
      verifyData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("🔍 Verified Raw:", verifiedText);

    const verifiedPlaces = extractJSON(verifiedText) || places;

    // -------------------------------
    // ✅ FINAL RESPONSE
    // -------------------------------
    console.log("✅ FINAL OUTPUT:", verifiedPlaces);

    return res.status(200).json(verifiedPlaces);

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);

    return res.status(500).json({
      error: err.message || "Server crashed"
    });
  }
}
