import { createClient } from "@supabase/supabase-js"

// Supabase client configuration
// You need to add these environment variables in Vercel:
// 1. NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
// 2. NEXT_PUBLIC_SUPABASE_ANON_KEY - Your Supabase anonymous/public key

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel project.",
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type for the Artistas table
export interface Artista {
  id: string
  nombre: string
  wallet_address: string
  farcaster_username?: string
  created_at: string
  updated_at?: string
}
