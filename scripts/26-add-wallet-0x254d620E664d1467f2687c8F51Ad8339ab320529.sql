-- Add wallet 0x254d620E664d1467f2687c8F51Ad8339ab320529 to the FeriaNounish-Artistas whitelist
-- This script checks if the wallet exists, adds it if needed, and verifies the result

-- Step 1: Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x254d620E664d1467f2687c8F51Ad8339ab320529')
        ) 
        THEN '✓ Wallet already exists in whitelist'
        ELSE '○ Wallet not found - will be added'
    END as status;

-- Step 2: Insert wallet (will skip if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x254d620E664d1467f2687c8F51Ad8339ab320529'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet is now in the whitelist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x254d620E664d1467f2687c8F51Ad8339ab320529')
        ) 
        THEN '✓ SUCCESS: Wallet is whitelisted'
        ELSE '✗ ERROR: Wallet not found after insert'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Step 5: Display all whitelisted wallets for reference
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
