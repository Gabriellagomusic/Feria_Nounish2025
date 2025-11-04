"use client"

interface TokenMetadata {
  name: string
  description: string
  image: string
  artist: string
  artistDisplay: string
  contractAddress: string
  tokenId: string
}

interface GaleriaState {
  tokens: TokenMetadata[]
  allTokenConfigs: any[]
  currentIndex: number
  timestamp: number
}

const STATE_KEY = "galeria_state"
const STATE_DURATION = 30 * 60 * 1000 // 30 minutes

export function saveGaleriaState(tokens: TokenMetadata[], allTokenConfigs: any[], currentIndex: number): void {
  if (typeof window === "undefined") return

  try {
    const state: GaleriaState = {
      tokens,
      allTokenConfigs,
      currentIndex,
      timestamp: Date.now(),
    }
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error("[v0] Error saving galeria state:", error)
  }
}

export function loadGaleriaState(): GaleriaState | null {
  if (typeof window === "undefined") return null

  try {
    const item = sessionStorage.getItem(STATE_KEY)
    if (!item) return null

    const state: GaleriaState = JSON.parse(item)

    // Check if state is still valid (within 30 minutes)
    if (Date.now() - state.timestamp > STATE_DURATION) {
      sessionStorage.removeItem(STATE_KEY)
      return null
    }

    return state
  } catch (error) {
    console.error("[v0] Error loading galeria state:", error)
    return null
  }
}

export function clearGaleriaState(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(STATE_KEY)
}

// Artist data cache for sharing between pages
const ARTIST_CACHE_KEY = "artist_cache"

export function saveArtistData(
  contractAddress: string,
  tokenId: string,
  artistData: {
    address: string
    displayName: string
  },
): void {
  if (typeof window === "undefined") return

  try {
    const key = `${ARTIST_CACHE_KEY}_${contractAddress}_${tokenId}`
    sessionStorage.setItem(
      key,
      JSON.stringify({
        ...artistData,
        timestamp: Date.now(),
      }),
    )
  } catch (error) {
    console.error("[v0] Error saving artist data:", error)
  }
}

export function loadArtistData(
  contractAddress: string,
  tokenId: string,
): {
  address: string
  displayName: string
} | null {
  if (typeof window === "undefined") return null

  try {
    const key = `${ARTIST_CACHE_KEY}_${contractAddress}_${tokenId}`
    const item = sessionStorage.getItem(key)
    if (!item) return null

    const data = JSON.parse(item)

    // Check if data is still valid (within 30 minutes)
    if (Date.now() - data.timestamp > STATE_DURATION) {
      sessionStorage.removeItem(key)
      return null
    }

    return {
      address: data.address,
      displayName: data.displayName,
    }
  } catch (error) {
    console.error("[v0] Error loading artist data:", error)
    return null
  }
}
