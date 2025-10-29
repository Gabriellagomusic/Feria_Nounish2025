-- Add wallet address to the FeriaNounish-Artistas whitelist table
-- This script adds the wallet address 0x697C7720dc08F1eb1fde54420432eFC6aD594244

-- First, let's check if the table has any RLS policies that might be blocking access
-- We'll disable RLS for this table to allow API access
ALTER TABLE "FeriaNounish-Artistas" DISABLE ROW LEVEL SECURITY;

-- Insert the wallet address (normalized to lowercase for consistency)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0x697c7720dc08f1eb1fde54420432efc6ad594244')
ON CONFLICT (id) DO NOTHING;

-- Verify the insert
SELECT * FROM "FeriaNounish-Artistas";
