const SESSION_ID = (() => {
  let id = localStorage.getItem('session_id');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2);
    localStorage.setItem('session_id', id);
  }
  return id;
})();

const searchInput     = document.getElementById('search-input');
const autocompleteBox = document.getElementById('autocomplete-box');
const trendingList    = document.getElementById('trending-list');
const watchlistPanel  = document.getElementById('watchlist-panel');
const watchlistItems  = document.getElementById('watchlist-items');

let debounceTimer = null;

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (!q) { autocompleteBox.classList.remove('show'); return; }
  debounceTimer = setTimeout(() => fetchSuggestions(q), 300);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = searchInput.value.trim().toUpperCase();
    if (q) window.location.href = `/stock.html?symbol=${q}`;
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) {
    autocompleteBox.classList.remove('show');
  }
});

async function fetchSuggestions(q) {
  try {
    const res  = await fetch(`/api/stock?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    renderSuggestions(data);
  } catch {
    autocompleteBox.classList.remove('show');
  }
}

function renderSuggestions(items) {
  if (!items.length) { autocompleteBox.classList.remove('show'); return; }
  autocompleteBox.innerHTML = items.map(s => `
    <a class="ac-item" href="/stock.html?symbol=${s.symbol}">
      <span class="ac-symbol">${s.symbol}</span>
      <span class="ac-name">${s.name}</span>
    </a>
  `).join('');
  autocompleteBox.classList.add('show');
}

async function loadTrending() {
  try {
    const res  = await fetch('/api/stock/meta/trending');
    const data = await res.json();
    if (!data.length) {
      // show defaults if no history yet
      const defaults = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'];
      trendingList.innerHTML = defaults.map(s =>
        `<a class="trend-chip" href="/stock.html?symbol=${s}">${s}</a>`
      ).join('');
      return;
    }
    trendingList.innerHTML = data.map(s =>
      `<a class="trend-chip" href="/stock.html?symbol=${s.symbol}">${s.symbol}</a>`
    ).join('');
  } catch {
    trendingList.innerHTML = '';
  }
}

async function loadWatchlist() {
  try {
    const res  = await fetch(`/api/watchlist/${SESSION_ID}`);
    const data = await res.json();
    if (!data.length) {
      watchlistItems.innerHTML = '<p class="empty-msg">No stocks added yet.</p>';
      return;
    }
    watchlistItems.innerHTML = data.map(s => `
      <div class="wl-item">
        <a href="/stock.html?symbol=${s.symbol}" style="text-decoration:none;color:inherit;flex:1">
          <div class="wl-symbol">${s.symbol}</div>
          <div class="wl-name">${s.name || ''}</div>
        </a>
        <button class="wl-remove" onclick="removeFromWatchlist('${s.symbol}')">✕</button>
      </div>
    `).join('');
  } catch {
    watchlistItems.innerHTML = '<p class="empty-msg">Failed to load.</p>';
  }
}

async function removeFromWatchlist(symbol) {
  await fetch(`/api/watchlist/${SESSION_ID}/${symbol}`, { method: 'DELETE' });
  loadWatchlist();
}

function toggleWatchlistPanel() {
  watchlistPanel.classList.toggle('open');
  if (watchlistPanel.classList.contains('open')) loadWatchlist();
}

loadTrending();
