export default async function handler(req, res) {
  try {
    console.log("🔥 API HIT");

    // ✅ Vercel already parses JSON body
    const { query } = req.body || {};

    console.log("Query:", query);

    // ✅ TEMP: return static data (test pipeline)
    return res.status(200).json([
      { place: "Bali", country: "Indonesia" },
      { place: "Santorini", country: "Greece" },
      { place: "Maui", country: "USA" }
    ]);

  } catch (err) {
    console.error("❌ ERROR:", err);
    return res.status(500).json({
      error: err.message || "Server crashed"
    });
  }
}
