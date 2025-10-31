-- Add wallet 0x081b09Cd1c69612199f5F911E855034b284D5E5C to the artist whitelist
-- Normalized to lowercase for consistency

-- Insert the wallet address (normalized to lowercase)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0x081b09cd1c69612199f5f911e855034b284d5e5c')
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE id = '0x081b09cd1c69612199f5f911e855034b284d5e5c'
    ) 
    THEN '✓ Wallet successfully added to whitelist'
    ELSE '✗ ERROR: Wallet not found in whitelist'
  END as status;

-- Show the newly added wallet
SELECT id as wallet_address 
FROM "FeriaNounish-Artistas" 
WHERE id = '0x081b09cd1c69612199f5f911e855034b284d5e5c';

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists 
FROM "FeriaNounish-Artistas";
