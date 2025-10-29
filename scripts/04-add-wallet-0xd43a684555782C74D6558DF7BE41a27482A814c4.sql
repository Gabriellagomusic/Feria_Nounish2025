-- Add wallet 0xd43a684555782C74D6558DF7BE41a27482A814c4 to the artist whitelist
-- This wallet will be able to create and mint NFTs on the platform

INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0xd43a684555782c74d6558df7be41a27482a814c4')
ON CONFLICT (id) DO NOTHING;

-- Verify the wallet was added
SELECT * FROM "FeriaNounish-Artistas" 
WHERE id = '0xd43a684555782c74d6558df7be41a27482a814c4';

-- Show all whitelisted artists
SELECT * FROM "FeriaNounish-Artistas" ORDER BY id;
