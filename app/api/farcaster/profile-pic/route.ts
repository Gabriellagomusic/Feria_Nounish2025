import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address parameter is required" }, { status: 400 })
    }

    const apiKey = process.env.NEYNAR_API_KEY

    if (!apiKey) {
      console.error("[v0] NEYNAR_API_KEY not configured")
      return NextResponse.json({ profilePicUrl: null })
    }

    console.log("[v0] Fetching Farcaster profile pic for address:", address)

    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address.toLowerCase()}`,
      {
        headers: {
          accept: "application/json",
          api_key: apiKey,
        },
      },
    )

    if (!response.ok) {
      console.log("[v0] Neynar API error:", response.status)
      return NextResponse.json({ profilePicUrl: null })
    }

    const data = await response.json()

    // Extract profile picture URL from the response
    const users = data[address.toLowerCase()]
    if (users && users.length > 0 && users[0].pfp_url) {
      console.log("[v0] Found Farcaster profile pic:", users[0].pfp_url)
      return NextResponse.json({ profilePicUrl: users[0].pfp_url })
    }

    console.log("[v0] No Farcaster profile pic found")
    return NextResponse.json({ profilePicUrl: null })
  } catch (error) {
    console.error("[v0] Error fetching Farcaster profile pic:", error)
    return NextResponse.json({ profilePicUrl: null })
  }
}
