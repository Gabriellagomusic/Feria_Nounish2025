# Configuración de Supabase

Para conectar tu tabla de Supabase "Feria Nounish - Artistas", necesitas agregar las siguientes variables de entorno en Vercel:

## Variables de Entorno Requeridas

### 1. SUPABASE_URL
- **Descripción**: La URL de tu proyecto de Supabase
- **Dónde encontrarla**: 
  1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
  2. Ve a Settings → API
  3. Copia el valor de "Project URL"
- **Ejemplo**: `https://tu-proyecto.supabase.co`
- **IMPORTANTE**: Esta variable NO tiene el prefijo `NEXT_PUBLIC_` porque solo se usa en el servidor

### 2. SUPABASE_SERVICE_ROLE_KEY
- **Descripción**: La clave de servicio (service role key) de tu proyecto de Supabase
- **Dónde encontrarla**:
  1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
  2. Ve a Settings → API
  3. Copia el valor de "service_role" key (NO la "anon public" key)
- **Ejemplo**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **IMPORTANTE**: 
  - Esta es la clave más segura que tiene permisos completos
  - NO tiene el prefijo `NEXT_PUBLIC_` para que NUNCA se exponga al cliente
  - Solo se usa en el servidor (API routes)

## ¿Por qué usar service_role key en lugar de anon key?

- **service_role key**: Tiene permisos completos y se mantiene segura en el servidor
- **anon key**: Es pública y tiene permisos limitados por Row Level Security (RLS)
- Para esta aplicación, usamos service_role key porque:
  1. Todas las llamadas a Supabase se hacen desde API routes del servidor
  2. No se expone al cliente
  3. Tenemos control total sobre los permisos

## Cómo Agregar las Variables en Vercel

### Opción 1: Desde el Dashboard de Vercel
1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Ve a Settings → Environment Variables
3. Agrega cada variable:
   - Name: `SUPABASE_URL`
   - Value: [Tu URL de Supabase]
   - Environment: Production, Preview, Development
4. Repite para `SUPABASE_SERVICE_ROLE_KEY`
5. Haz un nuevo deploy para que las variables tomen efecto

### Opción 2: Desde v0 (Recomendado)
1. Abre el sidebar izquierdo en v0
2. Ve a la sección "Vars"
3. Agrega las variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Uso en el Código

El código ya está configurado para usar estas variables. Ejemplos:

\`\`\`typescript
// En API routes (servidor)
import { getArtistByWallet, getAllArtists } from '@/lib/supabase-server'

// Obtener artista por wallet
const artist = await getArtistByWallet('0x...')

// Obtener todos los artistas
const artists = await getAllArtists()
\`\`\`

\`\`\`typescript
// Desde el cliente (llamando a las API routes)
const response = await fetch('/api/artists/0x...')
const artist = await response.json()
\`\`\`

## Estructura de la Tabla "artistas"

La tabla debe tener las siguientes columnas:
- `id` (int8 o uuid, primary key, auto-increment)
- `wallet_address` (text, unique, not null)
- `farcaster_username` (text, nullable)
- `display_name` (text, not null)
- `created_at` (timestamp, default: now())
- `updated_at` (timestamp, nullable)

## API Routes Disponibles

Una vez configuradas las variables, puedes usar:

- `GET /api/artists` - Obtener todos los artistas
- `GET /api/artists/[wallet]` - Obtener artista por wallet address
