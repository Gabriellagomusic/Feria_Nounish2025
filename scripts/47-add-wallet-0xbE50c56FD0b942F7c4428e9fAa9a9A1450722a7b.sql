-- Script to add wallet 0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b to the FeriaNounish artist whitelist
-- This script will:
-- 1. Check if the wallet already exists
-- 2. Insert the wallet if it doesn't exist (using ON CONFLICT DO NOTHING for safety)
-- 3. Verify the wallet was added successfully
-- 4. Show the total count of whitelisted artists
-- 5. Display all whitelisted wallets

-- Step 1: Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Step 2: Insert the wallet (lowercase for consistency)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet was added
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b')
        ) 
        THEN '✓ Wallet successfully whitelisted'
        ELSE '✗ Error: Wallet not found after insertion'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Step 5: Display all whitelisted wallets (for verification)
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
