-- Verify wallet 0x0BF8434Ba6307580a850963EcfC7401CBeCfdF95 in FeriaNounish-Artistas whitelist
-- This wallet was previously added in script 16, this script verifies it exists

-- Check if wallet exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x0BF8434Ba6307580a850963EcfC7401CBeCfdF95')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Insert wallet (will be skipped if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x0BF8434Ba6307580a850963EcfC7401CBeCfdF95'))
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet is whitelisted
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x0BF8434Ba6307580a850963EcfC7401CBeCfdF95')
        ) 
        THEN '✓ Wallet 0x0BF8434Ba6307580a850963EcfC7401CBeCfdF95 is whitelisted'
        ELSE '✗ Failed to add wallet'
    END as verification;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
