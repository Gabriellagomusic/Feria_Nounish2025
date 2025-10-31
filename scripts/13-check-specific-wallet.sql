-- Check if wallet 0xada34f6cFE8903888fADEBC6E9465a9689590262 is whitelisted properly

-- Check for the wallet (normalized to lowercase)
SELECT 
    id,
    'FOUND - Wallet is whitelisted' as status
FROM "FeriaNounish-Artistas"
WHERE id = '0xada34f6cfe8903888fadebc6e9465a9689590262';

-- Check if there are any case variations of this address
SELECT 
    id,
    'WARNING - Found with different case' as status
FROM "FeriaNounish-Artistas"
WHERE LOWER(id) = '0xada34f6cfe8903888fadebc6e9465a9689590262'
  AND id != '0xada34f6cfe8903888fadebc6e9465a9689590262';

-- Show total count of whitelisted wallets
SELECT 
    COUNT(*) as total_whitelisted_wallets,
    'Total wallets in whitelist' as description
FROM "FeriaNounish-Artistas";

-- List all whitelisted wallets for reference
SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY id) as row_number
FROM "FeriaNounish-Artistas"
ORDER BY id;
