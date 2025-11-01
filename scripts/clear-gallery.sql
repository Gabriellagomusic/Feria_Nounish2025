-- Clear all entries from the FeriaNounish - Galeria table
-- This removes all tokens that were added by the autosync script
-- Only the tokens you manually add should appear in the gallery

DELETE FROM "FeriaNounish - Galeria";

-- Verify the table is empty
SELECT COUNT(*) as remaining_entries FROM "FeriaNounish - Galeria";
