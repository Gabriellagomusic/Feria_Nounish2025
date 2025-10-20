import { NextResponse } from "next/server"
import { getAllArtists } from "@/lib/supabase-server"

export async function GET() {
  try {
    const artists = await getAllArtists()
    return NextResponse.json(artists)
  } catch (error) {
    console.error("Error in GET /api/artists:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
