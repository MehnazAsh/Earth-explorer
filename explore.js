//import SearchHistory from './js/searchHistory.js';
//console.log("SearchHistory import:", SearchHistory);

class AIExplorer {
  constructor() {
    this.places = [];
    this.geohop = null;
    //this.history = new SearchHistory('searchHistory');
    
    this.init();
    
  }

  async init() {
    console.log("🚀 AI Explorer Init");

    // Wait for Google Maps
    await this.waitForMaps();
this.setupEventListeners();
    // Initialize your EXISTING GeoHop engine
    this.geohop = new GeoHop3D({ skipLoad: true });
    // ✅ Pre-fill search box with last query
  const history = JSON.parse(localStorage.getItem('aiSearchHistory') || "[]");
  const lastQuery = history[0]?.query || "";

  const input = document.getElementById('queryInput');
  if (input) input.value = lastQuery;
 const saved = localStorage.getItem('aiExplorePlaces');

  if (saved) {
    this.places = JSON.parse(saved);

    console.log("🔄 Restored previous search:", this.places);

    this.renderResults(this.places);
    
  }
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
    //this.history.render((selected) => {
  //this.restoreSearch(selected);
//});
  }

  



openShareExploreModal() {
const modal = document.getElementById('shareExploreModal');
if (modal) modal.classList.add('active');
// Generate share link
const shareData = btoa(JSON.stringify({
hops: this.hops,
//user: document.getElementById('userName')?.textContent || 'GeoHop User'
}));

const shareUrl = `${window.location.origin}${window.location.pathname}?journey=${shareData}`;
console.log("inside openShareExploreModal, shareUrl:", shareUrl);
const shareLinkEl = document.getElementById('shareExploreLink');
if (shareLinkEl) shareLinkEl.value = shareUrl;
}

closeShareExploreModal() {
const modal = document.getElementById('closeModal');
if (modal) modal.classList.remove('active');
}

copyShareExploreLink() {
const shareLink = document.getElementById('shareExploreLink');
if (shareLink) {
shareLink.select();
document.execCommand('copy');
//this.showNotification('Link copied! 📋', 'success');
}
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
      this.clearPreviousJourney();

      const res = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await res.json();

      console.log("✅ AI Results:", data);

      this.places = data;
  //this.history.save(query, data);
      localStorage.setItem('aiExplorePlaces', JSON.stringify(this.places));
      this.renderResults(data);
      // ✅ Render history UI
//this.history.render((selected) => {
  //this.restoreSearch(selected);
//});

    } catch (err) {
      console.error("❌ Search failed:", err);
      alert("Search failed. Check backend.");
    }
  }
restoreSearch(selected) {
  console.log("🔄 Restoring:", selected.query);

  this.places = selected.results;

  this.renderResults(this.places);
  
}
  clearPreviousJourney() {
  console.log("🧹 Clearing previous journey");

  this.places = [];

  localStorage.removeItem('aiExplorePlaces');

  document.getElementById('results').innerHTML = '';

  // Clear map
  if (this.geohop) {
    this.geohop.clearExistingJourney();
  }
}
  // -----------------------------
  // 🎨 RENDER RESULTS (styled)
  // -----------------------------
  renderResults(places) {
  const container = document.getElementById('results');

  container.innerHTML = places.map((p, i) => `
    <div class="result-card" data-index="${i}">
      <div class="result-rank">#${i + 1}</div>
      <div class="result-content">
        <div class="result-place">${p.place}</div>
        <div class="result-country">${p.country}</div>
      </div>
    </div>
  `).join('');

  // ✅ ADD CLICK LISTENERS
  document.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', async () => {
      const index = parseInt(card.dataset.index);
      const place = this.places[index];

      await this.focusOnPlace(place);
    });
  });
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
            order:i,
            description: "AI discovered destination ✨"
          });
        }

      } catch (err) {
        console.warn("⚠️ Geocode failed:", p);
      }
    }

    return hops;
  }
async focusOnPlace(place) {
  if (!this.geohop || !this.geohop.map3d) return;

  const geocoder = new google.maps.Geocoder();

  try {
    const res = await geocoder.geocode({
      address: `${place.place}, ${place.country}`
    });

    if (!res.results[0]) return;

    const loc = res.results[0].geometry.location;

    // ✅ Same behavior as index.html
    this.geohop.map3d.flyCameraTo({
      endCamera: {
        center: {
          lat: loc.lat(),
          lng: loc.lng(),
          altitude: 100000
        },
        tilt: 20,
        range: 8000000
      },
      durationMillis: 2500
    });

    // ✅ Optional: show overlay like index page
    this.geohop.showHopOverlay({
      city: place.place,
      country: place.country,
      description: "AI suggested destination ✨"
    });

  } catch (err) {
    console.error("❌ Failed to focus on place:", place);
  }
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

    // Inject into GeoHop engine
    this.geohop.hops = hops;

    // Reset existing state
    this.geohop.markers = [];
    //this.geohop.polylines = [];

    // Render using EXISTING engine
    this.geohop.displayHops();
    //this.geohop.updatePolylines();
    this.geohop.updateStats();

    // Add markers
    for (let hop of hops) {
      await this.geohop.addMarker3D(hop);
    }
document.getElementById('shareExplorationBtn').style.display = 'block';
    alert("✅ Journey ready! Click Play ▶");
     
  }
setupEventListeners() {
  // Share functionality
document.getElementById('shareExplorationBtn')?.addEventListener('click', () => this.openShareExploreModal());
document.getElementById('closeExploreModal')?.addEventListener('click', () => this.closeShareExploreModal());
document.getElementById('copyExploreBtn')?.addEventListener('click', () => this.copyShareExploreLink());
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


// INIT
new AIExplorer();
