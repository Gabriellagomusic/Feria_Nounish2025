-- Add multiple wallet addresses to the FeriaNounish-Artistas whitelist
-- This script adds 17 new artist wallet addresses

INSERT INTO "FeriaNounish-Artistas" (id)
VALUES 
  ('0x2d8afe927a278f9bfa19cdd44780d85916103f49'),
  ('0xf9a74d47f4a80f0f06c866fb538538fcc2f318ad'),
  ('0x19af62b364ea4a8d4a9ecc7bebf5e833d87acff8'),
  ('0x9b272dbdb8341c415966be08ee21a245cf43ccfb'),
  ('0x278f4c6162b0d6f076971316b0d6449e5f70fb17'),
  ('0xada34f6cfe8903888fadebc6e9465a9689590262'),
  ('0xeb766dea5e25def78020e19525b38db23ada1cdd'),
  ('0xbe471ebdccf2916b86111ae5aafeb59f6b8d1ebc'),
  ('0xf40453f9c8a342e2ccc88e961f464ce84996f7ac'),
  ('0x515cc245126e5a947b5d2d13f480eaeaf7ee5197'),
  ('0x0bf8434ba6307580a850963ecfc7401cbecfdf95'),
  ('0xa0d35d27ff367dca053818e8dbbae9a9061125e2'),
  ('0xbdee8d04c4e62ac960eb373f78b6a1bc751a529b'),
  ('0x0dbdd1d1b6557877b99db23ee3956c4f995e9e8c'),
  ('0xdd471a9005bdc3291e71e6fcf7db0c62c91ee370'),
  ('0x895c67e208634bf16ff414f220de193f43051570'),
  ('0x60b9ac9ad0fdbab292f42fb1386aa6f33ba6033c')
ON CONFLICT (id) DO NOTHING;

-- Verify the wallets were added
SELECT id FROM "FeriaNounish-Artistas" 
WHERE id IN (
  '0x2d8afe927a278f9bfa19cdd44780d85916103f49',
  '0xf9a74d47f4a80f0f06c866fb538538fcc2f318ad',
  '0x19af62b364ea4a8d4a9ecc7bebf5e833d87acff8',
  '0x9b272dbdb8341c415966be08ee21a245cf43ccfb',
  '0x278f4c6162b0d6f076971316b0d6449e5f70fb17',
  '0xada34f6cfe8903888fadebc6e9465a9689590262',
  '0xeb766dea5e25def78020e19525b38db23ada1cdd',
  '0xbe471ebdccf2916b86111ae5aafeb59f6b8d1ebc',
  '0xf40453f9c8a342e2ccc88e961f464ce84996f7ac',
  '0x515cc245126e5a947b5d2d13f480eaeaf7ee5197',
  '0x0bf8434ba6307580a850963ecfc7401cbecfdf95',
  '0xa0d35d27ff367dca053818e8dbbae9a9061125e2',
  '0xbdee8d04c4e62ac960eb373f78b6a1bc751a529b',
  '0x0dbdd1d1b6557877b99db23ee3956c4f995e9e8c',
  '0xdd471a9005bdc3291e71e6fcf7db0c62c91ee370',
  '0x895c67e208634bf16ff414f220de193f43051570',
  '0x60b9ac9ad0fdbab292f42fb1386aa6f33ba6033c'
)
ORDER BY id;

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_artists FROM "FeriaNounish-Artistas";
