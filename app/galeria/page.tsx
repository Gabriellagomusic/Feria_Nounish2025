"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"
import { ArrowLeft, Search } from "lucide-react"
import { getDisplayName, batchGetDisplayNames } from "@/lib/farcaster"
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

interface TokenConfig {
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

async function fetchContractOwner(contractAddress: string, publicClient: any): Promise<string> {
  const localStorageOwner = getOwnerFromLocalStorage(contractAddress)
  if (localStorageOwner) {
    contractOwnerCache.set(contractAddress.toLowerCase(), localStorageOwner)
    return localStorageOwner
  }

  const cached = contractOwnerCache.get(contractAddress.toLowerCase())
  if (cached) {
    return cached
  }

  await new Promise((resolve) => setTimeout(resolve, 100)) // Reduced RPC delay from 300ms to 100ms

  try {
    const owner = await fetchWithRetry(async () => {
      return await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ERC1155_ABI,
        functionName: "owner",
      })
    })

    const ownerAddress = (owner as string).toLowerCase()
    contractOwnerCache.set(contractAddress.toLowerCase(), ownerAddress)
    setOwnerToLocalStorage(contractAddress, ownerAddress)
    return ownerAddress
  } catch (error) {
    console.error(`[v0] Error fetching owner for ${contractAddress}:`, error)
    // DO NOT cache failure
    // contractOwnerCache.set(contractAddress.toLowerCase(), "")
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

const TOKENS_PER_LOAD = 8 // Increased from 6 to 8 for faster loading

const RPC_DELAY = 50 // ms between RPC calls to avoid rate limiting
const TOKEN_DELAY = 100 // ms between processing tokens
const BATCH_DELAY = 300 // ms between batches

const failedTokensQueue: Array<{ config: TokenConfig; attempts: number }> = []
const MAX_RETRY_ATTEMPTS = 3

export default function GaleriaPage() {
  const router = useRouter()
  const [tokens, setTokens] = useState<TokenMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedArtist, setSelectedArtist] = useState<string>("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [allTokenConfigs, setAllTokenConfigs] = useState<TokenConfig[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [allArtists, setAllArtists] = useState<Map<string, string>>(new Map())
  const observerTarget = useRef<HTMLDivElement>(null)
  const shouldBackgroundLoad = useRef(true)

  const loadTokensByArtist = useCallback(
    async (artistQuery: string) => {
      if (!allTokenConfigs.length) return

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      // First, gather ALL artist addresses we need to check
      const configsToCheck = []
      const addressesToFetch = new Set<string>()

      for (const config of allTokenConfigs) {
        // Check if already loaded
        const alreadyLoaded = tokens.some(
          (t) => t.contractAddress === config.contractAddress && t.tokenId === config.tokenId,
        )
        if (alreadyLoaded) continue

        configsToCheck.push(config)
      }

      // If we have too many, just check the first batch to avoid RPC overload
      const batchToCheck = configsToCheck.slice(0, 50)

      const configOwnerMap = new Map<string, string>()

      // Fetch owners for this batch
      for (const config of batchToCheck) {
        try {
          const artistAddress = await fetchContractOwner(config.contractAddress, publicClient)
          if (artistAddress) {
            configOwnerMap.set(config.contractAddress, artistAddress)
            addressesToFetch.add(artistAddress)
          }
          await new Promise((resolve) => setTimeout(resolve, 20))
        } catch (error) {
          console.error(`[v0] Error checking artist for ${config.contractAddress}:`, error)
        }
      }

      // Bulk fetch display names
      const displayNames = await batchGetDisplayNames(Array.from(addressesToFetch))

      const matchingConfigs = []

      for (const config of batchToCheck) {
        const address = configOwnerMap.get(config.contractAddress)
        if (!address) continue

        const name = displayNames.get(address) || ""

        if (
          address.toLowerCase().includes(artistQuery.toLowerCase()) ||
          name.toLowerCase().includes(artistQuery.toLowerCase())
        ) {
          matchingConfigs.push(config)
        }
      }

      // Load the matching tokens
      if (matchingConfigs.length > 0) {
        setIsLoadingMore(true)
        const newTokens: TokenMetadata[] = []

        for (const config of matchingConfigs.slice(0, 8)) {
          // Load up to 8 tokens
          try {
            const artistAddress = configOwnerMap.get(config.contractAddress) || ""
            const artistDisplay = artistAddress
              ? displayNames.get(artistAddress) || "Artista Desconocido"
              : "Artista Desconocido"

            await new Promise((resolve) => setTimeout(resolve, TOKEN_DELAY))

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
                failedTokensQueue.push({ config, attempts: 0 })
              }
            }

            saveArtistData(config.contractAddress, config.tokenId, {
              address: artistAddress,
              displayName: artistDisplay,
            })

            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
          } catch (error) {
            console.error(`[v0] Error processing token ${config.contractAddress}:`, error)
            failedTokensQueue.push({ config, attempts: 0 })
          }
        }

        setTokens((prev) => {
          const existingKeys = new Set(prev.map((t) => `${t.contractAddress}-${t.tokenId}`))
          const uniqueNewTokens = newTokens.filter((t) => !existingKeys.has(`${t.contractAddress}-${t.tokenId}`))
          return [...prev, ...uniqueNewTokens]
        })

        setIsLoadingMore(false)
      }
    },
    [allTokenConfigs, tokens],
  )

  const loadMoreTokens = useCallback(
    async (displayNames?: Map<string, string>) => {
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
        const batchAddresses: string[] = []
        const configOwnerMap = new Map<string, string>()

        const ownerPromises = batch.map(async (config, index) => {
          try {
            await new Promise((resolve) => setTimeout(resolve, index * RPC_DELAY))
            const artistAddress = await fetchContractOwner(config.contractAddress, publicClient)
            if (artistAddress) {
              batchAddresses.push(artistAddress)
              configOwnerMap.set(config.contractAddress, artistAddress)
            }
          } catch (error) {
            console.error(`[v0] Error fetching owner for ${config.contractAddress}:`, error)
          }
        })

        await Promise.all(ownerPromises)

        const displayNameMap = displayNames || (await batchGetDisplayNames(batchAddresses))

        for (const config of batch) {
          try {
            const artistAddress = configOwnerMap.get(config.contractAddress) || ""
            const artistDisplay = artistAddress
              ? displayNameMap.get(artistAddress) || "Artista Desconocido"
              : "Artista Desconocido"

            await new Promise((resolve) => setTimeout(resolve, TOKEN_DELAY))

            const tokenURI = await fetchWithRetry(
              async () => {
                return await publicClient.readContract({
                  address: config.contractAddress as `0x${string}`,
                  abi: ERC1155_ABI,
                  functionName: "uri",
                  args: [BigInt(1)],
                })
              },
              3,
              2000,
            ) // 3 retries with 2s base delay for rate limit recovery

            if (tokenURI) {
              let metadataUrl = tokenURI.replace("{id}", "1")
              if (metadataUrl.startsWith("ar://")) {
                metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
              }

              try {
                const metadata = await fetchWithRetry(
                  async () => {
                    const response = await fetch(metadataUrl)
                    if (!response.ok) throw new Error(`HTTP ${response.status}`)
                    return await response.json()
                  },
                  3,
                  1000,
                )

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
                failedTokensQueue.push({ config, attempts: 0 })
              }
            }

            saveArtistData(config.contractAddress, config.tokenId, {
              address: artistAddress,
              displayName: artistDisplay,
            })

            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
          } catch (error) {
            console.error(`[v0] Error processing token ${config.contractAddress}:`, error)
            failedTokensQueue.push({ config, attempts: 0 })
          }
        }

        setTokens((prev) => {
          const existingKeys = new Set(prev.map((t) => `${t.contractAddress}-${t.tokenId}`))
          const uniqueNewTokens = newTokens.filter((t) => !existingKeys.has(`${t.contractAddress}-${t.tokenId}`))
          return [...prev, ...uniqueNewTokens]
        })

        setCurrentIndex(endIndex)
        setHasMore(endIndex < allTokenConfigs.length)
      } catch (error) {
        console.error("[v0] Error loading more tokens:", error)
      } finally {
        setIsLoadingMore(false)
      }
    },
    [currentIndex, allTokenConfigs, isLoadingMore, hasMore],
  )

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
            await new Promise((resolve) => setTimeout(resolve, RPC_DELAY))
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

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    if (hasMore && !isLoadingMore && !isLoading && tokens.length > 0 && shouldBackgroundLoad.current) {
      timeoutId = setTimeout(() => {
        loadMoreTokens()
      }, 500)
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [hasMore, isLoadingMore, isLoading, tokens.length, loadMoreTokens])

  useEffect(() => {
    const retryFailedTokens = async () => {
      console.log(`[v0] Retrying ${failedTokensQueue.length} failed tokens...`)

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const tokensToRetry = [...failedTokensQueue]
      failedTokensQueue.length = 0 // Clear the queue

      for (const { config, attempts } of tokensToRetry) {
        if (attempts >= MAX_RETRY_ATTEMPTS) {
          console.log(`[v0] Max retries reached for ${config.contractAddress}, skipping`)
          continue
        }

        try {
          console.log(`[v0] Retry attempt ${attempts + 1} for ${config.contractAddress}`)

          const artistAddress = await fetchContractOwner(config.contractAddress, publicClient)
          const artistDisplay = artistAddress ? await getDisplayName(artistAddress) : "Artista Desconocido"

          await new Promise((resolve) => setTimeout(resolve, TOKEN_DELAY))

          const tokenURI = await fetchWithRetry(
            async () => {
              return await publicClient.readContract({
                address: config.contractAddress as `0x${string}`,
                abi: ERC1155_ABI,
                functionName: "uri",
                args: [BigInt(1)],
              })
            },
            3,
            2000,
          )

          if (tokenURI) {
            let metadataUrl = tokenURI.replace("{id}", "1")
            if (metadataUrl.startsWith("ar://")) {
              metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
            }

            const metadata = await fetchWithRetry(
              async () => {
                const response = await fetch(metadataUrl)
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                return await response.json()
              },
              3,
              1000,
            )

            let imageUrl = metadata.image
            if (imageUrl?.startsWith("ipfs://")) {
              imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
            } else if (imageUrl?.startsWith("ar://")) {
              imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
            }

            const newToken = {
              name: metadata.name || `Obra de Arte #${config.tokenId}`,
              description: metadata.description || "Obra de arte digital única",
              image: imageUrl || "/placeholder.svg",
              artist: artistAddress,
              artistDisplay: artistDisplay,
              contractAddress: config.contractAddress,
              tokenId: config.tokenId,
            }

            setTokens((prev) => {
              // Check if token already exists
              const exists = prev.some(
                (t) => t.contractAddress === newToken.contractAddress && t.tokenId === newToken.tokenId,
              )
              if (exists) return prev
              return [...prev, newToken]
            })

            saveArtistData(config.contractAddress, config.tokenId, {
              address: artistAddress,
              displayName: artistDisplay,
            })

            console.log(`[v0] Successfully retried ${config.contractAddress}`)
          }

          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
        } catch (error) {
          console.error(`[v0] Retry failed for ${config.contractAddress}:`, error)
          // Re-add to queue with incremented attempts
          failedTokensQueue.push({ config, attempts: attempts + 1 })
        }
      }
    }

    const retryTimer = setTimeout(retryFailedTokens, 10000) // Retry after 10 seconds

    return () => clearTimeout(retryTimer)
  }, [tokens.length]) // Trigger when tokens change

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

        <main className="container mx-auto px-4 pb-20 pt-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTokens.map((token) => (
                  <Card
                    key={`${token.contractAddress}-${token.tokenId}`}
                    className="overflow-hidden bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        <Link href={`/galeria/${token.contractAddress}/${token.tokenId}`} className="block">
                          <div className="aspect-square relative overflow-hidden bg-gray-100">
                            <Image
                              src={token.image || "/placeholder.svg"}
                              alt={token.name}
                              fill
                              className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          </div>
                        </Link>

                        <div className="p-4">
                          <Link href={`/galeria/${token.contractAddress}/${token.tokenId}`} className="block mb-2">
                            <h3 className="font-bold text-lg truncate text-gray-900 group-hover:text-purple-600 transition-colors">
                              {token.name}
                            </h3>
                          </Link>

                          <ArtistLink
                            artistName={token.artistDisplay}
                            artistAddress={token.artist}
                            className="text-sm text-gray-600 hover:text-purple-600 transition-colors block mb-3"
                          />

                          <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{token.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
              {isLoadingMore ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-white text-lg">Buscando obras...</p>
                </div>
              ) : (
                <p className="text-white text-lg">
                  {searchQuery || selectedArtist ? "No se encontraron obras" : "No hay obras en la galería todavía"}
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
