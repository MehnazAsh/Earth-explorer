// -------------------------------
// 🔧 Helper: Extract JSON safely
// -------------------------------
function extractJSON(text) {
  try {
    text = text.replace(/```json|```/g, "").trim();

    const match = text.match(/\[[\s\S]*\]/);

    if (match) {
      return JSON.parse(match[0]);
    }
console.error("query extracted");
    throw new Error("No JSON array found");

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

    const { query } = req.body || {};

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
Return ONLY a valid JSON array.
No explanation, no markdown, no text.

Format:
[
  { "place": "City/Place", "country": "Country" }
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

    let rawText =
      genData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("🧠 Raw Gemini:", rawText);

    const places = extractJSON(rawText);
console.error("Failed to extract");
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
