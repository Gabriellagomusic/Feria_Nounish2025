-- Add wallet 0x6c4dc8711eb8FeD1B6869df46ECbB72F2Fd59f74 to the whitelist
-- and verify all whitelisted wallets have no errors

-- Insert the new wallet address (normalized to lowercase)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0x6c4dc8711eb8fed1b6869df46ecbb72f2fd59f74')
ON CONFLICT (id) DO NOTHING;

-- Verification queries

-- 1. Verify the new wallet was added
SELECT 'New wallet verification:' as check_type, id 
FROM "FeriaNounish-Artistas" 
WHERE id = '0x6c4dc8711eb8fed1b6869df46ecbb72f2fd59f74';

-- 2. Check for any duplicate entries (should return 0 rows)
SELECT 'Duplicate check:' as check_type, id, COUNT(*) as count
FROM "FeriaNounish-Artistas"
GROUP BY id
HAVING COUNT(*) > 1;

-- 3. Check for any invalid address formats (addresses should be 42 characters: 0x + 40 hex chars)
SELECT 'Invalid format check:' as check_type, id, LENGTH(id) as length
FROM "FeriaNounish-Artistas"
WHERE LENGTH(id) != 42 OR id NOT LIKE '0x%';

-- 4. Check for any uppercase characters (all should be lowercase)
SELECT 'Uppercase check:' as check_type, id
FROM "FeriaNounish-Artistas"
WHERE id != LOWER(id);

-- 5. Check for any NULL or empty values
SELECT 'NULL/Empty check:' as check_type, id
FROM "FeriaNounish-Artistas"
WHERE id IS NULL OR id = '';

-- 6. List all whitelisted wallets (sorted)
SELECT 'All whitelisted wallets:' as check_type, id
FROM "FeriaNounish-Artistas"
ORDER BY id;

-- 7. Total count of whitelisted wallets
SELECT 'Total count:' as check_type, COUNT(*) as total_wallets
FROM "FeriaNounish-Artistas";

-- Summary: If all verification queries return no errors, the whitelist is clean
SELECT 'Verification complete!' as status;
