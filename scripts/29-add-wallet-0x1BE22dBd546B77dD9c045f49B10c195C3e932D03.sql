-- Add wallet 0x1BE22dBd546B77dD9c045f49B10c195C3e932D03 to FeriaNounish-Artistas whitelist
-- This script checks if the wallet exists, adds it if needed, and verifies the addition

-- Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x1BE22dBd546B77dD9c045f49B10c195C3e932D03')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Insert the wallet (using ON CONFLICT DO NOTHING to avoid errors if it already exists)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x1BE22dBd546B77dD9c045f49B10c195C3e932D03'))
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added successfully
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x1BE22dBd546B77dD9c045f49B10c195C3e932D03')
        ) 
        THEN '✓ Wallet 0x1BE22dBd546B77dD9c045f49B10c195C3e932D03 is now whitelisted'
        ELSE '✗ Failed to add wallet'
    END as verification;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets (for verification)
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
