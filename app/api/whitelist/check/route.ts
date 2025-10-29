import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  console.log("[v0] Whitelist API - Received request for address:", address)

  if (!address) {
    console.log("[v0] Whitelist API - No address provided")
    return NextResponse.json({ error: "Address is required" }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const normalizedAddress = address.toLowerCase()

    console.log("[v0] Whitelist API - Normalized address:", normalizedAddress)
    console.log("[v0] Whitelist API - Querying FeriaNounish-Artistas table...")

    const { data, error } = await supabase
      .from("FeriaNounish-Artistas")
      .select("*")
      .eq("id", normalizedAddress)
      .single()

    console.log("[v0] Whitelist API - Query result:", { data, error })

    if (error) {
      // If no record found, user is not whitelisted
      if (error.code === "PGRST116") {
        console.log("[v0] Whitelist API - Address not found in whitelist (PGRST116)")
        return NextResponse.json({ isWhitelisted: false })
      }
      console.error("[v0] Whitelist API - Database error:", error)
      throw error
    }

    const isWhitelisted = !!data
    console.log("[v0] Whitelist API - Is whitelisted:", isWhitelisted)
    return NextResponse.json({ isWhitelisted })
  } catch (error) {
    console.error("[v0] Whitelist API - Unexpected error:", error)
    return NextResponse.json({ error: "Failed to check whitelist" }, { status: 500 })
  }
}
