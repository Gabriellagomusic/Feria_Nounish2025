// In-memory cache for Farcaster data
const usernameCache = new Map<string, { username: string | null; timestamp: number }>()
const profilePicCache = new Map<string, { profilePicUrl: string | null; timestamp: number }>()
const basenameCache = new Map<string, { basename: string | null; timestamp: number }>()

// Pending requests to prevent duplicate calls
const pendingUsernameRequests = new Map<string, Promise<string | null>>()
const pendingProfilePicRequests = new Map<string, Promise<string | null>>()
const pendingBasenameRequests = new Map<string, Promise<string | null>>()
const pendingBatchUsernameRequests = new Map<string, Promise<Record<string, string | null>>>()

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 500 // 500ms between requests (was 2000ms)

const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes in-memory (increased from 5)
const LOCALSTORAGE_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in localStorage

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
      // If rate limited, wait longer
      if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)))
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)))
      }
    } catch (e) {
      if (i === retries - 1) throw e
      await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)))
    }
  }
  throw new Error("Failed fetch after retries")
}

async function waitForRateLimit() {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
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
    const duration = parsed.value === null ? 5 * 60 * 1000 : LOCALSTORAGE_CACHE_DURATION

    if (Date.now() - parsed.timestamp > duration) {
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

      const response = await fetchWithRetry(`/api/farcaster/username?address=${normalizedAddress}`)

      if (!response.ok) {
        console.log(`[v0] Farcaster API error: ${response.status}`)
        return null
      }

      const data = await response.json()
      const username = data.username || null

      // Cache the result
      usernameCache.set(normalizedAddress, { username, timestamp: Date.now() })
      setToLocalStorage(localStorageKey, username)

      return username
    } catch (error) {
      console.error("[v0] Error fetching Farcaster username:", error)
      return null
    } finally {
      pendingUsernameRequests.delete(normalizedAddress)
    }
  })()

  pendingUsernameRequests.set(normalizedAddress, requestPromise)

  return requestPromise
}

export async function getFarcasterUsernames(addresses: string[]): Promise<Record<string, string | null>> {
  const uniqueAddresses = [...new Set(addresses.map((a) => a.toLowerCase()))]
  const results: Record<string, string | null> = {}
  const toFetch: string[] = []

  // Check cache first
  for (const addr of uniqueAddresses) {
    const localStorageKey = `fc_username_${addr}`
    const localStorageData = getFromLocalStorage(localStorageKey)
    if (localStorageData) {
      results[addr] = localStorageData.value
      continue
    }

    const cached = usernameCache.get(addr)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      results[addr] = cached.username
      continue
    }

    toFetch.push(addr)
  }

  if (toFetch.length === 0) {
    return results
  }

  const batchKey = toFetch.sort().join(",")
  const pending = pendingBatchUsernameRequests.get(batchKey)
  if (pending) {
    const pendingResults = await pending
    return { ...results, ...pendingResults }
  }

  const requestPromise = (async () => {
    try {
      await waitForRateLimit()

      const chunkSize = 100 // Increased from 50 to 100
      const fetchedResults: Record<string, string | null> = {}

      for (let i = 0; i < toFetch.length; i += chunkSize) {
        const chunk = toFetch.slice(i, i + chunkSize)
        const response = await fetchWithRetry(`/api/farcaster/usernames?addresses=${chunk.join(",")}`)

        if (!response.ok) {
          console.log(`[v0] Farcaster Batch API error: ${response.status}`)
          chunk.forEach((addr) => (fetchedResults[addr] = null))
          continue
        }

        const data = await response.json()
        const usernames = data.usernames || {}

        for (const addr of chunk) {
          const username = usernames[addr] || usernames[addr.toLowerCase()] || null
          fetchedResults[addr] = username

          const localStorageKey = `fc_username_${addr}`
          usernameCache.set(addr, { username, timestamp: Date.now() })
          setToLocalStorage(localStorageKey, username)
        }
      }

      return fetchedResults
    } catch (error) {
      console.error("[v0] Error fetching batch Farcaster usernames:", error)
      const errorResults: Record<string, string | null> = {}
      toFetch.forEach((addr) => (errorResults[addr] = null))
      return errorResults
    } finally {
      pendingBatchUsernameRequests.delete(batchKey)
    }
  })()

  pendingBatchUsernameRequests.set(batchKey, requestPromise)
  const newResults = await requestPromise
  return { ...results, ...newResults }
}

/**
 * Fetches Farcaster profile picture from wallet address using server-side API
 * With caching and deduplication
 */
export async function getFarcasterProfilePic(address: string): Promise<string | null> {
  const normalizedAddress = address.toLowerCase()

  const cached = profilePicCache.get(normalizedAddress)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.profilePicUrl
  }

  const pending = pendingProfilePicRequests.get(normalizedAddress)
  if (pending) {
    return pending
  }

  const requestPromise = (async () => {
    try {
      await waitForRateLimit()

      const response = await fetch(`/api/farcaster/profile-pic?address=${normalizedAddress}`)

      if (!response.ok) {
        console.log("[v0] Farcaster profile pic API error:", response.status)
        return null
      }

      const data = await response.json()
      const profilePicUrl = data.profilePicUrl || null

      profilePicCache.set(normalizedAddress, { profilePicUrl, timestamp: Date.now() })

      return profilePicUrl
    } catch (error) {
      console.error("[v0] Error fetching Farcaster profile pic:", error)
      return null
    } finally {
      pendingProfilePicRequests.delete(normalizedAddress)
    }
  })()

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
    return localStorageData.value
  }

  const cached = basenameCache.get(normalizedAddress)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.basename
  }

  const pending = pendingBasenameRequests.get(normalizedAddress)
  if (pending) {
    return pending
  }

  const requestPromise = (async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200)) // Reduced from 500ms

      const response = await fetch(`/api/basename?address=${normalizedAddress}`)

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      const basename = data.name || null

      basenameCache.set(normalizedAddress, { basename, timestamp: Date.now() })
      setToLocalStorage(localStorageKey, basename)

      return basename
    } catch (error) {
      console.error("[v0] Error fetching Basename:", error)
      return null
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

  try {
    // 1. Try to get all Farcaster usernames in one go
    const usernames = await getFarcasterUsernames(uniqueAddresses)

    // 2. Identify addresses that need Basename fallback
    const needBasename: string[] = []

    for (const address of uniqueAddresses) {
      if (usernames[address]) {
        results.set(address, usernames[address]!)
      } else {
        needBasename.push(address)
      }
    }

    // 3. Fetch Basenames for the rest (in parallel with staggered delays)
    if (needBasename.length > 0) {
      const basenamePromises = needBasename.map(async (address, index) => {
        try {
          // Stagger requests by 100ms each to avoid overwhelming
          await new Promise((resolve) => setTimeout(resolve, index * 100))
          const basename = await getBasename(address)
          return { address, name: basename || "Artista Desconocido" }
        } catch {
          return { address, name: "Artista Desconocido" }
        }
      })

      const basenameResults = await Promise.all(basenamePromises)
      basenameResults.forEach(({ address, name }) => {
        results.set(address, name)
      })
    }
  } catch (error) {
    console.error("[v0] Error in batchGetDisplayNames:", error)
    for (const address of uniqueAddresses) {
      results.set(address, "Artista Desconocido")
    }
  }

  return results
}
