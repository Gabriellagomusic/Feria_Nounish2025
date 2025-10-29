-- Add wallet 0x4e2a3A65D0E2bcdb507a70fE2D3fc5dff464aa25 to the artist whitelist
-- This wallet will have access to the /perfil and /crear pages

INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0x4e2a3a65d0e2bcdb507a70fe2d3fc5dff464aa25')
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT * FROM "FeriaNounish-Artistas" WHERE id = '0x4e2a3a65d0e2bcdb507a70fe2d3fc5dff464aa25';

-- Show all whitelisted wallets
SELECT * FROM "FeriaNounish-Artistas" ORDER BY id;
