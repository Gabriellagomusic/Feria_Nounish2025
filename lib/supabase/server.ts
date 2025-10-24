import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Server-side Supabase client
 * IMPORTANT: Don't put this client in a global variable.
 * Always create a new client within each function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

// Types for the "FeriaNounish-Artistas" table
export interface Artist {
  id: string // Wallet address stored in 'id' column
}

// Helper functions to interact with the "FeriaNounish-Artistas" table
export async function getArtistByWallet(walletAddress: string): Promise<Artist | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("FeriaNounish-Artistas").select("*").eq("id", walletAddress).single()

  if (error) {
    console.error("Error fetching artist:", error)
    return null
  }

  return data
}

export async function getAllArtists(): Promise<Artist[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("FeriaNounish-Artistas").select("*")

  if (error) {
    console.error("Error fetching artists:", error)
    return []
  }

  return data || []
}

export async function createOrUpdateArtist(walletAddress: string): Promise<Artist | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("FeriaNounish-Artistas")
    .upsert(
      {
        id: walletAddress,
      },
      {
        onConflict: "id",
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
