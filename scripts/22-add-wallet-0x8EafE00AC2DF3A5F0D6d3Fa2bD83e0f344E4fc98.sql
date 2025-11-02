-- Add wallet 0x8EafE00AC2DF3A5F0D6d3Fa2bD83e0f344E4fc98 to the FeriaNounish-Artistas whitelist
-- This script ensures the wallet is properly whitelisted for creating moments

-- Step 1: Check if the wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x8EafE00AC2DF3A5F0D6d3Fa2bD83e0f344E4fc98')
        ) 
        THEN '✅ Wallet already exists in whitelist'
        ELSE '➕ Wallet not found, will be added'
    END as status;

-- Step 2: Insert the wallet (will skip if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x8EafE00AC2DF3A5F0D6d3Fa2bD83e0f344E4fc98'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet was added successfully
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x8EafE00AC2DF3A5F0D6d3Fa2bD83e0f344E4fc98')
        ) 
        THEN '✅ SUCCESS: Wallet 0x8EafE00AC2DF3A5F0D6d3Fa2bD83e0f344E4fc98 is now whitelisted'
        ELSE '❌ ERROR: Wallet was not added to whitelist'
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
