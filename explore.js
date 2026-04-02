class AIExplorer {
  constructor() {
    this.map3d = document.getElementById('map3d');
    this.places = []; // store AI results
    this.init();
  }

  init() {
  document.getElementById('searchBtn')
    .addEventListener('click', () => this.search());

  document.getElementById('addToJourneyBtn')
    .addEventListener('click', () => this.addToJourney());
}

  async search() {
  const query = document.getElementById('queryInput').value;

  const res = await fetch('/api/explore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  const data = await res.json();

  this.places = data; // ⭐ store here

  this.renderResults(data);
  this.plotOnMap(data);
}

  renderResults(places) {
    const container = document.getElementById('results');
    container.innerHTML = places.map(p =>
      `<div>${p.place}, ${p.country}</div>`
    ).join('');
  }

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
          date: this.generateDate(i),
          description: "AI discovered destination ✨"
        });
      }
    } catch (e) {
      console.error("Geocode failed:", p);
    }
  }

  return hops;
}

  async plotOnMap(places) {
    const geocoder = new google.maps.Geocoder();

    for (let p of places) {
      const res = await geocoder.geocode({ address: `${p.place}, ${p.country}` });

      if (res.results[0]) {
        const loc = res.results[0].geometry.location;

        const marker = document.createElement('gmp-marker-3d');
        marker.position = {
          lat: loc.lat(),
          lng: loc.lng(),
          altitude: 100
        };

        this.map3d.appendChild(marker);
      }
    }
  }
  generateDate(index) {
  const base = new Date();
  base.setDate(base.getDate() - (this.places.length - index));
  return base.toISOString().split('T')[0];
}

async addToJourney() {
  const hops = await this.convertToHops();

  localStorage.setItem('geoHops3D', JSON.stringify(hops));

  alert("Journey created! Redirecting...");

  window.location.href = "/"; // go back to main app
}
}

new AIExplorer();
