import { createClient } from "@supabase/supabase-js"

// Server-side Supabase client using service role key
// This should ONLY be used on the server (API routes, Server Actions, etc.)
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log("[v0] Supabase URL exists:", !!supabaseUrl)
  console.log("[v0] Supabase Service Key exists:", !!supabaseServiceKey)

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[v0] Missing Supabase environment variables")
    throw new Error("Missing Supabase environment variables")
  }

  console.log("[v0] Creating Supabase client...")
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  console.log("[v0] Supabase client created successfully")

  return client
}

// Types for the "Feria Nounish - Artistas" table
export interface Artist {
  "Wallet Artista": string
}

// Helper functions to interact with the "Feria Nounish - Artistas" table
export async function getArtistByWallet(walletAddress: string): Promise<Artist | null> {
  console.log("[v0] getArtistByWallet called with address:", walletAddress)

  try {
    const supabase = createServerSupabaseClient()

    console.log("[v0] Querying Feria Nounish - Artistas table...")
    const { data, error } = await supabase
      .from("Feria Nounish - Artistas")
      .select("*")
      .eq("Wallet Artista", walletAddress)
      .single()

    if (error) {
      console.error("[v0] Error fetching artist:", error)
      console.error("[v0] Error details:", JSON.stringify(error, null, 2))
      return null
    }

    console.log("[v0] Artist data:", data)
    return data
  } catch (error) {
    console.error("[v0] Exception in getArtistByWallet:", error)
    return null
  }
}

export async function getAllArtists(): Promise<Artist[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase.from("Feria Nounish - Artistas").select("*")

  if (error) {
    console.error("Error fetching artists:", error)
    return []
  }

  return data || []
}

export async function createOrUpdateArtist(walletAddress: string): Promise<Artist | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("Feria Nounish - Artistas")
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
