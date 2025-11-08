-- Script 35: Verify and add two Ethereum/Base wallets to whitelist
-- Wallets: 0xe530231aA49036f955e90Cb015B98a7dd895E2db and 0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c
-- Created: 2025-11-07

-- First, check if either wallet already exists
SELECT 
  wallet_address,
  network_type,
  created_at,
  CASE 
    WHEN wallet_address = '0xe530231aA49036f955e90Cb015B98a7dd895E2db' THEN 'Wallet 1 - Already exists'
    WHEN wallet_address = '0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c' THEN 'Wallet 2 - Already exists'
  END as status
FROM whitelisted_artists
WHERE wallet_address IN (
  '0xe530231aA49036f955e90Cb015B98a7dd895E2db',
  '0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c'
);

-- Add both wallets (will be skipped if they already exist due to ON CONFLICT)
INSERT INTO whitelisted_artists (wallet_address, network_type)
VALUES 
  ('0xe530231aA49036f955e90Cb015B98a7dd895E2db', 'evm'),
  ('0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c', 'evm')
ON CONFLICT (wallet_address) DO NOTHING;

-- Verify both wallets are now in the whitelist
SELECT 
  wallet_address,
  network_type,
  created_at,
  CASE 
    WHEN wallet_address = '0xe530231aA49036f955e90Cb015B98a7dd895E2db' THEN '✓ Wallet 1 - Verified'
    WHEN wallet_address = '0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c' THEN '✓ Wallet 2 - Verified'
  END as status
FROM whitelisted_artists
WHERE wallet_address IN (
  '0xe530231aA49036f955e90Cb015B98a7dd895E2db',
  '0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c'
)
ORDER BY wallet_address;

-- Show total counts by network type
SELECT 
  network_type,
  COUNT(*) as total_wallets,
  CASE network_type
    WHEN 'evm' THEN 'Ethereum/Base wallets'
    WHEN 'solana' THEN 'Solana wallets'
  END as description
FROM whitelisted_artists
GROUP BY network_type
ORDER BY network_type;

-- Show grand total
SELECT COUNT(*) as total_whitelisted_artists
FROM whitelisted_artists;
