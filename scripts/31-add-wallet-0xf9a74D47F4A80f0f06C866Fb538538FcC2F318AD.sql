-- Add wallet 0xf9a74D47F4A80f0f06C866Fb538538FcC2F318AD to FeriaNounish-Artistas whitelist
-- This script checks if the wallet exists and adds it if not

-- Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xf9a74D47F4A80f0f06C866Fb538538FcC2F318AD')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Insert wallet (will be skipped if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0xf9a74D47F4A80f0f06C866Fb538538FcC2F318AD'))
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xf9a74D47F4A80f0f06C866Fb538538FcC2F318AD')
        ) 
        THEN '✓ Wallet 0xf9a74D47F4A80f0f06C866Fb538538FcC2F318AD is whitelisted'
        ELSE '✗ Failed to add wallet'
    END as verification;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
