-- Add wallet 0xB759931AF6d1175b2cDb89b7a2f600612F627025 to FeriaNounish-Artistas whitelist
-- This script checks if the wallet exists and adds it if not

-- Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xB759931AF6d1175b2cDb89b7a2f600612F627025')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Insert wallet (will be skipped if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0xb759931af6d1175b2cdb89b7a2f600612f627025'))
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xB759931AF6d1175b2cDb89b7a2f600612F627025')
        ) 
        THEN '✓ Wallet 0xB759931AF6d1175b2cDb89b7a2f600612F627025 is whitelisted'
        ELSE '✗ Failed to add wallet'
    END as verification;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
