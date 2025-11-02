-- Add wallet 0x0343ff635333bA20e5212e1a4ff7998397B541D8 to the artist whitelist
-- This script ensures the wallet is properly whitelisted for creating content

-- First, check if the wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x0343ff635333bA20e5212e1a4ff7998397B541D8')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Insert the wallet (will be skipped if it already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x0343ff635333bA20e5212e1a4ff7998397B541D8'))
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added successfully
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x0343ff635333bA20e5212e1a4ff7998397B541D8')
        ) 
        THEN '✅ Wallet 0x0343ff635333bA20e5212e1a4ff7998397B541D8 is now whitelisted'
        ELSE '❌ Failed to add wallet to whitelist'
    END as verification;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets for reference
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
