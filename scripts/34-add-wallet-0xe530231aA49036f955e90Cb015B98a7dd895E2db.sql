-- Add Ethereum/Base wallet to whitelist: 0xe530231aA49036f955e90Cb015B98a7dd895E2db
-- This script checks if the wallet exists and adds it if not

-- Check if wallet already exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE id = '0xe530231aA49036f955e90Cb015B98a7dd895E2db'
    ) 
    THEN '✅ Wallet already exists in whitelist'
    ELSE '❌ Wallet not found, will be added'
  END as status;

-- Insert wallet if it doesn't exist (using ON CONFLICT to avoid duplicates)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0xe530231aA49036f955e90Cb015B98a7dd895E2db')
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT 
  id,
  CASE 
    WHEN id LIKE '0x%' THEN 'Ethereum/Base'
    ELSE 'Solana'
  END as network_type
FROM "FeriaNounish-Artistas"
WHERE id = '0xe530231aA49036f955e90Cb015B98a7dd895E2db';

-- Show total count of whitelisted addresses
SELECT 
  COUNT(*) as total_whitelisted_addresses,
  COUNT(CASE WHEN id LIKE '0x%' THEN 1 END) as ethereum_base_addresses,
  COUNT(CASE WHEN id NOT LIKE '0x%' THEN 1 END) as solana_addresses
FROM "FeriaNounish-Artistas";

-- Success message
SELECT '✅ Wallet 0xe530231aA49036f955e90Cb015B98a7dd895E2db has been verified and added to the whitelist!' as result;
