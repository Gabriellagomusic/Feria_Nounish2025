// In-memory cache for Farcaster data
const usernameCache = new Map<string, { username: string | null; timestamp: number }>()
const profilePicCache = new Map<string, { profilePicUrl: string | null; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Pending requests to prevent duplicate calls
const pendingUsernameRequests = new Map<string, Promise<string | null>>()
const pendingProfilePicRequests = new Map<string, Promise<string | null>>()

// Rate limiting queue
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 350 // 350ms between requests (max ~3 requests per second)

async function waitForRateLimit() {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

/**
 * Fetches Farcaster username from wallet address using server-side API
 * With caching and deduplication
 */
export async function getFarcasterUsername(address: string): Promise<string | null> {
  const normalizedAddress = address.toLowerCase()

  // Check cache first
  const cached = usernameCache.get(normalizedAddress)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.username
  }

  // Check if there's already a pending request for this address
  const pending = pendingUsernameRequests.get(normalizedAddress)
  if (pending) {
    return pending
  }

  // Create new request with rate limiting
  const requestPromise = (async () => {
    try {
      await waitForRateLimit()

      const response = await fetch(`/api/farcaster/username?address=${normalizedAddress}`)

      if (!response.ok) {
        console.log("[v0] Farcaster API error:", response.status)
        // Cache null result to avoid repeated failed requests
        usernameCache.set(normalizedAddress, { username: null, timestamp: Date.now() })
        return null
      }

      const data = await response.json()
      const username = data.username || null

      // Cache the result
      usernameCache.set(normalizedAddress, { username, timestamp: Date.now() })

      return username
    } catch (error) {
      console.error("[v0] Error fetching Farcaster username:", error)
      // Cache null result
      usernameCache.set(normalizedAddress, { username: null, timestamp: Date.now() })
      return null
    } finally {
      // Remove from pending requests
      pendingUsernameRequests.delete(normalizedAddress)
    }
  })()

  // Store pending request
  pendingUsernameRequests.set(normalizedAddress, requestPromise)

  return requestPromise
}

/**
 * Fetches Farcaster profile picture from wallet address using server-side API
 * With caching and deduplication
 */
export async function getFarcasterProfilePic(address: string): Promise<string | null> {
  const normalizedAddress = address.toLowerCase()

  // Check cache first
  const cached = profilePicCache.get(normalizedAddress)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.profilePicUrl
  }

  // Check if there's already a pending request for this address
  const pending = pendingProfilePicRequests.get(normalizedAddress)
  if (pending) {
    return pending
  }

  // Create new request with rate limiting
  const requestPromise = (async () => {
    try {
      await waitForRateLimit()

      const response = await fetch(`/api/farcaster/profile-pic?address=${normalizedAddress}`)

      if (!response.ok) {
        console.log("[v0] Farcaster profile pic API error:", response.status)
        // Cache null result
        profilePicCache.set(normalizedAddress, { profilePicUrl: null, timestamp: Date.now() })
        return null
      }

      const data = await response.json()
      const profilePicUrl = data.profilePicUrl || null

      // Cache the result
      profilePicCache.set(normalizedAddress, { profilePicUrl, timestamp: Date.now() })

      return profilePicUrl
    } catch (error) {
      console.error("[v0] Error fetching Farcaster profile pic:", error)
      // Cache null result
      profilePicCache.set(normalizedAddress, { profilePicUrl: null, timestamp: Date.now() })
      return null
    } finally {
      // Remove from pending requests
      pendingProfilePicRequests.delete(normalizedAddress)
    }
  })()

  // Store pending request
  pendingProfilePicRequests.set(normalizedAddress, requestPromise)

  return requestPromise
}

/**
 * Formats address to display format (0x1234...5678)
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Gets display name: Farcaster username or formatted address
 * With caching and deduplication
 */
export async function getDisplayName(address: string): Promise<string> {
  try {
    const farcasterUsername = await getFarcasterUsername(address)
    if (farcasterUsername) {
      return farcasterUsername
    }
  } catch (error) {
    console.error("[v0] Error in getDisplayName:", error)
  }
  return formatAddress(address)
}

/**
 * Batch fetch display names for multiple addresses
 * More efficient than calling getDisplayName() individually
 */
export async function batchGetDisplayNames(addresses: string[]): Promise<Map<string, string>> {
  const uniqueAddresses = [...new Set(addresses.map((a) => a.toLowerCase()))]
  const results = new Map<string, string>()

  // Process addresses sequentially with rate limiting
  for (const address of uniqueAddresses) {
    const displayName = await getDisplayName(address)
    results.set(address, displayName)
  }

  return results
}
