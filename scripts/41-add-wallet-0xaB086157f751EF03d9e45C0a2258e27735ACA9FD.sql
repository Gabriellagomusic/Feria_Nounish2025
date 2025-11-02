-- Add wallet 0xaB086157f751EF03d9e45C0a2258e27735ACA9FD to the FeriaNounish-Artistas whitelist
-- This script ensures the wallet is properly whitelisted for artist access

-- Step 1: Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xaB086157f751EF03d9e45C0a2258e27735ACA9FD')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Step 2: Insert wallet if it doesn't exist (using lowercase for consistency)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0xaB086157f751EF03d9e45C0a2258e27735ACA9FD'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet was added successfully
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xaB086157f751EF03d9e45C0a2258e27735ACA9FD')
        ) 
        THEN '✓ Wallet successfully whitelisted'
        ELSE '✗ Error: Wallet not found after insertion'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Step 5: Display all whitelisted wallets for reference
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
