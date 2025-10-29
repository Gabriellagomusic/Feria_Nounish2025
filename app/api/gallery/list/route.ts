import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all gallery entries
    const { data, error } = await supabase.from("FeriaNounish - Galeria").select("id")

    if (error) {
      throw error
    }

    // Parse the IDs to extract contract addresses and token IDs
    const tokens = (data || []).map((entry) => {
      const [contractAddress, tokenId] = entry.id.split("-")
      return { contractAddress, tokenId }
    })

    return NextResponse.json({ tokens })
  } catch (error) {
    console.error("Error listing gallery:", error)
    return NextResponse.json({ error: "Failed to list gallery" }, { status: 500 })
  }
}
