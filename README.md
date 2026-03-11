# Stock Price Tracker

Real-time stock price tracker with chart history, watchlist, and PostgreSQL caching.

## Stack
- Node.js + Express (backend)
- PostgreSQL (caching, watchlist, search history)
- Chart.js (price charts)
- Vanilla HTML/CSS/JS (frontend)

## Setup

### 1. Get a free API key
Go to https://www.alphavantage.co/support/#api-key and register for a free key.
Free tier: 25 API calls/day (the app caches aggressively so this is fine).

### 2. Create the database
```bash
psql -U postgres -c "CREATE DATABASE stock_tracker;"
psql -U postgres -d stock_tracker -f schema.sql
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- Your DB credentials
- Your Alpha Vantage API key

### 4. Install and start
```bash
npm install
npm start
```

Open http://localhost:3000

## How it works

- Search any ticker (AAPL, TSLA, etc.) → get real price data
- View 1W / 1M / 3M / 1Y price history chart
- Add stocks to your personal watchlist (saved in DB, persisted across sessions)
- API responses cached in PostgreSQL for 5 minutes to protect rate limits
- Daily API call count tracked in `rate_limit_log` table

## Project Structure

```
stock-tracker/
├── server/
│   ├── app.js                    # Express entry point
│   ├── db.js                     # pg connection pool
│   ├── routes/
│   │   ├── stockRoutes.js        # /api/stock, /api/search, /api/trending
│   │   └── watchlistRoutes.js    # /api/watchlist CRUD
│   └── services/
│       └── alphaVantage.js       # API calls + caching logic
├── public/
│   ├── index.html                # Home / search page
│   ├── stock.html                # Stock detail + chart page
│   ├── css/style.css
│   └── js/
│       ├── home.js
│       └── stock.js
├── schema.sql
├── .env.example
└── package.json
```
