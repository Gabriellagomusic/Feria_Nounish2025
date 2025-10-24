import { type NextRequest, NextResponse } from "next/server"
import { getArtistByWallet } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  console.log("[v0] Whitelist check API called")

  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    console.log("[v0] Request URL:", request.url)
    console.log("[v0] Address parameter:", address)

    if (!address) {
      console.log("[v0] No address provided")
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    console.log("[v0] Checking whitelist for address:", address)

    const artist = await getArtistByWallet(address.toLowerCase())

    const isWhitelisted = artist !== null

    console.log("[v0] Whitelist check result:", isWhitelisted)
    console.log("[v0] Artist data:", artist)

    return NextResponse.json({ isWhitelisted, address })
  } catch (error) {
    console.error("[v0] Error checking whitelist:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Failed to check whitelist",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
