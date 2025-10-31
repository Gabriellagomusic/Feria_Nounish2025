-- Add 5 wallet addresses to the FeriaNounish-Artistas whitelist
-- This script checks for duplicates automatically using ON CONFLICT
-- Note: 3 of these addresses may already exist from script 09

-- Insert wallet addresses (normalized to lowercase)
-- ON CONFLICT will skip any addresses that already exist
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES 
  ('0xc65e7d58d92de47ad0d668bb99b6ddfda64c6732'),
  ('0xb3a60ebe19ea932e4aa76fa2878ebc1e303f3ec2'),
  ('0xb759931af6d1175b2cdb89b7a2f600612f627025'),
  ('0x548eee691dd4382161f7a8025e7a0f44e492d82b'),
  ('0x79703412dc788bf15b8343db140e1c71a6849e61')
ON CONFLICT (id) DO NOTHING;

-- Verify all 5 addresses are now in the whitelist
SELECT id FROM "FeriaNounish-Artistas" 
WHERE id IN (
  '0xc65e7d58d92de47ad0d668bb99b6ddfda64c6732',
  '0xb3a60ebe19ea932e4aa76fa2878ebc1e303f3ec2',
  '0xb759931af6d1175b2cdb89b7a2f600612f627025',
  '0x548eee691dd4382161f7a8025e7a0f44e492d82b',
  '0x79703412dc788bf15b8343db140e1c71a6849e61'
)
ORDER BY id;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_artists FROM "FeriaNounish-Artistas";
