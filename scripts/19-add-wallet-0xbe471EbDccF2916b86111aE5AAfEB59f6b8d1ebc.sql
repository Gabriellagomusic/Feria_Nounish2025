-- Script to add wallet 0xbe471EbDccF2916b86111aE5AAfEB59f6b8d1ebc to the FeriaNounish artist whitelist
-- This wallet will be able to create and manage NFT collections

-- Step 1: Check if the wallet already exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xbe471EbDccF2916b86111aE5AAfEB59f6b8d1ebc')
        ) 
        THEN 'Wallet already exists in whitelist'
        ELSE 'Wallet not found, will be added'
    END as status;

-- Step 2: Insert the wallet address (will skip if already exists due to ON CONFLICT)
INSERT INTO "FeriaNounish-Artistas" (id)
VALUES ('0xbe471ebdccf2916b86111ae5aafeb59f6b8d1ebc')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the wallet was added successfully
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM "FeriaNounish-Artistas" 
            WHERE LOWER(id) = LOWER('0xbe471EbDccF2916b86111aE5AAfEB59f6b8d1ebc')
        ) 
        THEN '✅ Wallet 0xbe471EbDccF2916b86111aE5AAfEB59f6b8d1ebc is now whitelisted'
        ELSE '❌ Error: Wallet was not added to whitelist'
    END as verification;

-- Step 4: Show total count of whitelisted artists
SELECT COUNT(*) as total_whitelisted_artists 
FROM "FeriaNounish-Artistas";

-- Step 5: List all whitelisted wallets for verification
SELECT id as whitelisted_wallet_address 
FROM "FeriaNounish-Artistas" 
ORDER BY id;
