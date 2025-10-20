import { createClient } from "@supabase/supabase-js"

// Server-side Supabase client using service role key
// This should ONLY be used on the server (API routes, Server Actions, etc.)
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Types for the Artistas table
export interface Artist {
  id?: number
  wallet_address: string
  farcaster_username?: string
  display_name: string
  created_at?: string
  updated_at?: string
}

// Helper functions to interact with the Artistas table
export async function getArtistByWallet(walletAddress: string): Promise<Artist | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("artistas")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single()

  if (error) {
    console.error("Error fetching artist:", error)
    return null
  }

  return data
}

export async function getAllArtists(): Promise<Artist[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("artistas").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching artists:", error)
    return []
  }

  return data || []
}

export async function createOrUpdateArtist(artist: Artist): Promise<Artist | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("artistas")
    .upsert(
      {
        wallet_address: artist.wallet_address.toLowerCase(),
        farcaster_username: artist.farcaster_username,
        display_name: artist.display_name,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "wallet_address",
      },
    )
    .select()
    .single()

  if (error) {
    console.error("Error creating/updating artist:", error)
    return null
  }

  return data
}
