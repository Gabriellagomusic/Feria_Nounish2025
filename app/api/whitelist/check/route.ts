import { type NextRequest, NextResponse } from "next/server"
import { getAllArtists } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address parameter is required" }, { status: 400 })
    }

    console.log("[v0] Checking whitelist for address:", address)

    const allArtists = await getAllArtists()
    console.log("[v0] Total artists in whitelist:", allArtists.length)
    console.log(
      "[v0] All whitelisted addresses:",
      allArtists.map((a) => a.id),
    )

    // Check if the wallet is in the whitelist (case-insensitive comparison)
    const normalizedAddress = address.toLowerCase()
    const isWhitelisted = allArtists.some((artist) => artist.id.toLowerCase() === normalizedAddress)

    console.log("[v0] Whitelist check result for", address, ":", isWhitelisted)

    return NextResponse.json({ isWhitelisted, totalArtists: allArtists.length })
  } catch (error) {
    console.error("[v0] Error checking whitelist:", error)
    return NextResponse.json({ error: "Failed to check whitelist" }, { status: 500 })
  }
}
