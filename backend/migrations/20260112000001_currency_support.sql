-- Add currency support to sessions and bills

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS base_currency CHAR(3) NOT NULL DEFAULT 'VND',
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';

ALTER TABLE bills
    ADD COLUMN IF NOT EXISTS currency_code CHAR(3) NOT NULL DEFAULT 'VND',
    ADD COLUMN IF NOT EXISTS amount_original DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18, 8) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS rate_source TEXT NOT NULL DEFAULT 'legacy',
    ADD COLUMN IF NOT EXISTS rate_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE bills
SET amount_original = amount,
    rate_timestamp = created_at,
    rate_source = COALESCE(rate_source, 'legacy'),
    currency_code = COALESCE(currency_code, 'VND')
WHERE amount_original IS NULL;

CREATE TABLE IF NOT EXISTS exchange_rates (
    base_currency CHAR(3) NOT NULL,
    quote_currency CHAR(3) NOT NULL,
    rate DECIMAL(18, 8) NOT NULL CHECK (rate > 0),
    rate_date DATE NOT NULL,
    rate_source TEXT NOT NULL DEFAULT 'exchangerate.host',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (base_currency, quote_currency, rate_date, rate_source)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair
    ON exchange_rates(base_currency, quote_currency);
CREATE INDEX IF NOT EXISTS idx_bills_currency_code
    ON bills(currency_code);
