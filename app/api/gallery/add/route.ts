import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { contractAddress, tokenId } = await request.json()

    if (!contractAddress || !tokenId) {
      return NextResponse.json({ error: "Contract address and token ID are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Create a unique ID for the gallery entry
    const galleryId = `${contractAddress.toLowerCase()}-${tokenId}`

    // Insert into gallery table
    const { error } = await supabase.from("FeriaNounish - Galeria").insert({ id: galleryId })

    if (error) {
      // If it's a duplicate key error, return success (already in gallery)
      if (error.code === "23505") {
        return NextResponse.json({ success: true, message: "Already in gallery" })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding to gallery:", error)
    return NextResponse.json({ error: "Failed to add to gallery" }, { status: 500 })
  }
}
