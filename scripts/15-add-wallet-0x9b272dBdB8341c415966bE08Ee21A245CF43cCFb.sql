-- Add wallet 0x9b272dBdB8341c415966bE08Ee21A245CF43cCFb to the artist whitelist
-- This wallet was in the master CSV list but may not have been added yet

-- Insert the wallet address (normalized to lowercase)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0x9b272dbdb8341c415966be08ee21a245cf43ccfb')
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "FeriaNounish-Artistas" 
      WHERE id = '0x9b272dbdb8341c415966be08ee21a245cf43ccfb'
    ) 
    THEN '✓ Wallet successfully added/verified'
    ELSE '✗ ERROR: Wallet not found'
  END as status;

-- Show the specific wallet
SELECT id as wallet_address 
FROM "FeriaNounish-Artistas" 
WHERE id = '0x9b272dbdb8341c415966be08ee21a245cf43ccfb';

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists 
FROM "FeriaNounish-Artistas";
