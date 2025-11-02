-- Add wallet 0x6b59E47dD49259Ea8a9600a55361Bf6f069c4Eb8 to FeriaNounish-Artistas whitelist
-- This script checks if the wallet exists, adds it if needed, and verifies the addition

-- Check if wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x6b59E47dD49259Ea8a9600a55361Bf6f069c4Eb8')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Insert the wallet (using ON CONFLICT DO NOTHING to avoid errors if it already exists)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x6b59E47dD49259Ea8a9600a55361Bf6f069c4Eb8'))
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added successfully
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0x6b59E47dD49259Ea8a9600a55361Bf6f069c4Eb8')
        ) 
        THEN '✓ Wallet 0x6b59E47dD49259Ea8a9600a55361Bf6f069c4Eb8 is now whitelisted'
        ELSE '✗ Failed to add wallet'
    END as verification;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets (for verification)
SELECT id as whitelisted_wallet FROM "FeriaNounish-Artistas" ORDER BY id;
