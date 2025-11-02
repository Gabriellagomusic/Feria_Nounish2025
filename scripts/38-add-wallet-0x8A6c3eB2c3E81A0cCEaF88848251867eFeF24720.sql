-- Add wallet 0x8A6c3eB2c3E81A0cCEaF88848251867eFeF24720 to FeriaNounish-Artistas whitelist
-- This script checks if the wallet exists, adds it if not, and verifies the addition

-- Step 1: Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x8A6c3eB2c3E81A0cCEaF88848251867eFeF24720')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Step 2: Insert wallet (will be skipped if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x8A6c3eB2c3E81A0cCEaF88848251867eFeF24720'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet is now in the whitelist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x8A6c3eB2c3E81A0cCEaF88848251867eFeF24720')
        ) 
        THEN '✓ Wallet successfully whitelisted'
        ELSE '✗ Error: Wallet not found after insertion'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Step 5: Display all whitelisted wallets
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
