"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"
import { ArrowLeft, Search, ChevronDown, ChevronUp } from "lucide-react"
import { getDisplayName } from "@/lib/farcaster"
import { getAllMoments, buildMomentLookupMap, type Moment } from "@/lib/inprocess"

interface TokenMetadata {
  name: string
  description: string
  image: string
  artist: string
  artistDisplay: string
  contractAddress: string
  tokenId: string
}

interface DebugLog {
  timestamp: string
  type: "info" | "success" | "error" | "warning"
  message: string
  data?: any
}

const ERC1155_ABI = [
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "uri",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function formatAddress(address: string): string {
  return address.slice(0, 6) + "..." + address.slice(-4)
}

async function fetchArtistForToken(
  contractAddress: string,
  tokenId: string,
  momentLookup: Map<string, Moment>,
  addDebugLog: (log: DebugLog) => void,
): Promise<{ address: string; displayName: string }> {
  try {
    addDebugLog({
      timestamp: new Date().toISOString(),
      type: "info",
      message: "🔍 Starting fetchArtistForToken - LOOKUP MAP METHOD",
      data: { contractAddress, tokenId, lookupMapSize: momentLookup.size },
    })

    const normalizedAddress = contractAddress.toLowerCase()
    const moment = momentLookup.get(normalizedAddress)

    if (!moment) {
      addDebugLog({
        timestamp: new Date().toISOString(),
        type: "warning",
        message: "⚠️ No moment found in lookup map for this contract address",
        data: {
          contractAddress,
          normalizedAddress,
          availableAddresses: Array.from(momentLookup.keys()).slice(0, 5), // Show first 5 for debugging
        },
      })

      const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
      const displayName = await getDisplayName(fallbackCreator)
      return {
        address: fallbackCreator.toLowerCase(),
        displayName: displayName,
      }
    }

    addDebugLog({
      timestamp: new Date().toISOString(),
      type: "success",
      message: "🎉 Found moment in lookup map! Extracting artist info",
      data: {
        contractAddress: moment.address,
        creatorWallet: moment.admin,
        creatorUsername: moment.username,
      },
    })

    if (moment.username) {
      addDebugLog({
        timestamp: new Date().toISOString(),
        type: "success",
        message: "✅ Using moment username directly",
        data: {
          creatorWallet: moment.admin,
          username: moment.username,
        },
      })

      return {
        address: moment.admin.toLowerCase(),
        displayName: moment.username,
      }
    }

    addDebugLog({
      timestamp: new Date().toISOString(),
      type: "info",
      message: "🔎 Fetching Farcaster username for wallet",
      data: { wallet: moment.admin },
    })

    const displayName = await getDisplayName(moment.admin)

    addDebugLog({
      timestamp: new Date().toISOString(),
      type: "success",
      message: "✅ Artist resolved successfully",
      data: {
        creatorWallet: moment.admin,
        displayName: displayName,
        source: "farcaster lookup",
      },
    })

    return {
      address: moment.admin.toLowerCase(),
      displayName: displayName,
    }
  } catch (error) {
    addDebugLog({
      timestamp: new Date().toISOString(),
      type: "error",
      message: "💥 Error in fetchArtistForToken",
      data: { error: error instanceof Error ? error.message : String(error) },
    })

    const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
    return {
      address: fallbackCreator.toLowerCase(),
      displayName: formatAddress(fallbackCreator),
    }
  }
}

export default function GaleriaPage() {
  const router = useRouter()
  const [tokens, setTokens] = useState<TokenMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedArtist, setSelectedArtist] = useState<string>("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [isDebugOpen, setIsDebugOpen] = useState(false)

  const addDebugLog = (log: DebugLog) => {
    setDebugLogs((prev) => [...prev, log])
    console.log(`[v0] [${log.type.toUpperCase()}]`, log.message, log.data || "")
  }

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        addDebugLog({
          timestamp: new Date().toISOString(),
          type: "info",
          message: "🚀 Starting gallery fetch",
        })

        addDebugLog({
          timestamp: new Date().toISOString(),
          type: "info",
          message: "📚 Fetching complete timeline (all pages)...",
        })

        const allMoments = await getAllMoments(8453)
        const momentLookup = buildMomentLookupMap(allMoments)

        addDebugLog({
          timestamp: new Date().toISOString(),
          type: "success",
          message: "✅ Timeline fetched and indexed",
          data: {
            totalMoments: allMoments.length,
            lookupMapSize: momentLookup.size,
            sampleAddresses: Array.from(momentLookup.keys()).slice(0, 10),
          },
        })

        const galleryResponse = await fetch("/api/gallery/list")
        const galleryData = await galleryResponse.json()

        addDebugLog({
          timestamp: new Date().toISOString(),
          type: "info",
          message: "Gallery API response",
          data: { tokenCount: galleryData.tokens?.length || 0 },
        })

        if (!galleryData.tokens || galleryData.tokens.length === 0) {
          addDebugLog({
            timestamp: new Date().toISOString(),
            type: "warning",
            message: "No tokens in gallery",
          })
          setTokens([])
          setIsLoading(false)
          return
        }

        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const tokenDataPromises = galleryData.tokens.map(
          async (config: { contractAddress: string; tokenId: string }) => {
            try {
              addDebugLog({
                timestamp: new Date().toISOString(),
                type: "info",
                message: "Processing token",
                data: config,
              })

              const artistInfo = await fetchArtistForToken(
                config.contractAddress,
                config.tokenId,
                momentLookup,
                addDebugLog,
              )

              const tokenURI = await publicClient.readContract({
                address: config.contractAddress as `0x${string}`,
                abi: ERC1155_ABI,
                functionName: "uri",
                args: [BigInt(1)],
              })

              addDebugLog({
                timestamp: new Date().toISOString(),
                type: "info",
                message: "Token URI fetched",
                data: { tokenURI },
              })

              if (tokenURI) {
                let metadataUrl = tokenURI.replace("{id}", "1")
                if (metadataUrl.startsWith("ar://")) {
                  metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
                }

                try {
                  const metadataResponse = await fetch(metadataUrl)
                  if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json()

                    let imageUrl = metadata.image
                    if (imageUrl?.startsWith("ipfs://")) {
                      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
                    } else if (imageUrl?.startsWith("ar://")) {
                      imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
                    }

                    addDebugLog({
                      timestamp: new Date().toISOString(),
                      type: "success",
                      message: "Metadata fetched successfully",
                      data: {
                        name: metadata.name,
                        artist: artistInfo.displayName,
                      },
                    })

                    return {
                      name: metadata.name || `Obra de Arte #${config.tokenId}`,
                      description: metadata.description || "Obra de arte digital única",
                      image: imageUrl || "/placeholder.svg",
                      artist: artistInfo.address,
                      artistDisplay: artistInfo.displayName,
                      contractAddress: config.contractAddress,
                      tokenId: config.tokenId,
                    }
                  }
                } catch (fetchError) {
                  addDebugLog({
                    timestamp: new Date().toISOString(),
                    type: "error",
                    message: "Error fetching metadata",
                    data: fetchError,
                  })
                }
              }

              return {
                name: `Obra de Arte #${config.tokenId}`,
                description: "Obra de arte digital única de la colección oficial",
                image: "/placeholder.svg",
                artist: artistInfo.address,
                artistDisplay: artistInfo.displayName,
                contractAddress: config.contractAddress,
                tokenId: config.tokenId,
              }
            } catch (error) {
              addDebugLog({
                timestamp: new Date().toISOString(),
                type: "error",
                message: "Error processing token",
                data: { config, error },
              })

              const fallbackArtist = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
              return {
                name: `Obra de Arte #${config.tokenId}`,
                description: "Obra de arte digital única de la colección oficial",
                image: "/placeholder.svg",
                artist: fallbackArtist,
                artistDisplay: formatAddress(fallbackArtist),
                contractAddress: config.contractAddress,
                tokenId: config.tokenId,
              }
            }
          },
        )

        const tokenData = await Promise.all(tokenDataPromises)
        setTokens(shuffleArray(tokenData))

        addDebugLog({
          timestamp: new Date().toISOString(),
          type: "success",
          message: "✅ Gallery fetch complete",
          data: { totalTokens: tokenData.length },
        })
      } catch (error) {
        addDebugLog({
          timestamp: new Date().toISOString(),
          type: "error",
          message: "Fatal error in fetchTokenMetadata",
          data: error,
        })
        setTokens([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokenMetadata()
  }, [])

  const filteredTokens = useMemo(() => {
    let filtered = tokens

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (token) =>
          token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.artistDisplay.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (selectedArtist) {
      filtered = filtered.filter((token) => token.artist === selectedArtist)
    }

    return filtered
  }, [tokens, searchQuery, selectedArtist])

  const uniqueArtists = useMemo(() => {
    const artistMap = new Map<string, string>()
    tokens.forEach((token) => {
      if (!artistMap.has(token.artist)) {
        artistMap.set(token.artist, token.artistDisplay)
      }
    })
    return Array.from(artistMap.entries()).map(([address, displayName]) => ({
      address,
      displayName,
    }))
  }, [tokens])

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

          <div className="mt-4">
            <button
              onClick={() => setIsDebugOpen(!isDebugOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/50 transition-all"
            >
              <span className="text-white font-semibold text-sm">🐛 Debug Panel ({debugLogs.length} logs)</span>
              {isDebugOpen ? (
                <ChevronUp className="w-5 h-5 text-white" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white" />
              )}
            </button>

            {isDebugOpen && (
              <div className="mt-2 max-h-96 overflow-y-auto rounded-lg bg-black/60 backdrop-blur-md border border-white/20 p-4">
                <div className="space-y-2">
                  {debugLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded text-xs font-mono ${
                        log.type === "success"
                          ? "bg-green-500/20 border border-green-500/40"
                          : log.type === "error"
                            ? "bg-red-500/20 border border-red-500/40"
                            : log.type === "warning"
                              ? "bg-yellow-500/20 border border-yellow-500/40"
                              : "bg-blue-500/20 border border-blue-500/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-white/60 text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.type === "success"
                              ? "bg-green-500 text-white"
                              : log.type === "error"
                                ? "bg-red-500 text-white"
                                : log.type === "warning"
                                  ? "bg-yellow-500 text-black"
                                  : "bg-blue-500 text-white"
                          }`}
                        >
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-white mb-1">{log.message}</div>
                      {log.data && (
                        <pre className="text-white/70 text-[10px] overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto mb-8"></div>

          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <p className="text-white text-lg">Cargando...</p>
            </div>
          ) : filteredTokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token, index) => (
                <Link
                  key={`${token.contractAddress}-${token.tokenId}-${index}`}
                  href={`/galeria/${token.contractAddress}/${token.tokenId}`}
                  className="group block"
                >
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                    <CardContent className="p-0">
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <Image
                          src={token.image || "/placeholder.svg"}
                          alt={token.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-6 bg-white">
                        <h3 className="font-extrabold text-xl text-gray-800 mb-2">{token.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{token.description}</p>
                        <p className="text-xs text-gray-500">Por: {token.artistDisplay}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-white text-lg">No hay obras en la galería todavía</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
