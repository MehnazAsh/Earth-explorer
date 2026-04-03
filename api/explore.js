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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
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
Give top 10 travel destinations for: "${query}".

Return ONLY JSON in this format:
[
  { "place": "City/Place", "country": "Country" }
]
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

    // Clean Gemini response (remove markdown if present)
    rawText = rawText.replace(/```json|```/g, "").trim();

    let places;

    try {
      places = JSON.parse(rawText);
    } catch (e) {
      console.error("❌ JSON parse failed:", rawText);

      // fallback (so frontend doesn’t break)
      return res.status(200).json([
        { place: "Bali", country: "Indonesia" },
        { place: "Santorini", country: "Greece" }
      ]);
    }

    // -------------------------------
    // 🧠 AGENT 2: Verify places
    // -------------------------------
    const verifyResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
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
Verify this list of places is real and valid:

${JSON.stringify(places)}

Return ONLY valid JSON in same format.
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

    verifiedText = verifiedText.replace(/```json|```/g, "").trim();

    let verifiedPlaces;

    try {
      verifiedPlaces = JSON.parse(verifiedText);
    } catch (e) {
      console.warn("⚠️ Verification fallback used");
      verifiedPlaces = places;
    }

    // -------------------------------
    // ✅ FINAL RESPONSE
    // -------------------------------
    return res.status(200).json(verifiedPlaces);

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);

    return res.status(500).json({
      error: err.message || "Server crashed"
    });
  }
}
