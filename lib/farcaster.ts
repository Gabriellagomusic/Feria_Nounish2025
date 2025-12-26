// In-memory cache for Farcaster data
const displayNameCache = new Map<string, { name: string; timestamp: number }>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour
const LOCALSTORAGE_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Pending batch request to deduplicate
const pendingBatchPromise: Promise<Map<string, string>> | null = null
const pendingBatchAddresses: Set<string> = new Set()
const batchTimeout: NodeJS.Timeout | null = null

function getFromLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    const item = localStorage.getItem(key)
    if (!item) return null
    const parsed = JSON.parse(item)
    if (Date.now() - parsed.timestamp > LOCALSTORAGE_CACHE_DURATION) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.value
  } catch {
    return null
  }
}

function setToLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Formats address to display format (0x1234...5678)
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Gets display name with caching - checks localStorage and memory cache first
 */
export async function getDisplayName(address: string): Promise<string> {
  const normalizedAddress = address.toLowerCase()

  // Check localStorage first
  const localStorageKey = `display_name_${normalizedAddress}`
  const cachedName = getFromLocalStorage(localStorageKey)
  if (cachedName && cachedName !== "Artista Desconocido") {
    return cachedName
  }

  // Check memory cache
  const cached = displayNameCache.get(normalizedAddress)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    if (cached.name !== "Artista Desconocido") {
      return cached.name
    }
  }

  // Use batch fetching
  const results = await batchGetDisplayNames([normalizedAddress])
  return results.get(normalizedAddress) || "Artista Desconocido"
}

/**
 * Batch fetch display names - the primary method for efficiency
 * Collects all addresses and makes a single API call
 */
export async function batchGetDisplayNames(addresses: string[]): Promise<Map<string, string>> {
  const uniqueAddresses = [...new Set(addresses.map((a) => a.toLowerCase()))]
  const results = new Map<string, string>()
  const toFetch: string[] = []

  // Check caches first
  for (const addr of uniqueAddresses) {
    // Check localStorage
    const localStorageKey = `display_name_${addr}`
    const cachedName = getFromLocalStorage(localStorageKey)
    if (cachedName && cachedName !== "Artista Desconocido") {
      results.set(addr, cachedName)
      continue
    }

    // Check memory cache
    const cached = displayNameCache.get(addr)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION && cached.name !== "Artista Desconocido") {
      results.set(addr, cached.name)
      continue
    }

    toFetch.push(addr)
  }

  // If all found in cache, return immediately
  if (toFetch.length === 0) {
    return results
  }

  console.log("[v0] Fetching names for", toFetch.length, "addresses from Farcaster API")

  try {
    // Fetch Farcaster usernames in bulk
    const response = await fetch(`/api/farcaster/usernames?addresses=${toFetch.join(",")}`)

    if (response.ok) {
      const data = await response.json()
      const usernames = data.usernames || {}

      for (const addr of toFetch) {
        const username = usernames[addr] || usernames[addr.toLowerCase()]
        if (username) {
          results.set(addr, username)
          displayNameCache.set(addr, { name: username, timestamp: Date.now() })
          setToLocalStorage(`display_name_${addr}`, username)
        }
      }
    }

    // For addresses without Farcaster usernames, try Basename in parallel
    const needBasename = toFetch.filter((addr) => !results.has(addr))

    if (needBasename.length > 0) {
      console.log("[v0] Fetching Basename for", needBasename.length, "addresses")

      // Fetch all basenames in parallel without staggering
      const basenamePromises = needBasename.map(async (addr) => {
        try {
          const response = await fetch(`/api/basename?address=${addr}`)
          if (response.ok) {
            const data = await response.json()
            return { addr, name: data.name }
          }
        } catch (error) {
          console.error("[v0] Basename fetch error for", addr, error)
        }
        return { addr, name: null }
      })

      const basenameResults = await Promise.all(basenamePromises)

      for (const { addr, name } of basenameResults) {
        if (name) {
          results.set(addr, name)
          displayNameCache.set(addr, { name, timestamp: Date.now() })
          setToLocalStorage(`display_name_${addr}`, name)
        }
      }
    }

    // Set fallback for any remaining addresses
    for (const addr of toFetch) {
      if (!results.has(addr)) {
        console.log("[v0] No name found for", addr, "- using fallback")
        results.set(addr, "Artista Desconocido")
        // Cache "unknown" with shorter TTL (5 min) to allow retry
        displayNameCache.set(addr, {
          name: "Artista Desconocido",
          timestamp: Date.now() - CACHE_DURATION + 5 * 60 * 1000,
        })
      }
    }
  } catch (error) {
    console.error("[v0] Error in batchGetDisplayNames:", error)
    // Set fallback for all addresses
    for (const addr of toFetch) {
      if (!results.has(addr)) {
        results.set(addr, "Artista Desconocido")
      }
    }
  }

  return results
}

// Legacy exports for backward compatibility
export async function getFarcasterUsername(address: string): Promise<string | null> {
  const results = await batchGetDisplayNames([address])
  const name = results.get(address.toLowerCase())
  return name && name !== "Artista Desconocido" ? name : null
}

export async function getFarcasterUsernames(addresses: string[]): Promise<Record<string, string | null>> {
  const results = await batchGetDisplayNames(addresses)
  const record: Record<string, string | null> = {}
  for (const [addr, name] of results) {
    record[addr] = name !== "Artista Desconocido" ? name : null
  }
  return record
}

export async function getBasename(address: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/basename?address=${address.toLowerCase()}`)
    if (response.ok) {
      const data = await response.json()
      return data.name || null
    }
  } catch {
    // Ignore errors
  }
  return null
}

export async function getFarcasterProfilePic(address: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/farcaster/profile-pic?address=${address.toLowerCase()}`)
    if (response.ok) {
      const data = await response.json()
      return data.profilePicUrl || null
    }
  } catch {
    // Ignore errors
  }
  return null
}
