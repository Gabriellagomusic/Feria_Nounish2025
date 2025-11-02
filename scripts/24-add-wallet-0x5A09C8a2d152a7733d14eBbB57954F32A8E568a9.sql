-- Add wallet 0x5A09C8a2d152a7733d14eBbB57954F32A8E568a9 to the FeriaNounish-Artistas whitelist
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
            WHERE LOWER(id) = LOWER('0x5A09C8a2d152a7733d14eBbB57954F32A8E568a9')
        ) 
        THEN '✓ Wallet already exists in whitelist'
        ELSE '○ Wallet not found, will be added'
    END as status;

-- Step 2: Insert the wallet (using ON CONFLICT to avoid duplicates)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x5A09C8a2d152a7733d14eBbB57954F32A8E568a9'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet was added successfully
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x5A09C8a2d152a7733d14eBbB57954F32A8E568a9')
        ) 
        THEN '✓ SUCCESS: Wallet 0x5A09C8a2d152a7733d14eBbB57954F32A8E568a9 is now whitelisted'
        ELSE '✗ ERROR: Failed to add wallet to whitelist'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT 
    COUNT(*) as total_whitelisted_artists,
    '🎨 Total artists in whitelist' as description
FROM "FeriaNounish-Artistas";

-- Step 5: List all whitelisted wallets (sorted alphabetically)
SELECT 
    id as wallet_address,
    '✓ Whitelisted' as status
FROM "FeriaNounish-Artistas"
ORDER BY id;
