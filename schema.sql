-- psql -U postgres -d stock_tracker -f schema.sql

CREATE TABLE IF NOT EXISTS stock_cache (
  symbol      VARCHAR(16) PRIMARY KEY,
  data        JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_history (
  id        SERIAL PRIMARY KEY,
  symbol    VARCHAR(16) NOT NULL,
  date      DATE NOT NULL,
  open      NUMERIC(12,4),
  high      NUMERIC(12,4),
  low       NUMERIC(12,4),
  close     NUMERIC(12,4),
  volume    BIGINT,
  UNIQUE(symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_history_symbol_date ON price_history(symbol, date DESC);

CREATE TABLE IF NOT EXISTS watchlist (
  id          SERIAL PRIMARY KEY,
  session_id  VARCHAR(64) NOT NULL,
  symbol      VARCHAR(16) NOT NULL,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, symbol)
);

CREATE TABLE IF NOT EXISTS search_history (
  id            SERIAL PRIMARY KEY,
  symbol        VARCHAR(16) NOT NULL,
  searched_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limit_log (
  date        DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  call_count  INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS symbols (
  symbol  VARCHAR(16) PRIMARY KEY,
  name    VARCHAR(128) NOT NULL
);

-- seed common symbols so search works without API calls
INSERT INTO symbols (symbol, name) VALUES
  ('AAPL',  'Apple Inc.'),
  ('MSFT',  'Microsoft Corporation'),
  ('GOOGL', 'Alphabet Inc.'),
  ('AMZN',  'Amazon.com Inc.'),
  ('TSLA',  'Tesla Inc.'),
  ('META',  'Meta Platforms Inc.'),
  ('NVDA',  'NVIDIA Corporation'),
  ('NFLX',  'Netflix Inc.'),
  ('AMD',   'Advanced Micro Devices'),
  ('INTC',  'Intel Corporation'),
  ('JPM',   'JPMorgan Chase & Co.'),
  ('BAC',   'Bank of America Corp.'),
  ('WFC',   'Wells Fargo & Company'),
  ('GS',    'Goldman Sachs Group Inc.'),
  ('MS',    'Morgan Stanley'),
  ('V',     'Visa Inc.'),
  ('MA',    'Mastercard Incorporated'),
  ('PYPL',  'PayPal Holdings Inc.'),
  ('DIS',   'Walt Disney Company'),
  ('UBER',  'Uber Technologies Inc.'),
  ('LYFT',  'Lyft Inc.'),
  ('SPOT',  'Spotify Technology S.A.'),
  ('SHOP',  'Shopify Inc.'),
  ('SQ',    'Block Inc.'),
  ('COIN',  'Coinbase Global Inc.'),
  ('PLTR',  'Palantir Technologies'),
  ('SNOW',  'Snowflake Inc.'),
  ('CRM',   'Salesforce Inc.'),
  ('ORCL',  'Oracle Corporation'),
  ('IBM',   'IBM Corporation'),
  ('QCOM',  'Qualcomm Incorporated'),
  ('ADBE',  'Adobe Inc.'),
  ('NOW',   'ServiceNow Inc.'),
  ('ZOOM',  'Zoom Video Communications'),
  ('TWLO',  'Twilio Inc.'),
  ('ROKU',  'Roku Inc.'),
  ('SNAP',  'Snap Inc.'),
  ('PINS',  'Pinterest Inc.'),
  ('TWTR',  'Twitter Inc.'),
  ('WMT',   'Walmart Inc.'),
  ('TGT',   'Target Corporation'),
  ('COST',  'Costco Wholesale'),
  ('NKE',   'Nike Inc.'),
  ('SBUX',  'Starbucks Corporation'),
  ('MCD',   'McDonald''s Corporation'),
  ('KO',    'Coca-Cola Company'),
  ('PEP',   'PepsiCo Inc.'),
  ('JNJ',   'Johnson & Johnson'),
  ('PFE',   'Pfizer Inc.'),
  ('MRNA',  'Moderna Inc.')
ON CONFLICT (symbol) DO NOTHING;
