-- Add receipt_url to bills table for photo receipts
ALTER TABLE bills ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create index for receipt lookups (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_bills_receipt_url ON bills(receipt_url) WHERE receipt_url IS NOT NULL;
