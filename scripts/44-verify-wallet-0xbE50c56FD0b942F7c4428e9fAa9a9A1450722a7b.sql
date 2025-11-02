-- Verify wallet 0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b is in the whitelist
-- This script checks if the wallet exists in the FeriaNounish-Artistas table

-- Check if the wallet exists (case-insensitive)
SELECT 
  id as wallet_address,
  created_at,
  CASE 
    WHEN id = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b') THEN '✓ VERIFIED - Wallet is whitelisted'
    ELSE '✗ NOT FOUND'
  END as status
FROM "FeriaNounish-Artistas"
WHERE LOWER(id) = LOWER('0xbE50c56FD0b942F7c4428e9fAa9a9A1450722a7b');

-- If no rows returned, the wallet is NOT in the whitelist
-- If a row is returned with status '✓ VERIFIED', the wallet IS whitelisted

-- Also show total count of whitelisted wallets for context
SELECT 
  COUNT(*) as total_whitelisted_wallets,
  'Total artists in whitelist' as description
FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets for reference
SELECT 
  id as wallet_address,
  created_at
FROM "FeriaNounish-Artistas"
ORDER BY created_at DESC;
