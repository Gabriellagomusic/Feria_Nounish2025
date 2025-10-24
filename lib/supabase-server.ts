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

// Types for the "FeriaNounish-Artistas" table
export interface Artist {
  "Wallet Artista": string
}

// Helper functions to interact with the "FeriaNounish-Artistas" table
export async function getArtistByWallet(walletAddress: string): Promise<Artist | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("FeriaNounish-Artistas")
    .select("*")
    .eq("Wallet Artista", walletAddress)
    .single()

  if (error) {
    console.error("Error fetching artist:", error)
    return null
  }

  return data
}

export async function getAllArtists(): Promise<Artist[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("FeriaNounish-Artistas").select("*")

  if (error) {
    console.error("Error fetching artists:", error)
    return []
  }

  return data || []
}

export async function createOrUpdateArtist(walletAddress: string): Promise<Artist | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("FeriaNounish-Artistas")
    .upsert(
      {
        "Wallet Artista": walletAddress,
      },
      {
        onConflict: "Wallet Artista",
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
