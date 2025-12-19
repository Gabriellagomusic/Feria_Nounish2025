import { type NextRequest, NextResponse } from "next/server"

// Simple retry helper
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response
      // If rate limited (429) or server error (5xx), wait and retry
      if (response.status === 429 || response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)))
        continue
      }
      return response
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)))
    }
  }
  throw new Error("Failed after retries")
}

const cache = new Map<string, { username: string | null; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

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

  try {
    // Neynar bulk API supports comma-separated addresses
    const response = await fetchWithRetry(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${toFetch.join(",")}`,
      {
        headers: {
          accept: "application/json",
          api_key: process.env.NEYNAR_API_KEY || "",
        },
      },
    )

    if (!response.ok) {
      console.log("[v0] Neynar Batch API error:", response.status)
      // Return what we have from cache, don't update with failures
      return NextResponse.json({ usernames }, { status: 200 })
    }

    const data = await response.json()

    // Initialize fetched addresses to null (in case not found in response)
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
          // Cache null result (user not found) but with shorter TTL
          cache.set(addr.toLowerCase(), { username: null, timestamp: now })
        }
      })
    }

    // Ensure all requested addresses are in response
    addresses.forEach((addr) => {
      if (usernames[addr.toLowerCase()] === undefined) {
        // Should be covered by cache check logic, but just in case
        usernames[addr.toLowerCase()] = null
      }
    })

    return NextResponse.json({ usernames })
  } catch (error) {
    console.error("[v0] Error fetching batch Farcaster usernames:", error)
    return NextResponse.json({ usernames }, { status: 200 })
  }
}
