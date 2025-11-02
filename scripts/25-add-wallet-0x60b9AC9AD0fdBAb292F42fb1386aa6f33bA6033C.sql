-- Script to add wallet 0x60b9AC9AD0fdBAb292F42fb1386aa6f33bA6033C to the artist whitelist
-- This script will:
-- 1. Check if the wallet already exists
-- 2. Insert the wallet if it doesn't exist
-- 3. Verify the insertion was successful
-- 4. Show the total count of whitelisted artists
-- 5. List all whitelisted wallets

-- Step 1: Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x60b9AC9AD0fdBAb292F42fb1386aa6f33bA6033C')
        ) 
        THEN '✓ Wallet already exists in whitelist'
        ELSE '○ Wallet not found, will be added'
    END as status;

-- Step 2: Insert the wallet (will be skipped if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x60b9AC9AD0fdBAb292F42fb1386aa6f33bA6033C'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet is now in the whitelist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x60b9AC9AD0fdBAb292F42fb1386aa6f33bA6033C')
        ) 
        THEN '✓ SUCCESS: Wallet 0x60b9AC9AD0fdBAb292F42fb1386aa6f33bA6033C is whitelisted'
        ELSE '✗ ERROR: Wallet was not added to whitelist'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists 
FROM "FeriaNounish-Artistas";

-- Step 5: List all whitelisted wallets (for verification)
SELECT id as whitelisted_wallet 
FROM "FeriaNounish-Artistas" 
ORDER BY id;
