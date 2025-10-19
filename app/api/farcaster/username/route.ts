import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`, {
      headers: {
        accept: "application/json",
        api_key: process.env.NEYNAR_API_KEY || "",
      },
    })

    if (!response.ok) {
      console.log("[v0] Neynar API error:", response.status)
      return NextResponse.json({ username: null }, { status: 200 })
    }

    const data = await response.json()

    // The API returns an object with addresses as keys
    if (data && data[address.toLowerCase()]) {
      const user = data[address.toLowerCase()][0] // Get first user if multiple
      return NextResponse.json({ username: user?.username || null })
    }

    return NextResponse.json({ username: null })
  } catch (error) {
    console.error("[v0] Error fetching Farcaster username:", error)
    return NextResponse.json({ username: null }, { status: 200 })
  }
}
