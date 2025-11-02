-- Add wallet 0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b to the artist whitelist
-- This script checks if the wallet exists, adds it if needed, and verifies the result

-- Check if wallet already exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b')
    ) 
    THEN '✓ Wallet already exists in whitelist'
    ELSE '○ Wallet not found, will be added'
  END as status;

-- Insert wallet if it doesn't exist (using lowercase for consistency)
INSERT INTO "FeriaNounish-Artistas" (id, created_at)
SELECT 
  LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b'),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "FeriaNounish-Artistas" 
  WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b')
);

-- Verify the wallet is now in the whitelist
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b')
    ) 
    THEN '✓ SUCCESS: Wallet is whitelisted'
    ELSE '✗ ERROR: Wallet was not added'
  END as verification;

-- Show the wallet details
SELECT 
  id as wallet_address,
  created_at,
  '✓ Whitelisted' as status
FROM "FeriaNounish-Artistas"
WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b');

-- Display total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets for reference
SELECT id as wallet_address, created_at 
FROM "FeriaNounish-Artistas" 
ORDER BY created_at DESC;
