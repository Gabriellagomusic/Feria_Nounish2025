-- Add wallet address 0x747c4F648449938E226736183073b8eBa51E030E to the FeriaNounish-Artistas whitelist table

-- Insert the wallet address (normalized to lowercase for consistency)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0x747c4f648449938e226736183073b8eba51e030e')
ON CONFLICT (id) DO NOTHING;

-- Verify the insert
SELECT * FROM "FeriaNounish-Artistas" WHERE id = '0x747c4f648449938e226736183073b8eba51e030e';

-- Show all whitelisted addresses
SELECT * FROM "FeriaNounish-Artistas" ORDER BY id;
