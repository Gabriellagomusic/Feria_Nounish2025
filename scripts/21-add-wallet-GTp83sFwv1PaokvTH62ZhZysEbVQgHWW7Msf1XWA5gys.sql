-- Add Solana wallet GTp83sFwv1PaokvTH62ZhZysEbVQgHWW7Msf1XWA5gys to the artist whitelist
-- Note: This appears to be a Solana address, not an Ethereum address
-- The app primarily uses Ethereum addresses on Base network

-- Step 1: Check if the wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE id = 'GTp83sFwv1PaokvTH62ZhZysEbVQgHWW7Msf1XWA5gys'
        )
        THEN '✅ Wallet already exists in whitelist'
        ELSE '❌ Wallet not found - will be added'
    END as status;

-- Step 2: Insert the wallet (will skip if already exists)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('GTp83sFwv1PaokvTH62ZhZysEbVQgHWW7Msf1XWA5gys')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet was added successfully
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "FeriaNounish-Artistas" 
            WHERE id = 'GTp83sFwv1PaokvTH62ZhZysEbVQgHWW7Msf1XWA5gys'
        )
        THEN '✅ Wallet successfully whitelisted'
        ELSE '❌ Error: Wallet not found after insertion'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT 
    COUNT(*) as total_whitelisted_artists,
    '🎨 Total artists in whitelist' as description
FROM "FeriaNounish-Artistas";

-- Step 5: Display all whitelisted wallets for verification
SELECT 
    id as wallet_address,
    CASE 
        WHEN id LIKE '0x%' THEN '🔷 Ethereum'
        ELSE '🟣 Solana'
    END as network
FROM "FeriaNounish-Artistas"
ORDER BY id;
