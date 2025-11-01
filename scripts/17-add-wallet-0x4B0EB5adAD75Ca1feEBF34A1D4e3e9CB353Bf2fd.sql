-- Add wallet 0x4B0EB5adAD75Ca1feEBF34A1D4e3e9CB353Bf2fd to the artist whitelist
-- This wallet should be normalized to lowercase to match the API logic

-- Step 1: Check if wallet already exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE id = '0x4b0eb5adad75ca1feebf34a1d4e3e9cb353bf2fd'
    )
    THEN '⚠️ Wallet already exists in whitelist'
    ELSE '✓ Wallet not found, will be added'
  END as status;

-- Step 2: Insert the wallet (lowercase normalized)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0x4b0eb5adad75ca1feebf34a1d4e3e9cb353bf2fd')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet was added successfully
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE id = '0x4b0eb5adad75ca1feebf34a1d4e3e9cb353bf2fd'
    )
    THEN '✓ SUCCESS: Wallet 0x4b0eb5adad75ca1feebf34a1d4e3e9cb353bf2fd is now whitelisted'
    ELSE '✗ ERROR: Wallet not found in whitelist after insertion'
  END as verification_result;

-- Step 4: Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists
FROM "FeriaNounish-Artistas";

-- Step 5: Show all whitelisted wallets for reference (sorted)
SELECT id as whitelisted_wallet
FROM "FeriaNounish-Artistas"
ORDER BY id;
