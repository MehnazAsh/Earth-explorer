export default async function handler(req, res) {
  try {
    console.log("🔥 API HIT");

    // -------------------------------
    // 🧾 Parse request body
    // -------------------------------
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { query } = body || {};

    //console.log("📥 Query:", query);

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // -------------------------------
    // 🧠 CALL GEMINI (1st attempt)
    // -------------------------------
    const places1 = await callGemini(API_KEY, query);

    let finalPlaces = places1 || [];

    //console.log("🧠 First response count:", finalPlaces.length);

    // -------------------------------
    // 🔁 RETRY if less than 10
    // -------------------------------
    if (finalPlaces.length < 10) {
      console.warn("⚠️ Retrying to get more results...");

      const places2 = await callGemini(API_KEY, `more ${query}`);

      if (places2) {
        finalPlaces = [...finalPlaces, ...places2];
      }
    }

    // -------------------------------
    // 🧹 DEDUPLICATE
    // -------------------------------
    const unique = [];
    const seen = new Set();

    for (let p of finalPlaces) {
      const key = `${p.place}-${p.city}-${p.country}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    }

    finalPlaces = unique;

    // -------------------------------
    // ✂️ LIMIT TO 10
    // -------------------------------
    finalPlaces = finalPlaces.slice(0, 10);
    // ✅ ADD HERE
finalPlaces = finalPlaces.map(p => ({
  place: p.place || "",
  city: p.city || "",
  country: p.country || ""
  //description: p.description || ""
}));

    // -------------------------------
    // 🛟 FALLBACK if still empty
    // -------------------------------
    if (finalPlaces.length === 0) {
      console.warn("⚠️ Using fallback data");
      //alert("⚠️ Uh Oh ! Gemini is experiencing high demand .We're  Using fallback data till in the interim.Please try bac in some time .");
      finalPlaces = getFallback();
    }

    //console.log("✅ FINAL OUTPUT:", finalPlaces);

    return res.status(200).json(finalPlaces);

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);

    return res.status(500).json({
      error: err.message || "Server crashed"
    });
  }
}

// -------------------------------
// 🧠 Gemini Call Helper
// -------------------------------
async function callGemini(API_KEY, query) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
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

IMPORTANT RULES:
- Must return 10 items
- Real places only
- DO NOT return just cities
- Each item MUST be a specific place (landmark, attraction, beach, etc.)
- Include place, city, country
- No explanation outside JSON

STRICT JSON FORMAT:
[
  {
    "place": "Eiffel Tower",
    "city": "Paris",
    "country": "France"
    
  }
]
`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    //console.log("🧠 Gemini raw:", data);

    let rawText = "";

    if (data.candidates?.length) {
      rawText = data.candidates[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("");
    }

    if (!rawText) return null;

    return extractJSON(rawText);

  } catch (err) {
    console.error("❌ Gemini call failed:", err);
    return null;
  }
}

// -------------------------------
// 🧠 JSON Extractor
// -------------------------------
function extractJSON(text) {
  try {
    text = text.replace(/```json|```/g, "").trim();

    const match = text.match(/\[[\s\S]*\]/);

    if (match) {
      return JSON.parse(match[0]);
    }

    // fallback parsing
    const lines = text.split("\n");
    const places = [];

    for (let line of lines) {
      line = line.trim();

      const m1 = line.match(/^\d*\.?\s*(.+),\s*(.+)$/);
      const m2 = line.match(/(.+)\s*\((.+)\)/);

      if (m1) {
        places.push({
  place: m1[1].trim(),
  city: "",
  country: m1[2].trim()
  
});
      } 
      else if (m2) {
       places.push({
  place: m1[1].trim(),
  city: "",
  country: m1[2].trim()
});
      }
    }

    return places.length ? places : null;

  } catch (err) {
    console.error("❌ JSON extraction failed:", text);
    return null;
  }
}

// -------------------------------
// 🌍 Fallback Data
// -------------------------------
function getFallback() {
  function getFallback() {
  return [
    {
      place: "Bali Beaches",
      city: "Bali",
      country: "Indonesia",
      //description: "Tropical beaches with vibrant culture and sunsets"
    },
    {
      place: "Santorini Cliffs",
      city: "Santorini",
      country: "Greece",
      //description: "Whitewashed villages overlooking stunning blue sea"
    },
    {
      place: "Maldives Resorts",
      city: "Male",
      country: "Maldives",
      //description: "Luxury overwater villas in crystal clear waters"
    }
  ];
}
}
