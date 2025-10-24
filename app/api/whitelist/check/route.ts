import { type NextRequest, NextResponse } from "next/server"
import { getArtistByWallet } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address parameter is required" }, { status: 400 })
    }

    console.log("[v0] Checking whitelist for address:", address)

    // Check if the wallet is in the whitelist
    const artist = await getArtistByWallet(address.toLowerCase())

    const isWhitelisted = artist !== null

    console.log("[v0] Whitelist check result:", isWhitelisted)

    return NextResponse.json({ isWhitelisted })
  } catch (error) {
    console.error("[v0] Error checking whitelist:", error)
    return NextResponse.json({ error: "Failed to check whitelist" }, { status: 500 })
  }
}
