import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("FeriaNounish-Artistas")
      .select("*")
      .eq("id", address.toLowerCase())
      .single()

    if (error) {
      // If no record found, user is not whitelisted
      if (error.code === "PGRST116") {
        return NextResponse.json({ isWhitelisted: false })
      }
      throw error
    }

    return NextResponse.json({ isWhitelisted: !!data })
  } catch (error) {
    console.error("Error checking whitelist:", error)
    return NextResponse.json({ error: "Failed to check whitelist" }, { status: 500 })
  }
}
