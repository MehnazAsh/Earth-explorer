class AIExplorer {
  constructor() {
    this.places = [];
    this.hops = [];
    this.map3d = null;
    this.polylines = [];
    this.isPlaying = false;

    this.init();
  }

  async init() {
    await this.initMap();

    document.getElementById('searchBtn')
      .addEventListener('click', () => this.search());

    document.getElementById('createJourneyBtn')
      .addEventListener('click', () => this.createJourney());

    document.getElementById('playBtn')
      .addEventListener('click', () => this.play());

    document.getElementById('pauseBtn')
      .addEventListener('click', () => this.pause());

    document.getElementById('resetBtn')
      .addEventListener('click', () => this.reset());
  }

  async initMap() {
    await new Promise(resolve => {
      const check = () => {
        if (window.google && google.maps) resolve();
        else setTimeout(check, 100);
      };
      check();
    });

    await google.maps.importLibrary("maps3d");

    this.map3d = document.getElementById('map3d');

    this.map3d.center = { lat: 20, lng: 0, altitude: 15000000 };
    this.map3d.range = 15000000;
  }

  // -------------------------------
  // 🔍 SEARCH
  // -------------------------------
  async search() {
    const query = document.getElementById('queryInput').value;

    const res = await fetch('/api/explore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();

    this.places = data;

    this.renderResults(data);
  }

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

  // -------------------------------
  // ✈️ CREATE JOURNEY
  // -------------------------------
  async createJourney() {
    if (!this.places.length) {
      alert("Search first!");
      return;
    }

    const geocoder = new google.maps.Geocoder();

    this.hops = [];
    this.clearMap();

    for (let i = 0; i < this.places.length; i++) {
      const p = this.places[i];

      const res = await geocoder.geocode({
        address: `${p.place}, ${p.country}`
      });

      if (res.results[0]) {
        const loc = res.results[0].geometry.location;

        const hop = {
          lat: loc.lat(),
          lng: loc.lng(),
          city: p.place,
          country: p.country
        };

        this.hops.push(hop);

        // marker
        const marker = document.createElement('gmp-marker-3d');
        marker.position = {
          lat: hop.lat,
          lng: hop.lng,
          altitude: 100
        };

        marker.addEventListener('click', () => this.showOverlay(hop));

        this.map3d.appendChild(marker);
      }
    }

    this.drawPolylines();

    alert("Journey ready! Click ▶ Play");
  }

  // -------------------------------
  // 🌉 DRAW CURVED PATHS
  // -------------------------------
  drawPolylines() {
    this.polylines.forEach(p => p.remove());
    this.polylines = [];

    if (this.hops.length < 2) return;

    for (let i = 0; i < this.hops.length - 1; i++) {
      const path = this.generateCurve(this.hops[i], this.hops[i + 1]);

      const polyline = document.createElement('gmp-polyline-3d');
      polyline.coordinates = path;
      polyline.strokeColor = "#667eea";
      polyline.strokeWidth = 4;

      this.map3d.appendChild(polyline);
      this.polylines.push(polyline);
    }
  }

  generateCurve(start, end) {
    const points = [];
    const steps = 30;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;

      const lat = start.lat + (end.lat - start.lat) * t;
      const lng = start.lng + (end.lng - start.lng) * t;

      const altitude = 300000 * 4 * t * (1 - t);

      points.push({ lat, lng, altitude });
    }

    return points;
  }

  // -------------------------------
  // 🎬 PLAY JOURNEY
  // -------------------------------
  async play() {
    if (!this.hops.length) return;

    this.isPlaying = true;

    for (let hop of this.hops) {
      if (!this.isPlaying) break;

      this.showOverlay(hop);

      await this.map3d.flyCameraTo({
        endCamera: {
          center: { lat: hop.lat, lng: hop.lng, altitude: 100000 },
          range: 5000000,
          tilt: 30
        },
        durationMillis: 3000
      });

      await new Promise(r => setTimeout(r, 1500));
    }
  }

  pause() {
    this.isPlaying = false;
  }

  reset() {
    this.isPlaying = false;

    this.map3d.flyCameraTo({
      endCamera: {
        center: { lat: 20, lng: 0, altitude: 0 },
        range: 15000000,
        tilt: 0
      },
      durationMillis: 2000
    });
  }

  // -------------------------------
  // 📍 OVERLAY (CITY POPUP)
  // -------------------------------
  showOverlay(hop) {
    const existing = document.querySelector('.hop-overlay');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'hop-overlay';

    el.innerHTML = `
      <div style="
        position:fixed;
        top:100px;
        left:50%;
        transform:translateX(-50%);
        background:black;
        color:white;
        padding:15px 25px;
        border-radius:10px;
        font-size:18px;
        z-index:9999;
      ">
        📍 <strong>${hop.city}</strong><br/>
        ${hop.country}
      </div>
    `;

    document.body.appendChild(el);

    setTimeout(() => el.remove(), 3000);
  }

  // -------------------------------
  // 🧹 CLEAR MAP
  // -------------------------------
  clearMap() {
    this.map3d.innerHTML = "";
  }
}

new AIExplorer();
