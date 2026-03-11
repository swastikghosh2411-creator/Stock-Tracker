const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/watchlist/:sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT w.symbol, s.name FROM watchlist w
       LEFT JOIN symbols s ON w.symbol = s.symbol
       WHERE w.session_id = $1
       ORDER BY w.added_at DESC`,
      [req.params.sessionId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/watchlist
router.post('/', async (req, res) => {
  const { session_id, symbol } = req.body;
  if (!session_id || !symbol) {
    return res.status(400).json({ error: 'session_id and symbol required' });
  }
  try {
    await db.query(
      `INSERT INTO watchlist (session_id, symbol) VALUES ($1, $2)
       ON CONFLICT (session_id, symbol) DO NOTHING`,
      [session_id, symbol.toUpperCase()]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/watchlist/:sessionId/:symbol
router.delete('/:sessionId/:symbol', async (req, res) => {
  try {
    await db.query(
      `DELETE FROM watchlist WHERE session_id = $1 AND symbol = $2`,
      [req.params.sessionId, req.params.symbol.toUpperCase()]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
