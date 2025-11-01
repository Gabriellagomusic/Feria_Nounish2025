-- Add wallet 0x4eA79203B3e65fa62E24F1a844E22e1688Fb553C to the artist whitelist
-- This script ensures the wallet is properly whitelisted for creating content

-- Step 1: Check if wallet already exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE LOWER(id) = LOWER('0x4eA79203B3e65fa62E24F1a844E22e1688Fb553C')
    )
    THEN '⚠️ Wallet already exists in whitelist'
    ELSE '➕ Wallet will be added to whitelist'
  END as pre_check_status;

-- Step 2: Insert the wallet address (lowercase for consistency)
-- Using ON CONFLICT DO NOTHING to avoid errors if already exists
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES (LOWER('0x4eA79203B3e65fa62E24F1a844E22e1688Fb553C'))
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet was added successfully
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE LOWER(id) = LOWER('0x4eA79203B3e65fa62E24F1a844E22e1688Fb553C')
    )
    THEN '✓ SUCCESS: Wallet 0x4ea79203b3e65fa62e24f1a844e22e1688fb553c is now whitelisted'
    ELSE '✗ ERROR: Wallet not found in whitelist after insertion'
  END as verification_status;

-- Step 4: Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists
FROM "FeriaNounish-Artistas";

-- Step 5: Show all whitelisted wallets for reference (sorted)
SELECT id as whitelisted_wallet
FROM "FeriaNounish-Artistas"
ORDER BY id;
