-- Add wallet 0xf960600b70E7f572Cb003C65188Ab1E55645DB8c to the FeriaNounish-Artistas whitelist
-- This script checks if the wallet exists, adds it if needed, and verifies the result

-- Step 1: Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xf960600b70E7f572Cb003C65188Ab1E55645DB8c')
        ) 
        THEN '✓ Wallet already exists in whitelist'
        ELSE '○ Wallet not found, will be added'
    END as status;

-- Step 2: Insert the wallet (will skip if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0xf960600b70E7f572Cb003C65188Ab1E55645DB8c'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet was added successfully
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xf960600b70E7f572Cb003C65188Ab1E55645DB8c')
        ) 
        THEN '✓ SUCCESS: Wallet 0xf960600b70E7f572Cb003C65188Ab1E55645DB8c is now whitelisted'
        ELSE '✗ ERROR: Failed to add wallet to whitelist'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT 
    COUNT(*) as total_whitelisted_artists,
    '✓ Total artists in whitelist' as description
FROM "FeriaNounish-Artistas";

-- Step 5: Display all whitelisted wallets for verification
SELECT 
    id as wallet_address,
    '✓ Whitelisted' as status
FROM "FeriaNounish-Artistas"
ORDER BY id;
