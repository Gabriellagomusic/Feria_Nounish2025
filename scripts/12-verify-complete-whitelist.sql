-- Script 12: Verify and sync complete whitelist with master CSV
-- This script ensures all 23 addresses from the master list are in the whitelist
-- Date: 2025-01-31

-- Insert all addresses from the master CSV list
-- Using ON CONFLICT to safely handle any duplicates
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
  ('0x60b9ac9ad0fdbab292f42fb1386aa6f33ba6033c'),
  ('0x6a503ad3b47e74e9acb05bcefc23b2ffc52a2eb1'),
  ('0xb759931af6d1175b2cdb89b7a2f600612f627025'),
  ('0x548eee691dd4382161f7a8025e7a0f44e492d82b'),
  ('0x79703412dc788bf15b8343db140e1c71a6849e61'),
  ('0xc65e7d58d92de47ad0d668bb99b6ddfda64c6732'),
  ('0xb3a60ebe19ea932e4aa76fa2878ebc1e303f3ec2')
ON CONFLICT (id) DO NOTHING;

-- Verification: Check that all 23 addresses from the master list are present
SELECT 
  'Verification: All addresses from master CSV' as check_name,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) = 23 THEN '✓ PASS - All 23 addresses present'
    ELSE '✗ FAIL - Missing ' || (23 - COUNT(*)) || ' addresses'
  END as status
FROM "FeriaNounish-Artistas"
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
  '0x60b9ac9ad0fdbab292f42fb1386aa6f33ba6033c',
  '0x6a503ad3b47e74e9acb05bcefc23b2ffc52a2eb1',
  '0xb759931af6d1175b2cdb89b7a2f600612f627025',
  '0x548eee691dd4382161f7a8025e7a0f44e492d82b',
  '0x79703412dc788bf15b8343db140e1c71a6849e61',
  '0xc65e7d58d92de47ad0d668bb99b6ddfda64c6732',
  '0xb3a60ebe19ea932e4aa76fa2878ebc1e303f3ec2'
);

-- Check for any addresses NOT in the master list (potential extras)
SELECT 
  'Verification: Addresses not in master CSV' as check_name,
  COUNT(*) as extra_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS - No extra addresses'
    ELSE '⚠ WARNING - ' || COUNT(*) || ' extra addresses found'
  END as status
FROM "FeriaNounish-Artistas"
WHERE id NOT IN (
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
  '0x60b9ac9ad0fdbab292f42fb1386aa6f33ba6033c',
  '0x6a503ad3b47e74e9acb05bcefc23b2ffc52a2eb1',
  '0xb759931af6d1175b2cdb89b7a2f600612f627025',
  '0x548eee691dd4382161f7a8025e7a0f44e492d82b',
  '0x79703412dc788bf15b8343db140e1c71a6849e61',
  '0xc65e7d58d92de47ad0d668bb99b6ddfda64c6732',
  '0xb3a60ebe19ea932e4aa76fa2878ebc1e303f3ec2'
);

-- List any extra addresses if they exist
SELECT 
  'Extra addresses (not in master CSV):' as note,
  id as wallet_address
FROM "FeriaNounish-Artistas"
WHERE id NOT IN (
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
  '0x60b9ac9ad0fdbab292f42fb1386aa6f33ba6033c',
  '0x6a503ad3b47e74e9acb05bcefc23b2ffc52a2eb1',
  '0xb759931af6d1175b2cdb89b7a2f600612f627025',
  '0x548eee691dd4382161f7a8025e7a0f44e492d82b',
  '0x79703412dc788bf15b8343db140e1c71a6849e61',
  '0xc65e7d58d92de47ad0d668bb99b6ddfda64c6732',
  '0xb3a60ebe19ea932e4aa76fa2878ebc1e303f3ec2'
)
ORDER BY id;

-- Final verification: Show all whitelisted addresses
SELECT 
  'All whitelisted addresses:' as note,
  id as wallet_address
FROM "FeriaNounish-Artistas"
ORDER BY id;

-- Total count
SELECT 
  'Total whitelisted artists:' as summary,
  COUNT(*) as total_count
FROM "FeriaNounish-Artistas";
