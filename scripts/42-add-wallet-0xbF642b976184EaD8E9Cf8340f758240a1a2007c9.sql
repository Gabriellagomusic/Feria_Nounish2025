-- Script 42: Add wallet 0xbF642b976184EaD8E9Cf8340f758240a1a2007c9 to artist whitelist
-- Created: 2025
-- Purpose: Whitelist artist wallet for Feria Nounish platform access

-- Check if wallet already exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE LOWER(id) = LOWER('0xbF642b976184EaD8E9Cf8340f758240a1a2007c9')
    ) 
    THEN 'Wallet already exists in whitelist'
    ELSE 'Wallet not found, will be added'
  END as status;

-- Insert wallet (lowercase for consistency, will skip if already exists)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0xbF642b976184EaD8E9Cf8340f758240a1a2007c9'))
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE LOWER(id) = LOWER('0xbF642b976184EaD8E9Cf8340f758240a1a2007c9')
    ) 
    THEN '✓ Wallet successfully whitelisted'
    ELSE '✗ Error: Wallet not found after insertion'
  END as verification;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists 
FROM "FeriaNounish-Artistas";

-- Show all whitelisted wallets (for verification)
SELECT id as whitelisted_wallet 
FROM "FeriaNounish-Artistas" 
ORDER BY id;
