-- Add wallet 0x0BF8434Ba6307580a850963EcfC7401CBeCfdF95 to the artist whitelist
-- This wallet was in the master CSV list (#11)

-- Insert the wallet address (normalized to lowercase)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0x0bf8434ba6307580a850963ecfc7401cbecfdf95')
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE id = '0x0bf8434ba6307580a850963ecfc7401cbecfdf95'
    ) 
    THEN '✓ Wallet 0x0bf8434ba6307580a850963ecfc7401cbecfdf95 is whitelisted'
    ELSE '✗ ERROR: Wallet was not added'
  END as verification_status;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists 
FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets for reference
SELECT id as whitelisted_wallet 
FROM "FeriaNounish-Artistas" 
ORDER BY id;
