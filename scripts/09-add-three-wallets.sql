-- Add three new wallet addresses to the artist whitelist
-- Script 09: Adding wallets 0xB759931AF6d1175b2cDb89b7a2f600612F627025, 0x548EEe691DD4382161f7A8025E7A0f44e492D82B, 0x79703412dC788BF15B8343Db140e1c71a6849e61

-- Insert the wallet addresses (normalized to lowercase)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES 
  ('0xb759931af6d1175b2cdb89b7a2f600612f627025'),
  ('0x548eee691dd4382161f7a8025e7a0f44e492d82b'),
  ('0x79703412dc788bf15b8343db140e1c71a6849e61')
ON CONFLICT (id) DO NOTHING;

-- Verify the wallets were added
SELECT * FROM "FeriaNounish-Artistas" 
WHERE id IN (
  '0xb759931af6d1175b2cdb89b7a2f600612f627025',
  '0x548eee691dd4382161f7a8025e7a0f44e492d82b',
  '0x79703412dc788bf15b8343db140e1c71a6849e61'
);

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_artists FROM "FeriaNounish-Artistas";
