-- Check existing wallet format in FeriaNounish-Artistas table
-- Then add the two new wallets in the correct format

-- First, see what existing wallets look like
SELECT id as wallet_address, length(id) as address_length
FROM "FeriaNounish-Artistas"
LIMIT 10;

-- Check if our specific wallets already exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM "FeriaNounish-Artistas" WHERE id = '0xe530231aA49036f955e90Cb015B98a7dd895E2db') 
        THEN 'EXISTS' 
        ELSE 'NOT FOUND' 
    END as wallet_1_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM "FeriaNounish-Artistas" WHERE id = '0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c') 
        THEN 'EXISTS' 
        ELSE 'NOT FOUND' 
    END as wallet_2_status;

-- Insert the wallets (with lowercase addresses to match Ethereum standard)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES 
    ('0xe530231aa49036f955e90cb015b98a7dd895e2db'),
    ('0xc14410c7ff7806a8d9445b0f7ff33f51a8c62b3c')
ON CONFLICT (id) DO NOTHING;

-- Verify they were added (checking both lowercase and mixed case)
SELECT id as wallet_address
FROM "FeriaNounish-Artistas"
WHERE id IN (
    '0xe530231aA49036f955e90Cb015B98a7dd895E2db',
    '0xe530231aa49036f955e90cb015b98a7dd895e2db',
    '0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c',
    '0xc14410c7ff7806a8d9445b0f7ff33f51a8c62b3c'
);

-- Show total count
SELECT COUNT(*) as total_whitelisted_artists
FROM "FeriaNounish-Artistas";
