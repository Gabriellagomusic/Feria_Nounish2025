import { type NextRequest, NextResponse } from "next/server"
import { getArtistByWallet } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: { wallet: string } }) {
  try {
    const wallet = params.wallet

    if (!wallet) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    const artist = await getArtistByWallet(wallet)

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 })
    }

    return NextResponse.json(artist)
  } catch (error) {
    console.error("Error in GET /api/artists/[wallet]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
