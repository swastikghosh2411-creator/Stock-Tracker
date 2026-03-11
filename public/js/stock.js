const SESSION_ID = (() => {
  let id = localStorage.getItem('session_id');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2);
    localStorage.setItem('session_id', id);
  }
  return id;
})();

const params = new URLSearchParams(window.location.search);
const SYMBOL = (params.get('symbol') || '').toUpperCase();

const skeleton      = document.getElementById('skeleton');
const errorState    = document.getElementById('error-state');
const stockContent  = document.getElementById('stock-content');
const watchlistPanel = document.getElementById('watchlist-panel');
const watchlistItems = document.getElementById('watchlist-items');

let chart = null;
let currentRange = '1W';
let isInWatchlist = false;

if (!SYMBOL) {
  showError('No symbol provided.');
} else {
  document.title = `${SYMBOL} — StockTrack`;
  loadStock();
}

async function loadStock() {
  try {
    const res  = await fetch(`/api/stock/${SYMBOL}`);
    const data = await res.json();
    if (data.error) { showError(data.error); return; }
    renderStock(data);
    await loadHistory(currentRange);
    await checkWatchlist();
    skeleton.style.display = 'none';
    stockContent.style.display = 'block';
  } catch (err) {
    showError('Failed to load stock data. Check your API key and try again.');
  }
}

function renderStock(data) {
  document.getElementById('s-symbol').textContent = data.symbol;
  document.getElementById('s-name').textContent   = '';
  document.getElementById('s-price').textContent  = `$${data.price.toFixed(2)}`;
  document.getElementById('s-open').textContent   = `$${data.open.toFixed(2)}`;
  document.getElementById('s-high').textContent   = `$${data.high.toFixed(2)}`;
  document.getElementById('s-low').textContent    = `$${data.low.toFixed(2)}`;
  document.getElementById('s-prev').textContent   = `$${data.prevClose.toFixed(2)}`;
  document.getElementById('s-volume').textContent = data.volume.toLocaleString();

  const changePct = parseFloat(data.changePercent);
  const changeEl  = document.getElementById('s-change');
  const sign      = changePct >= 0 ? '+' : '';
  changeEl.textContent = `${sign}${changePct.toFixed(2)}%`;
  changeEl.className   = `change-badge ${changePct >= 0 ? 'up' : 'down'}`;
}

async function loadHistory(range) {
  currentRange = range;
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.range === range);
  });

  try {
    const res  = await fetch(`/api/stock/${SYMBOL}/history?range=${range}`);
    const data = await res.json();
    if (data.error || !data.length) return;
    renderChart(data);
  } catch {
    // chart just won't update — not a fatal error
  }
}

function renderChart(data) {
  const labels = data.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const prices = data.map(d => d.close);

  const isUp   = prices[prices.length - 1] >= prices[0];
  const color  = isUp ? '#00d4aa' : '#ff4d6a';

  const ctx = document.getElementById('price-chart').getContext('2d');

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: prices,
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        backgroundColor: (context) => {
          const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 280);
          gradient.addColorStop(0, color + '33');
          gradient.addColorStop(1, color + '00');
          return gradient;
        },
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1d27',
          borderColor: '#232635',
          borderWidth: 1,
          titleColor: '#5a6080',
          bodyColor: '#e8eaf0',
          callbacks: {
            label: ctx => `$${ctx.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#232635' },
          ticks: { color: '#5a6080', maxTicksLimit: 8, font: { size: 11 } },
        },
        y: {
          grid: { color: '#232635' },
          ticks: {
            color: '#5a6080',
            font: { size: 11 },
            callback: v => `$${v.toFixed(0)}`,
          },
          position: 'right',
        },
      },
    },
  });
}

async function checkWatchlist() {
  try {
    const res  = await fetch(`/api/watchlist/${SESSION_ID}`);
    const data = await res.json();
    isInWatchlist = data.some(s => s.symbol === SYMBOL);
    updateWatchlistBtn();
  } catch {}
}

function updateWatchlistBtn() {
  const btn = document.getElementById('watchlist-toggle-btn');
  if (isInWatchlist) {
    btn.textContent = '✓ In Watchlist';
    btn.classList.add('added');
  } else {
    btn.textContent = '+ Add to Watchlist';
    btn.classList.remove('added');
  }
}

async function toggleWatchlist() {
  if (isInWatchlist) {
    await fetch(`/api/watchlist/${SESSION_ID}/${SYMBOL}`, { method: 'DELETE' });
    isInWatchlist = false;
  } else {
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID, symbol: SYMBOL }),
    });
    isInWatchlist = true;
  }
  updateWatchlistBtn();
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
  if (symbol === SYMBOL) { isInWatchlist = false; updateWatchlistBtn(); }
}

function toggleWatchlistPanel() {
  watchlistPanel.classList.toggle('open');
  if (watchlistPanel.classList.contains('open')) loadWatchlist();
}

function showError(msg) {
  skeleton.style.display    = 'none';
  stockContent.style.display = 'none';
  errorState.style.display  = 'block';
  document.getElementById('error-msg').textContent = msg;
}

// range button clicks
document.querySelectorAll('.range-btn').forEach(btn => {
  btn.addEventListener('click', () => loadHistory(btn.dataset.range));
});
