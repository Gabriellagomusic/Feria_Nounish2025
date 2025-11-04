-- Verification script for Solana wallet GTp83sFwv1PaokvTH62ZhZysEbVQgHWW7Msf1XWA5gys
-- This script checks if the wallet is properly whitelisted in the FeriaNounish-Artistas table

-- Step 1: Check if the specific wallet exists in the whitelist
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE id = 'GTp83sFwv1PaokvTH62ZhZysEbVQgHWW7Msf1XWA5gys'
        )
        THEN '✅ VERIFIED: Wallet GTp83sFwv1PaokvTH62ZhZysEbVQgHWW7Msf1XWA5gys is whitelisted'
        ELSE '❌ NOT FOUND: Wallet is not in the whitelist'
    END as verification_status;

-- Step 2: Show the wallet details if it exists
SELECT 
    id as wallet_address,
    'Solana Network' as network_type,
    '✅ Whitelisted Artist' as status
FROM "FeriaNounish-Artistas"
WHERE id = 'GTp83sFwv1PaokvTH62ZhZysEbVQgHWW7Msf1XWA5gys';

-- Step 3: Show total count of whitelisted artists
SELECT 
    COUNT(*) as total_whitelisted_artists,
    'Total artists in whitelist' as description
FROM "FeriaNounish-Artistas";

-- Step 4: Show breakdown by network type
SELECT 
    CASE 
        WHEN id LIKE '0x%' THEN 'Ethereum/Base'
        ELSE 'Solana'
    END as network,
    COUNT(*) as count
FROM "FeriaNounish-Artistas"
GROUP BY 
    CASE 
        WHEN id LIKE '0x%' THEN 'Ethereum/Base'
        ELSE 'Solana'
    END
ORDER BY network;

-- Step 5: List all whitelisted wallets (for reference)
SELECT 
    id as wallet_address,
    CASE 
        WHEN id LIKE '0x%' THEN 'Ethereum/Base'
        ELSE 'Solana'
    END as network
FROM "FeriaNounish-Artistas"
ORDER BY 
    CASE 
        WHEN id LIKE '0x%' THEN 1
        ELSE 2
    END,
    id;
