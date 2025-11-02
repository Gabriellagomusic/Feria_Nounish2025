-- Add wallet 0x19aF62b364ea4a8D4A9ECC7beBf5E833d87acFF8 to FeriaNounish-Artistas whitelist
-- This script checks if the wallet exists, adds it if not, and verifies the addition

-- Step 1: Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x19aF62b364ea4a8D4A9ECC7beBf5E833d87acFF8')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Step 2: Insert wallet (will be skipped if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x19aF62b364ea4a8D4A9ECC7beBf5E833d87acFF8'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet is now in the whitelist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x19aF62b364ea4a8D4A9ECC7beBf5E833d87acFF8')
        ) 
        THEN '✓ Wallet successfully whitelisted'
        ELSE '✗ Error: Wallet not found after insertion'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Step 5: Display all whitelisted wallets
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
