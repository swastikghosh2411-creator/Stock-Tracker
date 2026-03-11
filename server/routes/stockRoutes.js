const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { getQuote, getHistory } = require('../services/alphaVantage');

// GET /api/stock/:symbol
router.get('/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await getQuote(symbol);

    // log search
    db.query(
      `INSERT INTO search_history (symbol, searched_at) VALUES ($1, NOW())`,
      [symbol]
    ).catch(() => {});

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/stock/:symbol/history?range=1M
router.get('/:symbol/history', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const range  = req.query.range || '1M';
  try {
    const data = await getHistory(symbol, range);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/search?q=apple
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const result = await db.query(
      `SELECT symbol, name FROM symbols
       WHERE symbol ILIKE $1 OR name ILIKE $2
       LIMIT 8`,
      [`${q}%`, `%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trending
router.get('/meta/trending', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT symbol, COUNT(*) as count
       FROM search_history
       WHERE searched_at > NOW() - INTERVAL '24 hours'
       GROUP BY symbol
       ORDER BY count DESC
       LIMIT 5`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
