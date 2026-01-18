-- Add qr_image_url to user_bank_accounts so users can upload their bank-provided QR image
ALTER TABLE user_bank_accounts
ADD COLUMN IF NOT EXISTS qr_image_url TEXT;

-- Optional index for quick lookup of users with QR images
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_qr_image_url
ON user_bank_accounts(user_id)
WHERE qr_image_url IS NOT NULL;

