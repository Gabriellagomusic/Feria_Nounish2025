-- Add wallet 0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b to the artist whitelist
-- Fixed version: only uses 'id' column (no created_at)

-- Check if wallet already exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b')
    ) 
    THEN 'Wallet already exists in whitelist'
    ELSE 'Wallet not found, will be added'
  END as status;

-- Insert wallet if it doesn't exist (using lowercase for consistency)
INSERT INTO "FeriaNounish-Artistas" (id)
SELECT LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b')
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
    THEN 'SUCCESS: Wallet is whitelisted'
    ELSE 'ERROR: Wallet was not added'
  END as verification;

-- Show the wallet
SELECT 
  id as wallet_address,
  'Whitelisted' as status
FROM "FeriaNounish-Artistas"
WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b');

-- Display total count
SELECT COUNT(*) as total_whitelisted_artists FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets
SELECT id as wallet_address 
FROM "FeriaNounish-Artistas" 
ORDER BY id;
