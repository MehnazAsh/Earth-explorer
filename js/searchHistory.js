export default class SearchHistory {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.key = 'aiSearchHistory';
  }

  // -----------------------------
  // SAVE SEARCH
  // -----------------------------
  save(query, results) {
    let history = this.getAll();

    // Remove duplicate
    history = history.filter(h => h.query !== query);

    // Add to top
    history.unshift({ query, results });

    // Keep only last 2
    history = history.slice(0, 2);

    localStorage.setItem(this.key, JSON.stringify(history));
  }

  // -----------------------------
  // GET ALL
  // -----------------------------
  getAll() {
    return JSON.parse(localStorage.getItem(this.key) || "[]");
  }

  // -----------------------------
  // RENDER UI
  // -----------------------------
  render(onSelect) {
    if (!this.container) return;

    const history = this.getAll();

    if (!history.length) {
      this.container.innerHTML = "";
      return;
    }

    this.container.innerHTML = `
      <div style="margin-bottom:10px; font-weight:bold;">
        Recent Searches
      </div>
      ${history.map((h, i) => `
        <div class="history-item" data-index="${i}">
          ${h.query}
        </div>
      `).join('')}
    `;

    // Handle click
    this.container.querySelectorAll('.history-item')
      .forEach(item => {
        item.addEventListener('click', () => {
          const index = parseInt(item.dataset.index);
          const selected = history[index];

          onSelect(selected);
        });
      });
  }

  // -----------------------------
  // CLEAR (optional)
  // -----------------------------
  clear() {
    localStorage.removeItem(this.key);
    this.render(() => {});
  }
}
