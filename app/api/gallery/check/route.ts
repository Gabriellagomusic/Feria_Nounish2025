import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const contractAddress = searchParams.get("contractAddress")
    const tokenId = searchParams.get("tokenId")

    if (!contractAddress || !tokenId) {
      return NextResponse.json({ error: "Contract address and token ID are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Create the unique ID
    const galleryId = `${contractAddress.toLowerCase()}-${tokenId}`

    // Check if exists in gallery
    const { data, error } = await supabase.from("FeriaNounish - Galeria").select("id").eq("id", galleryId).single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected
      throw error
    }

    return NextResponse.json({ inGallery: !!data })
  } catch (error) {
    console.error("Error checking gallery:", error)
    return NextResponse.json({ error: "Failed to check gallery" }, { status: 500 })
  }
}
