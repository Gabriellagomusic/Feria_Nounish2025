import { type NextRequest, NextResponse } from "next/server"

const cache = new Map<string, { username: string | null; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour (increased from 30 min)

// Rate limit tracking - Neynar allows 6 req/60s on FREE plan
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 3000 // 3 seconds between bulk requests

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const addressesParam = searchParams.get("addresses")

  if (!addressesParam) {
    return NextResponse.json({ error: "Addresses are required" }, { status: 400 })
  }

  const addresses = addressesParam.split(",").filter(Boolean)

  if (addresses.length === 0) {
    return NextResponse.json({ usernames: {} })
  }

  const usernames: Record<string, string | null> = {}
  const toFetch: string[] = []

  // Check cache first
  const now = Date.now()
  addresses.forEach((addr) => {
    const cached = cache.get(addr.toLowerCase())
    if (cached && now - cached.timestamp < CACHE_TTL) {
      usernames[addr.toLowerCase()] = cached.username
    } else {
      toFetch.push(addr)
    }
  })

  // If all found in cache, return immediately
  if (toFetch.length === 0) {
    return NextResponse.json({ usernames })
  }

  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    // Return cached results only, don't make API call
    console.log(
      `[v0] Rate limit protection: ${MIN_REQUEST_INTERVAL - timeSinceLastRequest}ms until next request allowed`,
    )
    toFetch.forEach((addr) => {
      usernames[addr.toLowerCase()] = null
    })
    return NextResponse.json({ usernames, rateLimited: true })
  }

  lastRequestTime = now

  try {
    // Neynar bulk API supports up to 350 addresses
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${toFetch.join(",")}`,
      {
        headers: {
          accept: "application/json",
          api_key: process.env.NEYNAR_API_KEY || "",
        },
      },
    )

    if (!response.ok) {
      console.log("[v0] Neynar API error:", response.status)
      // If rate limited, don't cache the failure
      if (response.status === 429) {
        toFetch.forEach((addr) => {
          usernames[addr.toLowerCase()] = null
        })
        return NextResponse.json({ usernames, rateLimited: true })
      }
      return NextResponse.json({ usernames }, { status: 200 })
    }

    const data = await response.json()

    // Initialize fetched addresses to null
    toFetch.forEach((addr) => {
      usernames[addr.toLowerCase()] = null
    })

    // Fill in found usernames and update cache
    if (data) {
      Object.keys(data).forEach((addr) => {
        const users = data[addr]
        if (users && users.length > 0) {
          const username = users[0].username
          usernames[addr.toLowerCase()] = username
          cache.set(addr.toLowerCase(), { username, timestamp: now })
        } else {
          // Cache null result with same TTL
          cache.set(addr.toLowerCase(), { username: null, timestamp: now })
        }
      })
    }

    // Ensure all requested addresses are in response
    addresses.forEach((addr) => {
      if (usernames[addr.toLowerCase()] === undefined) {
        usernames[addr.toLowerCase()] = null
      }
    })

    return NextResponse.json({ usernames })
  } catch (error) {
    console.error("[v0] Error fetching batch Farcaster usernames:", error)
    return NextResponse.json({ usernames }, { status: 200 })
  }
}
