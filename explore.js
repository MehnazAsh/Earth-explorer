class AIExplorer {
  constructor() {
    this.places = [];
    this.geohop = null;
    this.init();
  }

  async init() {
    console.log("🚀 AI Explorer Init");

    // Wait for Google Maps
    await this.waitForMaps();

    // Initialize your EXISTING GeoHop engine
    this.geohop = new GeoHop3D({ skipLoad: true });

    // Hook buttons
    document.getElementById('searchBtn')
      ?.addEventListener('click', () => this.search());

    document.getElementById('createJourneyBtn')
      ?.addEventListener('click', () => this.createJourney());

    document.getElementById('playBtn')
      ?.addEventListener('click', () => this.geohop.playJourney());

    document.getElementById('pauseBtn')
      ?.addEventListener('click', () => this.geohop.pauseJourney());

    document.getElementById('resetBtn')
      ?.addEventListener('click', () => this.geohop.resetJourney());
  }


  // -----------------------------
  // WAIT FOR MAPS
  // -----------------------------
  waitForMaps() {
    return new Promise(resolve => {
      const check = () => {
        if (window.google && google.maps) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  // -----------------------------
  // 🔍 SEARCH (calls backend)
  // -----------------------------
  async search() {
    const query = document.getElementById('queryInput').value;

    if (!query) {
      alert("Enter a search query");
      return;
    }

    console.log("🔍 Searching:", query);

    try {
      const res = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await res.json();

      console.log("✅ AI Results:", data);

      this.places = data;

      this.renderResults(data);

    } catch (err) {
      console.error("❌ Search failed:", err);
      alert("Search failed. Check backend.");
    }
  }

  // -----------------------------
  // 🎨 RENDER RESULTS (styled)
  // -----------------------------
  renderResults(places) {
    const container = document.getElementById('results');

    container.innerHTML = places.map((p, i) => `
      <div class="result-card">
        <div class="result-rank">#${i + 1}</div>
        <div class="result-content">
          <div class="result-place">${p.place}</div>
          <div class="result-country">${p.country}</div>
        </div>
      </div>
    `).join('');
  }

  // -----------------------------
  // 🌍 CONVERT AI → HOPS
  // -----------------------------
  async convertToHops() {
  const geocoder = new google.maps.Geocoder();
  const hops = [];

  for (let i = 0; i < this.places.length; i++) {
    const p = this.places[i];

    try {
      const res = await geocoder.geocode({
        address: `${p.place}, ${p.country}`
      });

      if (res.results[0]) {
        const loc = res.results[0].geometry.location;

        hops.push({
          id: Date.now() + i,
          city: p.place,
          country: p.country,
          lat: loc.lat(),
          lng: loc.lng(),
          altitude: 100,
          order: i, // ✅ KEY FIX (AI order)
          description: "AI discovered destination ✨"
        });
      }

    } catch (err) {
      console.warn("⚠️ Geocode failed:", p);
    }
  }

  return hops;
}

  // -----------------------------
  // ✈️ CREATE JOURNEY (KEY PART)
  // -----------------------------
  async createJourney() {
  if (!this.places.length) {
    alert("Search first!");
    return;
  }

  console.log("✈️ Creating journey...");

  const hops = await this.convertToHops();

  // ✅ HARD RESET (VERY IMPORTANT)
  this.geohop.clearExistingJourney();

  // ✅ SET CLEAN DATA
  this.geohop.hops = hops;

  // ✅ Render UI FIRST
  this.geohop.displayHops();
  this.geohop.updateStats();

  // ✅ Add markers SEQUENTIALLY (avoid race issues)
  for (let i = 0; i < hops.length; i++) {
    await this.geohop.addMarker3D(hops[i]);
  }

  // ✅ Draw lines AFTER markers
  this.geohop.updatePolylines();
this.showClearButton(); // ✅ switch button
  console.log("✅ Final hops:", this.geohop.hops);

  alert("✅ Journey ready! Click Play ▶");
}
showCreateButton() {
  const btn = document.getElementById('createJourneyBtn');
  if (!btn) return;

  btn.classList.remove('hidden');
  btn.textContent = "Create Journey ✈️";
  btn.onclick = () => this.createJourney();
}

showClearButton() {
  const btn = document.getElementById('createJourneyBtn');
  if (!btn) return;

  btn.classList.remove('hidden');
  btn.textContent = "Clear Previous Journey ❌";
  btn.onclick = () => this.clearJourney();
}
  // -----------------------------
  // 📅 AUTO DATE GENERATION
  // -----------------------------
  generateDate(index) {
    const base = new Date();
    base.setDate(base.getDate() - (this.places.length - index));
    return base.toISOString().split('T')[0];
  }
}
clearJourney() {
  console.log("🧹 Clearing journey...");

  // Clear GeoHop state
  this.geohop.clearExistingJourney();
  this.geohop.displayHops();
  this.geohop.updatePolylines();
  this.geohop.updateStats();

  // Clear stored AI data
  localStorage.removeItem('aiExplorePlaces');

  // Clear UI
  document.getElementById('results').innerHTML = "";

  this.places = [];

  // Hide button again
  document.getElementById('createJourneyBtn').classList.add('hidden');

  alert("Journey cleared!");
}

// INIT
new AIExplorer();
