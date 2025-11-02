-- Add wallet 0xA0D35d27FF367Dca053818E8dbBaE9A9061125e2 to the artist whitelist
-- This script ensures the wallet is properly whitelisted for creating content

-- Step 1: Check if the wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xA0D35d27FF367Dca053818E8dbBaE9A9061125e2')
        ) 
        THEN '✅ Wallet already exists in whitelist'
        ELSE '➕ Wallet will be added to whitelist'
    END as status;

-- Step 2: Insert the wallet (will skip if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0xA0D35d27FF367Dca053818E8dbBaE9A9061125e2'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet is now in the whitelist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xA0D35d27FF367Dca053818E8dbBaE9A9061125e2')
        ) 
        THEN '✅ VERIFIED: Wallet 0xA0D35d27FF367Dca053818E8dbBaE9A9061125e2 is whitelisted'
        ELSE '❌ ERROR: Wallet was not added successfully'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT 
    COUNT(*) as total_whitelisted_artists,
    '🎨 Total artists in whitelist' as description
FROM "FeriaNounish-Artistas";

-- Step 5: Display all whitelisted wallets for verification
SELECT 
    id as wallet_address,
    '✅ Whitelisted' as status
FROM "FeriaNounish-Artistas"
ORDER BY id;
