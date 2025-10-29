import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { contractAddress, tokenId } = await request.json()

    if (!contractAddress || !tokenId) {
      return NextResponse.json({ error: "Contract address and token ID are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Create the unique ID
    const galleryId = `${contractAddress.toLowerCase()}-${tokenId}`

    // Delete from gallery table
    const { error } = await supabase.from("FeriaNounish - Galeria").delete().eq("id", galleryId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing from gallery:", error)
    return NextResponse.json({ error: "Failed to remove from gallery" }, { status: 500 })
  }
}
