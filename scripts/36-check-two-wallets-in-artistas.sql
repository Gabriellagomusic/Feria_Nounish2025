-- Check if specific wallets are in the FeriaNounish-Artistas table
-- Wallets to verify:
-- - 0xe530231aA49036f955e90Cb015B98a7dd895E2db
-- - 0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c

-- Check for the first wallet
SELECT 
    'Wallet 1 Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(wallet_address) = LOWER('0xe530231aA49036f955e90Cb015B98a7dd895E2db')
        ) THEN '✓ FOUND in whitelist'
        ELSE '✗ NOT FOUND in whitelist'
    END as status,
    '0xe530231aA49036f955e90Cb015B98a7dd895E2db' as wallet_address;

-- Check for the second wallet
SELECT 
    'Wallet 2 Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE LOWER(wallet_address) = LOWER('0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c')
        ) THEN '✓ FOUND in whitelist'
        ELSE '✗ NOT FOUND in whitelist'
    END as status,
    '0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c' as wallet_address;

-- Show detailed info if they exist
SELECT 
    wallet_address,
    created_at,
    CASE 
        WHEN wallet_address LIKE '0x%' THEN 'Ethereum/Base'
        ELSE 'Solana'
    END as network_type
FROM "FeriaNounish-Artistas"
WHERE LOWER(wallet_address) IN (
    LOWER('0xe530231aA49036f955e90Cb015B98a7dd895E2db'),
    LOWER('0xc14410C7fF7806A8D9445b0f7ff33f51A8c62b3c')
)
ORDER BY created_at DESC;

-- Show total count
SELECT 
    COUNT(*) as total_whitelisted_wallets,
    COUNT(CASE WHEN wallet_address LIKE '0x%' THEN 1 END) as ethereum_base_wallets,
    COUNT(CASE WHEN wallet_address NOT LIKE '0x%' THEN 1 END) as solana_wallets
FROM "FeriaNounish-Artistas";
