-- Add two wallets to FeriaNounish-Artistas table (id column only)
-- Wallets: 0xe530231aA49036f955e90Cb015B98a7dd895E2db and 0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c

-- Insert first wallet
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0xe530231aA49036f955e90Cb015B98a7dd895E2db')
ON CONFLICT (id) DO NOTHING;

-- Insert second wallet
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c')
ON CONFLICT (id) DO NOTHING;

-- Verify both wallets are in the table
SELECT id 
FROM "FeriaNounish-Artistas"
WHERE id IN ('0xe530231aA49036f955e90Cb015B98a7dd895E2db', '0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c')
ORDER BY id;

-- Show total count
SELECT COUNT(*) as total_whitelisted_wallets
FROM "FeriaNounish-Artistas";
