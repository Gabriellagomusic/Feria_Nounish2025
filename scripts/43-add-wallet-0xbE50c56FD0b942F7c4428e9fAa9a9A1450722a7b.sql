-- Add wallet 0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b to the artist whitelist

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
INSERT INTO "FeriaNounish-Artistas" (id, created_at)
SELECT 
  LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b'),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "FeriaNounish-Artistas" 
  WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b')
);

-- Verify the wallet was added
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b')
    ) 
    THEN '✓ Wallet successfully added/verified in whitelist'
    ELSE '✗ Error: Wallet was not added'
  END as verification;

-- Display all whitelisted artists for confirmation
SELECT id as wallet_address, created_at 
FROM "FeriaNounish-Artistas" 
ORDER BY created_at DESC;
