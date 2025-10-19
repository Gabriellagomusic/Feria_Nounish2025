/**
 * Fetches Farcaster username from wallet address using server-side API
 */
export async function getFarcasterUsername(address: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/farcaster/username?address=${address}`)

    if (!response.ok) {
      console.log("[v0] Farcaster API error:", response.status)
      return null
    }

    const data = await response.json()
    return data.username || null
  } catch (error) {
    console.error("[v0] Error fetching Farcaster username:", error)
    return null
  }
}

/**
 * Formats address to display format (0x1234...5678)
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Gets display name: Farcaster username or formatted address
 */
export async function getDisplayName(address: string): Promise<string> {
  const farcasterUsername = await getFarcasterUsername(address)
  return farcasterUsername || formatAddress(address)
}
