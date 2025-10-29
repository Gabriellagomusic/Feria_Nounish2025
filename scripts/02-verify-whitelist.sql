-- Verify the whitelist table contents
SELECT 
  id as wallet_address,
  COUNT(*) OVER() as total_rows
FROM "FeriaNounish-Artistas"
ORDER BY id;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'FeriaNounish-Artistas';
