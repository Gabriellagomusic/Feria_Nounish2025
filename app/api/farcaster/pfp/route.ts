import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    const apiKey = process.env.NEYNAR_API_KEY

    if (!apiKey) {
      console.error("[v0] NEYNAR_API_KEY not found")
      return NextResponse.json({ pfpUrl: null }, { status: 200 })
    }

    console.log("[v0] Fetching Farcaster PFP for address:", address)

    // First, get the user by address
    const userResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address.toLowerCase()}`,
      {
        headers: {
          accept: "application/json",
          api_key: apiKey,
        },
      },
    )

    if (!userResponse.ok) {
      console.log("[v0] Failed to fetch user from Neynar:", userResponse.status)
      return NextResponse.json({ pfpUrl: null }, { status: 200 })
    }

    const userData = await userResponse.json()
    console.log("[v0] Neynar user response:", JSON.stringify(userData).substring(0, 200))

    // Extract PFP URL from the response
    const users = userData[address.toLowerCase()]
    if (!users || users.length === 0) {
      console.log("[v0] No Farcaster user found for address")
      return NextResponse.json({ pfpUrl: null }, { status: 200 })
    }

    const user = users[0]
    const pfpUrl = user.pfp_url || user.pfp?.url || null

    console.log("[v0] Found PFP URL:", pfpUrl)

    return NextResponse.json({ pfpUrl })
  } catch (error) {
    console.error("[v0] Error fetching Farcaster PFP:", error)
    return NextResponse.json({ pfpUrl: null }, { status: 200 })
  }
}
