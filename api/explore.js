export default async function handler(req, res) {
  try {
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

    const { query } = body;

    // TEMP: return dummy data
    return res.status(200).json([
      { place: "Bali", country: "Indonesia" },
      { place: "Santorini", country: "Greece" },
      { place: "Maui", country: "USA" }
    ]);

  } catch (err) {
    console.error("❌ ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
