-- Add wallet 0x895C67E208634BF16fF414f220DE193f43051570 to FeriaNounish-Artistas whitelist
-- This script checks if the wallet exists and adds it if not

-- Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x895C67E208634BF16fF414f220DE193f43051570')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Insert wallet (will be skipped if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x895c67e208634bf16ff414f220de193f43051570'))
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x895C67E208634BF16fF414f220DE193f43051570')
        ) 
        THEN '✓ Wallet 0x895C67E208634BF16fF414f220DE193f43051570 is whitelisted'
        ELSE '✗ Failed to add wallet'
    END as verification;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
