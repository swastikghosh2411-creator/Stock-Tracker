require('dotenv').config();
const axios = require('axios');
const db    = require('../db');

const BASE = 'https://www.alphavantage.co/query';
const KEY  = process.env.ALPHA_VANTAGE_KEY;
const CACHE_TTL_MINUTES = 5;
const DAILY_LIMIT = 25;

async function checkRateLimit() {
  await db.query(
    `INSERT INTO rate_limit_log (date, call_count) VALUES (CURRENT_DATE, 0)
     ON CONFLICT (date) DO NOTHING`
  );
  const result = await db.query(
    `SELECT call_count FROM rate_limit_log WHERE date = CURRENT_DATE`
  );
  return parseInt(result.rows[0].call_count, 10);
}

async function incrementRateLimit() {
  await db.query(
    `UPDATE rate_limit_log SET call_count = call_count + 1 WHERE date = CURRENT_DATE`
  );
}

async function getFromCache(symbol) {
  const result = await db.query(
    `SELECT data, fetched_at FROM stock_cache WHERE symbol = $1`,
    [symbol]
  );
  if (result.rows.length === 0) return null;

  const fetchedAt = new Date(result.rows[0].fetched_at);
  const ageMinutes = (Date.now() - fetchedAt.getTime()) / 60000;
  if (ageMinutes > CACHE_TTL_MINUTES) return null;

  return result.rows[0].data;
}

async function saveToCache(symbol, data) {
  await db.query(
    `INSERT INTO stock_cache (symbol, data, fetched_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (symbol) DO UPDATE SET data = $2, fetched_at = NOW()`,
    [symbol, JSON.stringify(data)]
  );
}

async function getQuote(symbol) {
  const cached = await getFromCache(symbol);
  if (cached) return cached;

  const callCount = await checkRateLimit();
  if (callCount >= DAILY_LIMIT) {
    throw new Error('API rate limit reached for today. Try again tomorrow.');
  }

  const response = await axios.get(BASE, {
    params: { function: 'GLOBAL_QUOTE', symbol, apikey: KEY },
    timeout: 8000,
  });

  const raw = response.data['Global Quote'];
  if (!raw || !raw['05. price']) {
    throw new Error(`No data found for symbol: ${symbol}`);
  }

  await incrementRateLimit();

  const data = {
    symbol:        raw['01. symbol'],
    price:         parseFloat(raw['05. price']),
    change:        parseFloat(raw['09. change']),
    changePercent: raw['10. change percent'].replace('%', '').trim(),
    high:          parseFloat(raw['03. high']),
    low:           parseFloat(raw['04. low']),
    volume:        parseInt(raw['06. volume'], 10),
    prevClose:     parseFloat(raw['08. previous close']),
    open:          parseFloat(raw['02. open']),
  };

  await saveToCache(symbol, data);
  return data;
}

async function getHistory(symbol, range) {
  const rangeMap = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 };
  const days = rangeMap[range] || 30;

  // check DB first
  const existing = await db.query(
    `SELECT date, close FROM price_history
     WHERE symbol = $1
     ORDER BY date DESC
     LIMIT $2`,
    [symbol, days]
  );

  if (existing.rows.length >= Math.min(days, 20)) {
    return existing.rows.reverse().map(r => ({
      date:  r.date,
      close: parseFloat(r.close),
    }));
  }

  const callCount = await checkRateLimit();
  if (callCount >= DAILY_LIMIT) {
    if (existing.rows.length > 0) {
      return existing.rows.reverse().map(r => ({
        date:  r.date,
        close: parseFloat(r.close),
      }));
    }
    throw new Error('API rate limit reached. No cached history available.');
  }

  const outputSize = days > 100 ? 'full' : 'compact';
  const response = await axios.get(BASE, {
    params: { function: 'TIME_SERIES_DAILY', symbol, outputsize: outputSize, apikey: KEY },
    timeout: 10000,
  });

  await incrementRateLimit();

  const series = response.data['Time Series (Daily)'];
  if (!series) throw new Error(`No history found for ${symbol}`);

  const rows = Object.entries(series)
    .slice(0, days)
    .map(([date, v]) => ({
      date,
      open:   parseFloat(v['1. open']),
      high:   parseFloat(v['2. high']),
      low:    parseFloat(v['3. low']),
      close:  parseFloat(v['4. close']),
      volume: parseInt(v['5. volume'], 10),
    }));

  // upsert into DB
  for (const row of rows) {
    await db.query(
      `INSERT INTO price_history (symbol, date, open, high, low, close, volume)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (symbol, date) DO NOTHING`,
      [symbol, row.date, row.open, row.high, row.low, row.close, row.volume]
    );
  }

  return rows.reverse().map(r => ({ date: r.date, close: r.close }));
}

module.exports = { getQuote, getHistory };
