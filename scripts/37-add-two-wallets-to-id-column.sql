-- Add two wallets to FeriaNounish-Artistas table using id column
-- Wallets: 0xe530231aA49036f955e90Cb015B98a7dd895E2db, 0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c

-- Insert the two wallets using the id column (using ON CONFLICT to prevent duplicates)
INSERT INTO "FeriaNounish-Artistas" (id, created_at)
VALUES 
  ('0xe530231aA49036f955e90Cb015B98a7dd895E2db', NOW()),
  ('0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c', NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify the wallets were added
SELECT 
  id,
  created_at,
  CASE 
    WHEN id IN ('0xe530231aA49036f955e90Cb015B98a7dd895E2db', '0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c') THEN '✓ Target Wallet'
    ELSE 'Other'
  END as status
FROM "FeriaNounish-Artistas"
WHERE id IN ('0xe530231aA49036f955e90Cb015B98a7dd895E2db', '0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c')
ORDER BY created_at DESC;

-- Show total count
SELECT COUNT(*) as total_whitelisted_wallets
FROM "FeriaNounish-Artistas";
