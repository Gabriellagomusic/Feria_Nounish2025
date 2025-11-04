// In-memory cache for Farcaster data
const usernameCache = new Map<string, { username: string | null; timestamp: number }>()
const profilePicCache = new Map<string, { profilePicUrl: string | null; timestamp: number }>()
const basenameCache = new Map<string, { basename: string | null; timestamp: number }>()

// Pending requests to prevent duplicate calls
const pendingUsernameRequests = new Map<string, Promise<string | null>>()
const pendingProfilePicRequests = new Map<string, Promise<string | null>>()
const pendingBasenameRequests = new Map<string, Promise<string | null>>()

// Rate limiting queue
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 8000 // 8 seconds between requests for Neynar FREE plan (6 requests per 60s = 10s, using 8s to be safe)

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in-memory
const LOCALSTORAGE_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in localStorage

async function waitForRateLimit() {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    console.log(`[v0] Rate limiting: waiting ${waitTime}ms before next request`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
}

function getFromLocalStorage(key: string): { value: string | null; timestamp: number } | null {
  if (typeof window === "undefined") return null

  try {
    const item = localStorage.getItem(key)
    if (!item) return null

    const parsed = JSON.parse(item)
    if (Date.now() - parsed.timestamp > LOCALSTORAGE_CACHE_DURATION) {
      localStorage.removeItem(key)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function setToLocalStorage(key: string, value: string | null) {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Fetches Farcaster username from wallet address using server-side API
 * With caching, deduplication, and localStorage persistence
 */
export async function getFarcasterUsername(address: string): Promise<string | null> {
  const normalizedAddress = address.toLowerCase()

  const localStorageKey = `fc_username_${normalizedAddress}`
  const localStorageData = getFromLocalStorage(localStorageKey)
  if (localStorageData) {
    console.log(`[v0] Using localStorage cached username for ${normalizedAddress}`)
    return localStorageData.value
  }

  // Check in-memory cache
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
        console.log(`[v0] Farcaster API error: ${response.status}`)
        const nullResult = null
        usernameCache.set(normalizedAddress, { username: nullResult, timestamp: Date.now() })
        setToLocalStorage(localStorageKey, nullResult)
        return nullResult
      }

      const data = await response.json()
      const username = data.username || null

      usernameCache.set(normalizedAddress, { username, timestamp: Date.now() })
      setToLocalStorage(localStorageKey, username)

      return username
    } catch (error) {
      console.error("[v0] Error fetching Farcaster username:", error)
      const nullResult = null
      usernameCache.set(normalizedAddress, { username: nullResult, timestamp: Date.now() })
      setToLocalStorage(localStorageKey, nullResult)
      return nullResult
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
 * Fetches Basename for a wallet address
 * With caching, deduplication, and localStorage persistence
 */
export async function getBasename(address: string): Promise<string | null> {
  const normalizedAddress = address.toLowerCase()

  const localStorageKey = `basename_${normalizedAddress}`
  const localStorageData = getFromLocalStorage(localStorageKey)
  if (localStorageData) {
    console.log(`[v0] Using localStorage cached basename for ${normalizedAddress}`)
    return localStorageData.value
  }

  // Check in-memory cache
  const cached = basenameCache.get(normalizedAddress)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.basename
  }

  // Check if there's already a pending request for this address
  const pending = pendingBasenameRequests.get(normalizedAddress)
  if (pending) {
    return pending
  }

  // Create new request with rate limiting
  const requestPromise = (async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Query Basename API (Base's ENS-like service)
      const response = await fetch(`https://resolver.base.org/v1/name/${normalizedAddress}`)

      if (!response.ok) {
        const nullResult = null
        basenameCache.set(normalizedAddress, { basename: nullResult, timestamp: Date.now() })
        setToLocalStorage(localStorageKey, nullResult)
        return nullResult
      }

      const data = await response.json()
      const basename = data.name || null

      basenameCache.set(normalizedAddress, { basename, timestamp: Date.now() })
      setToLocalStorage(localStorageKey, basename)

      return basename
    } catch (error) {
      console.error("[v0] Error fetching Basename:", error)
      const nullResult = null
      basenameCache.set(normalizedAddress, { basename: nullResult, timestamp: Date.now() })
      setToLocalStorage(localStorageKey, nullResult)
      return nullResult
    } finally {
      pendingBasenameRequests.delete(normalizedAddress)
    }
  })()

  pendingBasenameRequests.set(normalizedAddress, requestPromise)

  return requestPromise
}

/**
 * Gets display name: Farcaster username, Basename, or "Artista Desconocido"
 * With caching, deduplication, and localStorage persistence
 */
export async function getDisplayName(address: string): Promise<string> {
  try {
    // Try Farcaster username first
    const farcasterUsername = await getFarcasterUsername(address)
    if (farcasterUsername) {
      return farcasterUsername
    }

    // Try Basename as fallback
    const basename = await getBasename(address)
    if (basename) {
      return basename
    }
  } catch (error) {
    console.error("[v0] Error in getDisplayName:", error)
  }

  return "Artista Desconocido"
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
