-- Add the specific tokens that should be in the FeriaNounish - Galeria
INSERT INTO "FeriaNounish - Galeria" (id)
VALUES 
  ('0xfaa54c8258b419ab0411da8ddc1985f42f98f59b-1'),
  ('0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5-1'),
  ('0x1d8a08f6703cbd7c21df0a9c20b642ee1994991c-1'),
  ('0x13f1d3862310ffe4d677dff7bfee91fde78ddb0f-1')
ON CONFLICT (id) DO NOTHING;
