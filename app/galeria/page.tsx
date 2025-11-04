"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"
import { ArrowLeft, Search } from "lucide-react"
import { getDisplayName } from "@/lib/farcaster"
import { saveGaleriaState, loadGaleriaState, saveArtistData } from "@/lib/galeria-state"
import { ArtistLink } from "@/components/ArtistLink"

interface TokenMetadata {
  name: string
  description: string
  image: string
  artist: string
  artistDisplay: string
  contractAddress: string
  tokenId: string
}

const ERC1155_ABI = [
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "uri",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const LOCALSTORAGE_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

function getOwnerFromLocalStorage(contractAddress: string): string | null {
  if (typeof window === "undefined") return null

  try {
    const key = `contract_owner_${contractAddress.toLowerCase()}`
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

function setOwnerToLocalStorage(contractAddress: string, owner: string) {
  if (typeof window === "undefined") return

  try {
    const key = `contract_owner_${contractAddress.toLowerCase()}`
    localStorage.setItem(key, JSON.stringify({ value: owner, timestamp: Date.now() }))
  } catch {
    // Ignore localStorage errors
  }
}

const contractOwnerCache = new Map<string, string>()

async function fetchContractOwner(contractAddress: string, publicClient: any): Promise<string> {
  const localStorageOwner = getOwnerFromLocalStorage(contractAddress)
  if (localStorageOwner) {
    console.log(`[v0] Using localStorage cached owner for ${contractAddress}`)
    contractOwnerCache.set(contractAddress.toLowerCase(), localStorageOwner)
    return localStorageOwner
  }

  const cached = contractOwnerCache.get(contractAddress.toLowerCase())
  if (cached) {
    return cached
  }

  await new Promise((resolve) => setTimeout(resolve, 300)) // Reduced RPC delay from 500ms to 300ms

  try {
    const owner = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: ERC1155_ABI,
      functionName: "owner",
    })

    const ownerAddress = (owner as string).toLowerCase()
    contractOwnerCache.set(contractAddress.toLowerCase(), ownerAddress)
    setOwnerToLocalStorage(contractAddress, ownerAddress)
    return ownerAddress
  } catch (error) {
    console.error(`[v0] Error fetching owner for ${contractAddress}:`, error)
    contractOwnerCache.set(contractAddress.toLowerCase(), "")
    return ""
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

async function fetchWithRetry<T>(fetchFn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Failed after retries")
}

export default function GaleriaPage() {
  const router = useRouter()
  const [tokens, setTokens] = useState<TokenMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedArtist, setSelectedArtist] = useState<string>("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [allTokenConfigs, setAllTokenConfigs] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [allArtists, setAllArtists] = useState<Map<string, string>>(new Map())
  const observerTarget = useRef<HTMLDivElement>(null)

  const TOKENS_PER_LOAD = 4

  const loadMoreTokens = useCallback(async () => {
    if (isLoadingMore || !hasMore || allTokenConfigs.length === 0) return

    setIsLoadingMore(true)

    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const endIndex = Math.min(currentIndex + TOKENS_PER_LOAD, allTokenConfigs.length)
      const batch = allTokenConfigs.slice(currentIndex, endIndex)

      const newTokens: TokenMetadata[] = []

      for (const config of batch) {
        try {
          const artistAddress = await fetchContractOwner(config.contractAddress, publicClient)
          const artistDisplay = artistAddress ? await getDisplayName(artistAddress) : "Artista Desconocido"

          await new Promise((resolve) => setTimeout(resolve, 800)) // Reduced delay from 1000ms to 800ms

          const tokenURI = await fetchWithRetry(async () => {
            return await publicClient.readContract({
              address: config.contractAddress as `0x${string}`,
              abi: ERC1155_ABI,
              functionName: "uri",
              args: [BigInt(1)],
            })
          })

          if (tokenURI) {
            let metadataUrl = tokenURI.replace("{id}", "1")
            if (metadataUrl.startsWith("ar://")) {
              metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
            }

            try {
              const metadata = await fetchWithRetry(async () => {
                const response = await fetch(metadataUrl)
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                return await response.json()
              })

              let imageUrl = metadata.image
              if (imageUrl?.startsWith("ipfs://")) {
                imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
              } else if (imageUrl?.startsWith("ar://")) {
                imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
              }

              newTokens.push({
                name: metadata.name || `Obra de Arte #${config.tokenId}`,
                description: metadata.description || "Obra de arte digital única",
                image: imageUrl || "/placeholder.svg",
                artist: artistAddress,
                artistDisplay: artistDisplay,
                contractAddress: config.contractAddress,
                tokenId: config.tokenId,
              })
            } catch (fetchError) {
              console.error(`[v0] Error fetching metadata for ${config.contractAddress}:`, fetchError)
              newTokens.push({
                name: `Obra de Arte #${config.tokenId}`,
                description: "Obra de arte digital única de la colección oficial",
                image: "/placeholder.svg",
                artist: artistAddress,
                artistDisplay: artistDisplay,
                contractAddress: config.contractAddress,
                tokenId: config.tokenId,
              })
            }
          } else {
            newTokens.push({
              name: `Obra de Arte #${config.tokenId}`,
              description: "Obra de arte digital única de la colección oficial",
              image: "/placeholder.svg",
              artist: artistAddress,
              artistDisplay: artistDisplay,
              contractAddress: config.contractAddress,
              tokenId: config.tokenId,
            })
          }

          saveArtistData(config.contractAddress, config.tokenId, {
            address: artistAddress,
            displayName: artistDisplay,
          })
        } catch (error) {
          console.error(`[v0] Error processing token ${config.contractAddress}:`, error)
          newTokens.push({
            name: `Obra de Arte #${config.tokenId}`,
            description: "Obra de arte digital única de la colección oficial",
            image: "/placeholder.svg",
            artist: "",
            artistDisplay: "Artista Desconocido",
            contractAddress: config.contractAddress,
            tokenId: config.tokenId,
          })
        }

        await new Promise((resolve) => setTimeout(resolve, 1500)) // Reduced delay between tokens from 2000ms to 1500ms
      }

      setTokens((prev) => [...prev, ...newTokens])
      setCurrentIndex(endIndex)
      setHasMore(endIndex < allTokenConfigs.length)
    } catch (error) {
      console.error("[v0] Error loading more tokens:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentIndex, allTokenConfigs, isLoadingMore, hasMore])

  useEffect(() => {
    const savedState = loadGaleriaState()
    if (savedState) {
      console.log("[v0] Restoring galeria state from session storage")
      const shuffledTokens = shuffleArray(savedState.tokens)
      const shuffledConfigs = shuffleArray(savedState.allTokenConfigs)
      setTokens(shuffledTokens)
      setAllTokenConfigs(shuffledConfigs)
      setCurrentIndex(savedState.currentIndex)
      setHasMore(savedState.currentIndex < shuffledConfigs.length)
      setIsLoading(false)
      return
    }
  }, [])

  useEffect(() => {
    if (tokens.length > 0 && allTokenConfigs.length > 0) {
      saveGaleriaState(tokens, allTokenConfigs, currentIndex)
    }
  }, [tokens, allTokenConfigs, currentIndex])

  useEffect(() => {
    const fetchInitialTokens = async () => {
      if (tokens.length > 0) return

      try {
        const galleryData = await fetchWithRetry(async () => {
          const response = await fetch("/api/gallery/list")
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return await response.json()
        })

        if (!galleryData.tokens || galleryData.tokens.length === 0) {
          setTokens([])
          setIsLoading(false)
          setHasMore(false)
          return
        }

        const shuffled = shuffleArray(galleryData.tokens)
        setAllTokenConfigs(shuffled)

        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const artistMap = new Map<string, string>()
        for (const config of shuffled) {
          try {
            const artistAddress = await fetchContractOwner(config.contractAddress, publicClient)
            if (artistAddress) {
              const displayName = await getDisplayName(artistAddress)
              artistMap.set(artistAddress, displayName)
            }
            await new Promise((resolve) => setTimeout(resolve, 300))
          } catch (error) {
            console.error(`[v0] Error fetching artist for ${config.contractAddress}:`, error)
          }
        }
        setAllArtists(artistMap)

        setIsLoading(false)
      } catch (error) {
        console.error("[v0] Fatal error in fetchInitialTokens:", error)
        setTokens([])
        setIsLoading(false)
        setHasMore(false)
      }
    }

    fetchInitialTokens()
  }, [])

  useEffect(() => {
    if (!isLoading && allTokenConfigs.length > 0 && tokens.length === 0) {
      loadMoreTokens()
    }
  }, [isLoading, allTokenConfigs, tokens.length, loadMoreTokens])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreTokens()
        }
      },
      { threshold: 0.1 },
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoadingMore, loadMoreTokens])

  const filteredTokens = useMemo(() => {
    let filtered = tokens

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (token) =>
          token.name.toLowerCase().includes(query) ||
          token.artist.toLowerCase().includes(query) ||
          token.artistDisplay.toLowerCase().includes(query) ||
          Array.from(allArtists.entries()).some(
            ([address, displayName]) =>
              address.toLowerCase().includes(query) || displayName.toLowerCase().includes(query),
          ),
      )
    }

    if (selectedArtist) {
      filtered = filtered.filter((token) => token.artist === selectedArtist)
    }

    return filtered
  }, [tokens, searchQuery, selectedArtist, allArtists])

  const uniqueArtists = useMemo(() => {
    return Array.from(allArtists.entries()).map(([address, displayName]) => ({
      address,
      displayName,
    }))
  }, [allArtists])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-fixed-parallax"
        style={{
          backgroundImage: "url(/images/fondo-galeria.png)",
        }}
      />

      <div className="relative z-10">
        <header className="p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>

          <div className="mt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all flex-shrink-0"
                aria-label="Buscar"
                aria-expanded={isSearchOpen}
              >
                <Search className="w-5 h-5 text-white" />
              </button>

              <select
                value={selectedArtist}
                onChange={(e) => setSelectedArtist(e.target.value)}
                className="h-12 px-4 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 text-white text-sm focus:border-white/60 focus:outline-none flex-shrink-0"
                aria-label="Filtrar por artista"
              >
                <option value="" className="bg-gray-800">
                  TODOS LOS ARTISTAS
                </option>
                {uniqueArtists.map((artist) => (
                  <option key={artist.address} value={artist.address} className="bg-gray-800">
                    {artist.displayName}
                  </option>
                ))}
              </select>
            </div>

            {isSearchOpen && (
              <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                <input
                  type="text"
                  placeholder="BUSCAR POR TÍTULO O ARTISTA"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 px-4 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 text-white placeholder-white/60 focus:border-white/60 focus:outline-none"
                  autoFocus
                />
              </div>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto mb-8"></div>

          {isLoading || (tokens.length === 0 && isLoadingMore) ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-white text-lg">Cargando galería...</p>
              </div>
            </div>
          ) : filteredTokens.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTokens.map((token, index) => (
                  <Link
                    key={`${token.contractAddress}-${token.tokenId}-${index}`}
                    href={`/galeria/${token.contractAddress}/${token.tokenId}`}
                    className="group block"
                  >
                    <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                      <CardContent className="p-0">
                        <div className="relative w-full bg-gray-100" style={{ aspectRatio: "1" }}>
                          <Image
                            src={token.image || "/placeholder.svg"}
                            alt={token.name}
                            fill
                            className="object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-6 bg-white">
                          <h3 className="font-extrabold text-xl text-gray-800 mb-2">{token.name}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{token.description}</p>
                          <p className="text-xs text-gray-500">
                            Por:{" "}
                            <ArtistLink
                              artistName={token.artistDisplay}
                              artistAddress={token.artist}
                              className="text-xs"
                            />
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              <div ref={observerTarget} className="flex justify-center items-center py-8">
                {isLoadingMore && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                      <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-white text-sm">Cargando más obras...</p>
                  </div>
                )}
                {!hasMore && tokens.length > 0 && <p className="text-white/60 text-sm">Has visto todas las obras</p>}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-white text-lg">
                {searchQuery || selectedArtist ? "No se encontraron obras" : "No hay obras en la galería todavía"}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
