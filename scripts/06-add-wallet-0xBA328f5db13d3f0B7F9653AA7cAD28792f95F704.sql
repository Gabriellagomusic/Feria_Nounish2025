-- Add wallet 0xBA328f5db13d3f0B7F9653AA7cAD28792f95F704 to the artist whitelist
-- This wallet will be able to create and manage NFTs on the platform

-- Insert the wallet address (normalized to lowercase)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0xba328f5db13d3f0b7f9653aa7cad28792f95f704')
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT * FROM "FeriaNounish-Artistas" 
WHERE id = '0xba328f5db13d3f0b7f9653aa7cad28792f95f704';

-- Show all whitelisted artists
SELECT * FROM "FeriaNounish-Artistas" ORDER BY id;
