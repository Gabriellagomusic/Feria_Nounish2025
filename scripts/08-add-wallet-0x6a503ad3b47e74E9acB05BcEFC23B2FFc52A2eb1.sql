-- Add wallet 0x6a503ad3b47e74E9acB05BcEFC23B2FFc52A2eb1 to the artist whitelist
-- This wallet will be able to create and manage tokens in the Feria Nounish platform

-- Insert the wallet address (normalized to lowercase)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0x6a503ad3b47e74e9acb05bcefc23b2ffc52a2eb1')
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT * FROM "FeriaNounish-Artistas" 
WHERE id = '0x6a503ad3b47e74e9acb05bcefc23b2ffc52a2eb1';

-- Show total count of whitelisted artists
SELECT COUNT(*) as total_artists FROM "FeriaNounish-Artistas";
