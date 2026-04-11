// GeoHop 3D Application - Fixed Version with Proper 3D Library Loading
class GeoHop3D {
constructor(options = {}) {
this.skipLoad = options.skipLoad || false;
this.zoomConfig = {
    default: 9000000,
    sameCountry: 4000000,
    differentCountry: 8000000,
    ...options.zoomConfig
  };
this.map3d = null;
this.hops = [];
this.markers = [];
this.polylines = [];
this.labels = [];
this.animatedLines = [];
this.isPlaying = false;
this.isRotating = false;
this.playSpeed = 1;
this.currentHopIndex = 0;
this.rotationInterval = null;
this.playInterval = null;
this.animationFrames = [];
this.maps3dLibrary = null;
this.init();
}

async init() {
try {
console.log('Starting GeoHop initialization...');
// Wait for Google Maps to load
await this.waitForMaps();
// Initialize 3D map
await this.initMap3D();
// Setup event listeners
this.setupEventListeners();
const hasSharedJourney = window.location.search.includes('journey=');

  if (hasSharedJourney) {
    this.loadHops(); }
// Load saved data
if (!this.skipLoad) {
  this.loadHops();
}
// Set date constraints
this.setDateConstraints();
console.log('GeoHop initialization complete!');
} catch (error) {
console.error('Initialization error:', error);
this.showNotification('Failed to initialize. Please check console for details.', 'error');
}
}

waitForMaps() {
return new Promise((resolve, reject) => {
let attempts = 0;
const maxAttempts = 50;
const checkMaps = () => {
attempts++;
if (window.google && window.google.maps) {
console.log('Google Maps loaded successfully');
resolve();
} else if (attempts >= maxAttempts) {
reject(new Error('Google Maps failed to load'));
} else {
setTimeout(checkMaps, 100);
}
};
checkMaps();
});
}

async initMap3D() {
try {
console.log('Loading maps3d library...');
// Import the maps3d library
this.maps3dLibrary = await google.maps.importLibrary("maps3d");
console.log('maps3d library loaded:', this.maps3dLibrary);
// Get the map element
this.map3d = document.getElementById('map3d');
if (!this.map3d) {
throw new Error('Map element not found');
}
// Check if the element is already initialized
if (!this.map3d.center) {
console.log('Setting initial map properties...');
// Set initial view
this.map3d.center = { lat: 20, lng: -10, altitude: 15000000 };
this.map3d.range = 15000000;
this.map3d.tilt = 0;
this.map3d.heading = 0;
}
// Add custom CSS for labels
this.addLabelStyles();
console.log('Map initialization complete');
} catch (error) {
console.error('Error initializing 3D map:', error);
// Try alternative initialization
await this.alternativeInit();
}
}

async alternativeInit() {
console.log('Trying alternative initialization...');
try {
// Check if maps3d is available directly
if (google.maps.maps3d) {
this.maps3dLibrary = google.maps.maps3d;
console.log('Found maps3d directly');
} else {
// Try to load it differently
const libraries = await google.maps.importLibrary("maps3d");
this.maps3dLibrary = libraries;
}
// Get the map element
this.map3d = document.getElementById('map3d');
// Wait for the element to be ready
await new Promise(resolve => setTimeout(resolve, 1000));
console.log('Alternative initialization successful');
} catch (error) {
console.error('Alternative initialization failed:', error);
this.showNotification('3D Maps not available. Some features may be limited.', 'warning');
}
}

addLabelStyles() {
const style = document.createElement('style');
style.textContent = `
.hop-label-3d {
position: absolute;
background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
color: white;
padding: 12px 20px;
border-radius: 25px;
font-size: 16px;
font-weight: bold;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
z-index: 1000;
transform: translate(-50%, -150%);
white-space: nowrap;
animation: labelPulse 2s ease-in-out infinite;
border: 2px solid rgba(255, 255, 255, 0.3);
backdrop-filter: blur(10px);
}
.hop-label-3d::after {
content: '';
position: absolute;
bottom: -8px;
left: 50%;
transform: translateX(-50%);
width: 0;
height: 0;
border-left: 10px solid transparent;
border-right: 10px solid transparent;
border-top: 10px solid rgba(118, 75, 162, 0.95);
}
@keyframes labelPulse {
0%, 100% { transform: translate(-50%, -150%) scale(1); }
50% { transform: translate(-50%, -150%) scale(1.05); }
}
.hop-info-overlay {
position: fixed;
top: 100px;
left: 50%;
transform: translateX(-50%);
background: rgba(0, 0, 0, 0.8);
color: white;
padding: 20px 30px;
border-radius: 15px;
font-size: 24px;
z-index: 2000;
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.2);
animation: slideDown 0.5s ease;
}
@keyframes slideDown {
from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
to { transform: translateX(-50%) translateY(0); opacity: 1; }
}
`;
document.head.appendChild(style);
}

setupEventListeners() {
    document.getElementById('closePhotos')?.addEventListener('click', () => {
  document.getElementById('photoViewer').classList.add('hidden');
});

// Form submission
const form = document.getElementById('addHopForm');
if (form) {
form.addEventListener('submit', (e) => {
e.preventDefault();
this.addHop();
});
}
// Control buttons
document.getElementById('playBtn')?.addEventListener('click', () => this.playJourney());
document.getElementById('pauseBtn')?.addEventListener('click', () => this.pauseJourney());
document.getElementById('resetBtn')?.addEventListener('click', () => this.resetJourney());
document.getElementById('rotateBtn')?.addEventListener('click', () => this.toggleRotation());
document.getElementById('speedBtn')?.addEventListener('click', () => this.toggleSpeed());
// Sidebar toggle
document.getElementById('toggleSidebar')?.addEventListener('click', () => {
document.getElementById('sidebar')?.classList.toggle('collapsed');
});
// Share functionality
document.getElementById('shareBtn')?.addEventListener('click', () => this.openShareModal());
document.getElementById('closeModal')?.addEventListener('click', () => this.closeShareModal());
document.getElementById('copyBtn')?.addEventListener('click', () => this.copyShareLink());
// Social share buttons
// document.getElementById('shareWhatsApp')?.addEventListener('click', () => this.shareOnWhatsApp());
// document.getElementById('shareTwitter')?.addEventListener('click', () => this.shareOnTwitter());
// document.getElementById('shareFacebook')?.addEventListener('click', () => this.shareOnFacebook());
// View mode toggle
document.getElementById('viewModeBtn')?.addEventListener('click', () => this.toggleViewMode());
// Keyboard shortcuts
this.setupKeyboardShortcuts();
}

 readPhotos(files) {
    return Promise.all(
      [...files].map(file =>
        new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(file);
        })
      )
    );
  }

setupKeyboardShortcuts() {
document.addEventListener('keydown', (e) => {
// Spacebar to play/pause
if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
e.preventDefault();
if (this.isPlaying) {
this.pauseJourney();
} else {
this.playJourney();
}
}
// R for rotation
if (e.key === 'r' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
this.toggleRotation();
}
// Arrow keys for manual navigation
if (!this.isPlaying) {
if (e.key === 'ArrowLeft') {
this.navigateHop(-1);
} else if (e.key === 'ArrowRight') {
this.navigateHop(1);
}
}
});
}

async addHop() {
const city = document.getElementById('city').value.trim();
const country = document.getElementById('country').value.trim();
//const date = document.getElementById('date').value;
const description = document.getElementById('description').value.trim();
if (!city || !country) {
this.showNotification('Please fill in all required fields', 'error');
return;
}
// Show loading
this.showLoading(true);
try {
// Geocode the location
const geocoder = new google.maps.Geocoder();
const response = await new Promise((resolve, reject) => {
geocoder.geocode({ address: `${city}, ${country}` }, (results, status) => {
if (status === 'OK' && results[0]) {
resolve(results[0]);
} else {
reject(new Error('Location not found'));
}
});
});
const location = response.geometry.location;

const photoInput = document.getElementById('photos');
let photos = [];

if (photoInput?.files.length) {
  if (photoInput.files.length > 5) {
    this.showNotification('You can upload up to 5 photos only', 'error');
    return;
  }
  photos = await this.readPhotos(photoInput.files);
}

const hop = {
  id: Date.now(),
  city,
  country,
  lat: location.lat(),
  lng: location.lng(),
  altitude: 100,
  order: this.hops.length, // 👈 NEW
  description,
  photos
};
  console.log(hop);
this.hops.unshift(hop);
this.saveHops();
this.displayHops();
await this.addMarker3D(hop);
//this.updatePolylines();
this.updateStats();
this.clearForm();
// Animate to the new hop
this.animateToHop(hop);
this.showNotification(`Added ${city}, ${country} to your journey!`, 'success');
} catch (error) {
console.error('Error adding hop:', error);
this.showNotification('Could not find location. Please try again.', 'error');
} finally {
this.showLoading(false);
}
}

async addMarker3D(hop) {
try {
// Check if we have the 3D library
if (this.maps3dLibrary && this.maps3dLibrary.Marker3DElement) {
// Use the new 3D marker
const Marker3DElement = this.maps3dLibrary.Marker3DElement;
  console.log("inside addmarker3D", hop);
const marker = new Marker3DElement({
position: { lat: hop.lat, lng: hop.lng, altitude: hop.altitude },
altitudeMode: 'RELATIVE_TO_GROUND',
extruded: true,
label: `📍 ${hop.city}`,
collisionBehavior: 'OPTIONAL_AND_HIDES_LOWER_PRIORITY'
});
// Add click listener
marker.addEventListener('gmp-click', () => {
this.focusOnHop(hop);
});
this.map3d.appendChild(marker);
this.markers.push({ element: marker, hopId: hop.id, hop: hop });
return marker;
} else {
// Fallback: Create a custom marker element
console.log('Using fallback marker creation');
const marker = document.createElement('gmp-marker-3d');
marker.position = { lat: hop.lat, lng: hop.lng, altitude: hop.altitude };
marker.altitudeMode = 'RELATIVE_TO_GROUND';
marker.extruded = true;
marker.label = `📍 ${hop.city}`;
// Add click listener
marker.addEventListener('click', () => {
this.focusOnHop(hop);
});
this.map3d.appendChild(marker);
this.markers.push({ element: marker, hopId: hop.id, hop: hop });
return marker;
}
} catch (error) {
console.error('Error adding marker:', error);
// Ultimate fallback: just store the hop data
this.markers.push({ hopId: hop.id, hop: hop, element: null });
}
}

// openPhotoViewer(photos) {
//   this.currentPhotoIndex = 0;
//   this.photos = photos;

//   const viewer = document.getElementById('photoViewer');
//   const track = document.getElementById('photoTrack');
//   track.innerHTML = photos.map(src => `<img src="${src}" />`).join('');

//   viewer.classList.remove('hidden');
//   this.updatePhotoPosition();

//   // Touch swipe
//   let startX = 0;
//   viewer.ontouchstart = e => startX = e.touches[0].clientX;
//   viewer.ontouchend = e => {
//     const diff = e.changedTouches[0].clientX - startX;
//     if (diff > 50) this.prevPhoto();
//     if (diff < -50) this.nextPhoto();
//   };
// }

// updatePhotoPosition() {
//   const track = document.getElementById('photoTrack');
//   track.style.transform = `translateX(-${this.currentPhotoIndex * 100}vw)`;
// }

// nextPhoto() {
//   if (this.currentPhotoIndex < this.photos.length - 1) {
//     this.currentPhotoIndex++;
//     this.updatePhotoPosition();
//   }
// }

// prevPhoto() {
//   if (this.currentPhotoIndex > 0) {
//     this.currentPhotoIndex--;
//     this.updatePhotoPosition();
//   }
// }


// Show city/country overlay when focusing
showHopOverlay(hop) {
// Remove any existing overlay
  console.log("I am inside showhopoverlay", hop, hop.city);
const existingOverlay = document.querySelector('.hop-info-overlay');
if (existingOverlay) {
existingOverlay.remove();
}
const overlay = document.createElement('div');
overlay.className = 'hop-info-overlay';
overlay.innerHTML = `
<div style="text-align: center;">
<div style="font-size: 32px; margin-bottom: 10px;">📍</div>
<div style="font-size: 28px; font-weight: bold; margin-bottom: 5px;">${hop.city}</div>
<div style="font-size: 20px; opacity: 0.8; margin-bottom: 10px;">${hop.country}</div>

${hop.description ? `<div style="font-size: 14px; margin-top: 10px; font-style: italic;">"${hop.description}"</div>` : ''}
</div>
`;
document.body.appendChild(overlay);
// Auto-remove after a few seconds
setTimeout(() => {
overlay.style.animation = 'slideDown 0.5s ease reverse';
setTimeout(() => overlay.remove(), 500);
}, 4000);
}

// updatePolylines() {
// try {
// // Clear existing polylines
// this.polylines.forEach(polyline => {
// try {
// polyline.remove();
// } catch (e) {
// // Ignore removal errors
// }
// });
// this.polylines = [];
// if (this.hops.length < 2) return;
// // Sort hops by date
// const sortedHops = [...this.hops].sort((a, b) => a.order - b.order);
// // Check if we have the 3D library
// if (this.maps3dLibrary && this.maps3dLibrary.Polyline3DElement) {
// const Polyline3DElement = this.maps3dLibrary.Polyline3DElement;
// // Create polylines between consecutive hops
// for (let i = 0; i < sortedHops.length - 1; i++) {
// const startHop = sortedHops[i];
// const endHop = sortedHops[i + 1];
// // Generate curved path points
// const curvedPath = this.generateCurvedPath(startHop, endHop);
// try {
// // Create main arc polyline
// const arcPolyline = new Polyline3DElement({
// coordinates: curvedPath,
// altitudeMode: 'RELATIVE_TO_GROUND',
// strokeColor: '#667eea',
// strokeWidth: 4,
// geodesic: false,
// strokeOpacity: 0.8
// });
// this.map3d.appendChild(arcPolyline);
// this.polylines.push(arcPolyline);
// } catch (e) {
// console.error('Error creating polyline:', e);
// }
// }
// } else {
// // Fallback: Create custom polyline elements
// console.log('Using fallback polyline creation');
// for (let i = 0; i < sortedHops.length - 1; i++) {
// const startHop = sortedHops[i];
// const endHop = sortedHops[i + 1];
// const polyline = document.createElement('gmp-polyline-3d');
// polyline.coordinates = [
// { lat: startHop.lat, lng: startHop.lng, altitude: 50000 },
// { lat: endHop.lat, lng: endHop.lng, altitude: 50000 }
// ];
// polyline.altitudeMode = 'RELATIVE_TO_GROUND';
// polyline.strokeColor = '#667eea';
// polyline.strokeWidth = 4;
// this.map3d.appendChild(polyline);
// this.polylines.push(polyline);
// }
// }
// } catch (error) {
// console.error('Error updating polylines:', error);
// }
// }

// Generate curved path between two hops
generateCurvedPath(startHop, endHop) {
const numPoints = 30;
const path = [];
const distance = this.calculateDistance(startHop, endHop);
const maxAltitude = Math.min(distance * 500, 500000);
for (let i = 0; i <= numPoints; i++) {
const t = i / numPoints;
const lat = startHop.lat + (endHop.lat - startHop.lat) * t;
const lng = startHop.lng + (endHop.lng - startHop.lng) * t;
const altitude = maxAltitude * 4 * t * (1 - t);
path.push({ lat, lng, altitude });
}
return path;
}

// Enhanced animation to hop
animateToHop(hop) {
if (!this.map3d) return;
try {
// First zoom out to see the arc
this.map3d.flyCameraTo({
endCamera: {
center: { lat: hop.lat, lng: hop.lng, altitude: 200000 },
tilt: 45,
range: 1000000,
heading: 0
},
durationMillis: 2000
});
// Then zoom in to the location
setTimeout(() => {
this.focusOnHop(hop);
}, 2500);
} catch (error) {
console.error('Error animating to hop:', error);
// Fallback: just set the center
this.map3d.center = { lat: hop.lat, lng: hop.lng, altitude: 0 };
}
}

displayHops() {
const hopsList = document.getElementById('hopsList');
if (!hopsList) return;
hopsList.innerHTML = '';
if (this.hops.length === 0) {
hopsList.innerHTML = '<p style="text-align: center; opacity: 0.6;">No hops yet. Start adding places!</p>';
return;
}
this.hops.forEach((hop) => {
const hopItem = document.createElement('div');
hopItem.className = 'hop-item';
hopItem.dataset.hopId = hop.id;
hopItem.innerHTML = `
<button class="delete-hop" onclick="geohop.deleteHop(${hop.id})">×</button>

<div style="display: inline-block; vertical-align: top; width: calc(100% - 40px);">
<div class="hop-location">${hop.city}, ${hop.country}</div>

${hop.description ? `<div class="hop-description">${hop.description}</div>` : ''}
</div>
`;
hopItem.addEventListener('click', (e) => {
if (!e.target.classList.contains('delete-hop')) {
this.focusOnHop(hop);
}
});
hopsList.appendChild(hopItem);
});
  this.enableDragAndDrop();
}
enableDragAndDrop() {
  const list = document.getElementById('hopsList');
  const items = list.querySelectorAll('.hop-item');

  items.forEach(item => {
    item.draggable = true;

    item.addEventListener('dragstart', () => {
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      this.updateOrder();
    });
  });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    const dragging = document.querySelector('.dragging');
    const afterElement = this.getDragAfterElement(list, e.clientY);

    if (afterElement == null) {
      list.appendChild(dragging);
    } else {
      list.insertBefore(dragging, afterElement);
    }
  });
}
// Enhanced focusOnHop with labels
focusOnHop(hop,customRange = this.zoomConfig.default) {
if (!this.map3d) return;
// Show the city/country overlay
// if (hop.photos?.length) {
//   this.openPhotoViewer(hop.photos);
// }
this.showHopOverlay(hop);
try {
  console.log("I am in focusOnhop with range", customRange);
// Animate camera to hop location
this.map3d.flyCameraTo({
endCamera: {
center: { lat: hop.lat, lng: hop.lng, altitude: 100000 },
tilt: 10,
range: customRange,
heading: 0
},
durationMillis: 5000
});
} catch (error) {
console.error('Error focusing on hop:', error);
// Fallback: just set the center
this.map3d.center = { lat: hop.lat, lng: hop.lng, altitude: 0 };
this.map3d.range = 8000;
}
// Highlight in sidebar
document.querySelectorAll('.hop-item').forEach(item => {
item.classList.remove('active');
if (parseInt(item.dataset.hopId) === hop.id) {
item.classList.add('active');
}
});
}

async playJourney() {
  if (this.hops.length === 0) {
    this.showNotification('No hops to play!', 'error');
    return;
  }

  // ❗ STOP any existing play loop
  this.pauseJourney();

  this.isPlaying = true;
  this.currentHopIndex = 0;

  const sortedHops = [...this.hops].sort((a, b) => a.order - b.order);

  const playNextHop = async () => {
    // ❗ safety guard
    if (!this.isPlaying) return;

    if (this.currentHopIndex >= sortedHops.length) {
      this.pauseJourney();
      this.showNotification('🎉 Journey complete!', 'success');
      return;
    }

    const hop = sortedHops[this.currentHopIndex];
    let range = this.zoomConfig.default;
    if(this.currentHopIndex > 0) {
const prevHop = sortedHops[this.currentHopIndex - 1];
console.log( "this hop", hop.country, "prev hop", prevHop.country);


if (prevHop) {
  if (prevHop.country.toLowerCase() === hop.country.toLowerCase()) {
    range = this.zoomConfig.sameCountry;
    console.log("Zooming in closer for same country");
  } else {
    range = this.zoomConfig.differentCountry;
    console.log("Zooming out for different country");
  }
}
}


// ✅ Pass zoom to focus function
this.focusOnHop(hop, range);

    this.showNotification(
      `📍 Stop ${this.currentHopIndex + 1}/${sortedHops.length}: ${hop.city}`,
      'info',
      3000
    );

    this.currentHopIndex++;

    // ✅ store timeout so we can cancel later
    this.playTimeout = setTimeout(playNextHop, 4000 / this.playSpeed);
  };

  playNextHop();
}



pauseJourney() {
this.isPlaying = false;
 if (this.playTimeout) {
    clearTimeout(this.playTimeout);
    this.playTimeout = null;
  }
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
if (playBtn) playBtn.disabled = false;
if (pauseBtn) pauseBtn.disabled = true;
}

resetJourney() {
this.pauseJourney();
this.currentHopIndex = 0;
if (!this.map3d) return;
try {
// Return to globe view
this.map3d.flyCameraTo({
endCamera: {
center: { lat: 20, lng: -10, altitude: 0 },
range: 15000000,
tilt: 0,
heading: 0
},
durationMillis: 2000
});
} catch (error) {
console.error('Error resetting journey:', error);
}
// Clear active states
document.querySelectorAll('.hop-item').forEach(item => {
item.classList.remove('active');
});
}

toggleRotation() {
if (this.isRotating) {
this.stopRotation();
} else {
this.startRotation();
}
}

startRotation() {
if (!this.map3d) return;
this.isRotating = true;
const rotateBtn = document.getElementById('rotateBtn');
if (rotateBtn) rotateBtn.style.background = 'rgba(102, 126, 234, 0.3)';
let heading = 0;
this.rotationInterval = setInterval(() => {
heading = (heading + 1) % 360;
try {
this.map3d.heading = heading;
} catch (error) {
// Ignore rotation errors
}
}, 50);
}

stopRotation() {
this.isRotating = false;
const rotateBtn = document.getElementById('rotateBtn');
if (rotateBtn) rotateBtn.style.background = '';
if (this.rotationInterval) {
clearInterval(this.rotationInterval);
this.rotationInterval = null;
}
}

toggleSpeed() {
const speeds = [1, 2, 4];
const currentIndex = speeds.indexOf(this.playSpeed);
this.playSpeed = speeds[(currentIndex + 1) % speeds.length];
const speedBtn = document.querySelector('#speedBtn .label');
if (speedBtn) speedBtn.textContent = `${this.playSpeed}x`;
}

toggleViewMode() {
if (!this.map3d) return;
try {
const currentMode = this.map3d.mode;
this.map3d.mode = currentMode === 'satellite' ? 'hybrid' : 'satellite';
} catch (error) {
console.error('Error toggling view mode:', error);
}
}

navigateHop(direction) {
const sortedHops = [...this.hops].sort((a, b) => a.order - b.order);
if (sortedHops.length === 0) return;
this.currentHopIndex = Math.max(0, Math.min(sortedHops.length - 1, this.currentHopIndex + direction));
this.focusOnHop(sortedHops[this.currentHopIndex]);
}

deleteHop(hopId) {
if (!confirm('Delete this hop?')) return;
// Remove hop
this.hops = this.hops.filter(h => h.id !== hopId);
// Remove marker
const markerIndex = this.markers.findIndex(m => m.hopId === hopId);
if (markerIndex !== -1 && this.markers[markerIndex].element) {
try {
this.markers[markerIndex].element.remove();
} catch (e) {
// Ignore removal errors
}
this.markers.splice(markerIndex, 1);
}
// Update everything
this.saveHops();
this.displayHops();
//this.updatePolylines();
this.updateStats();
this.showNotification('Hop deleted', 'success');
}

updateStats() {
const totalHopsEl = document.getElementById('totalHops');
if (totalHopsEl) totalHopsEl.textContent = this.hops.length;
const countries = new Set(this.hops.map(h => h.country));
const totalCountriesEl = document.getElementById('totalCountries');
if (totalCountriesEl) totalCountriesEl.textContent = countries.size;
// Calculate total distance
let totalDistance = 0;
if (this.hops.length > 1) {
const sortedHops = [...this.hops].sort((a, b) => a.order - b.order);
for (let i = 0; i < sortedHops.length - 1; i++) {
totalDistance += this.calculateDistance(sortedHops[i], sortedHops[i + 1]);
}
}
const totalDistanceEl = document.getElementById('totalDistance');
if (totalDistanceEl) totalDistanceEl.textContent = Math.round(totalDistance).toLocaleString();
}

calculateDistance(hop1, hop2) {
const R = 6371; // Earth's radius in km
const dLat = (hop2.lat - hop1.lat) * Math.PI / 180;
const dLng = (hop2.lng - hop1.lng) * Math.PI / 180;
const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
Math.cos(hop1.lat * Math.PI / 180) * Math.cos(hop2.lat * Math.PI / 180) *
Math.sin(dLng/2) * Math.sin(dLng/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
return R * c;
}

openShareModal() {
const modal = document.getElementById('shareModal');
if (modal) modal.classList.add('active');
// Generate share link
const shareData = btoa(JSON.stringify({
hops: this.hops,
//user: document.getElementById('userName')?.textContent || 'GeoHop User'
}));

const shareUrl = `${window.location.origin}${window.location.pathname}?journey=${shareData}`;
const shareLinkEl = document.getElementById('shareLink');
if (shareLinkEl) shareLinkEl.value = shareUrl;
}

closeShareModal() {
const modal = document.getElementById('shareModal');
if (modal) modal.classList.remove('active');
}

copyShareLink() {
const shareLink = document.getElementById('shareLink');
if (shareLink) {
shareLink.select();
document.execCommand('copy');
this.showNotification('Link copied! 📋', 'success');
}
}

// shareOnWhatsApp() {
// const shareLinkEl = document.getElementById('shareLink');
// if (shareLinkEl) {
// const url = shareLinkEl.value;
// const text = `Check out my travel journey on GeoHop! 🌍✈️`;
// window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
// }
// }

// shareOnTwitter() {
// const shareLinkEl = document.getElementById('shareLink');
// if (shareLinkEl) {
// const url = shareLinkEl.value;
// const text = `Check out my travel journey on GeoHop! 🌍✈️`;
// window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
// }
// }

// shareOnFacebook() {
// const shareLinkEl = document.getElementById('shareLink');
// if (shareLinkEl) {
// const url = shareLinkEl.value;
// window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
// }
// }

clearForm() {
const cityEl = document.getElementById('city');
if (cityEl) cityEl.value = '';
const countryEl = document.getElementById('country');
if (countryEl) countryEl.value = '';
const descEl = document.getElementById('description');
if (descEl) descEl.value = '';
const dateEl = document.getElementById('date');
if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
const photos = document.getElementById('photos');
if (photos) photos.value = '';
}


setDateConstraints() {
const dateInput = document.getElementById('date');
if (!dateInput) return;
const today = new Date();
const oneYearAgo = new Date();
oneYearAgo.setFullYear(today.getFullYear() - 1);
dateInput.max = today.toISOString().split('T')[0];
dateInput.min = oneYearAgo.toISOString().split('T')[0];
dateInput.value = today.toISOString().split('T')[0];
}

showNotification(message, type = 'info', duration = 3000) {
const notification = document.createElement('div');
notification.style.cssText = `
position: fixed;
top: 80px;
right: 20px;
padding: 1rem 1.5rem;
background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#00c851' : type === 'warning' ? '#ffbb33' : '#33b5e5'};
color: white;
border-radius: 8px;
box-shadow: 0 4px 12px rgba(0,0,0,0.3);
z-index: 5000;
animation: slideIn 0.3s ease;
max-width: 350px;
white-space: pre-line;
`;
notification.textContent = message;
document.body.appendChild(notification);
setTimeout(() => {
notification.style.animation = 'slideOut 0.3s ease';
setTimeout(() => notification.remove(), 300);
}, duration);
}

showLoading(show) {
let overlay = document.getElementById('loadingOverlay');
if (!overlay && show) {
overlay = document.createElement('div');
overlay.id = 'loadingOverlay';
overlay.className = 'loading-overlay';
overlay.innerHTML = `
<div class="loading-spinner"></div>
<p>Loading...</p>
`;
document.body.appendChild(overlay);
}
if (overlay) {
if (show) {
overlay.classList.add('active');
} else {
overlay.classList.remove('active');
}
}
}

saveHops() {
try {
localStorage.setItem('geoHops3D', JSON.stringify(this.hops));
  console.log("I am svaing hops", this.hops)
} catch (error) {
console.error('Error saving hops:', error);
}
}
clearExistingJourney() {
  // Remove markers
  this.markers.forEach(m => {
    try { m.element?.remove(); } catch(e) {}
  });
  this.markers = [];

  // Remove polylines
  // this.polylines.forEach(p => {
  //   try { p.remove(); } catch(e) {}
  // });
  // this.polylines = [];

  this.hops = [];
}
  getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.hop-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

  getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.hop-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
updateOrder() {
  const items = document.querySelectorAll('.hop-item');

  items.forEach((item, index) => {
    const id = parseInt(item.dataset.hopId);
    const hop = this.hops.find(h => h.id === id);

    if (hop) {
      hop.order = index; // ✅ THIS is the key
    }
  });

  this.saveHops();
}
loadHops() {
    this.clearExistingJourney(); 
const urlParams = new URLSearchParams(window.location.search);
const journeyData = urlParams.get('journey');
if (journeyData) {
try {
const data = JSON.parse(atob(journeyData));
console.log("loading shred journey into hops", data.hops);
this.hops = data.hops || [];
const userNameEl = document.getElementById('userName');
if (userNameEl) userNameEl.textContent = data.user || 'Shared Journey';
const addHopSection = document.querySelector('.add-hop-section');
if (addHopSection) addHopSection.style.display = 'none';
this.showNotification('Viewing shared journey', 'info');
} catch (e) {
this.showNotification('Invalid journey link', 'error');
}
} else {
const saved = localStorage.getItem('geoHops3D');
if (saved) {
  try {
    this.hops = JSON.parse(saved);

    // ⭐ Detect AI-generated journey
    const isAIJourney = this.hops.some(h =>
      h.description?.includes("AI")
    );

    if (isAIJourney) {
      this.showNotification("✨ AI Journey loaded!", "info");

      // Auto-play after map loads
      setTimeout(() => {
        this.playJourney();
      }, 2000);
    }

  }
catch (e) {
console.error('Error loading saved hops:', e);
this.hops = [];
}
}
}
this.displayHops();
this.hops.forEach(hop => this.addMarker3D(hop));
//this.updatePolylines();
this.updateStats();
}
}

// Add slide animations
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
from { transform: translateX(100%); opacity: 0; }
to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOut {
from { transform: translateX(0); opacity: 1; }
to { transform: translateX(100%); opacity: 0; }
}
`;
document.head.appendChild(style);

// Initialize app
let geohop;
document.addEventListener('DOMContentLoaded', () => {
console.log('DOM loaded, initializing GeoHop...');
if (document.getElementById('addHopForm')) {
    geohop = new GeoHop3D({
  zoomConfig: {
    default: 9000000,
    sameCountry: 3000000,
    differentCountry: 8000000
  }
});
  }
});
