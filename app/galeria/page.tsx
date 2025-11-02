"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"
import { ArrowLeft, Search, ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import { getDisplayName } from "@/lib/farcaster"
import { getAllMoments, buildMomentLookupMap, type Moment } from "@/lib/inprocess"
import { Button } from "@/components/ui/button"

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
  addLog: (message: string, data?: any) => void,
): Promise<{ address: string; displayName: string }> {
  try {
    addLog(`🔍 Fetching artist for contract: ${contractAddress}, tokenId: ${tokenId}`)
    const normalizedAddress = contractAddress.toLowerCase()
    addLog(`📝 Normalized address: ${normalizedAddress}`)

    const moment = momentLookup.get(normalizedAddress)
    addLog(`🗺️ Moment lookup result:`, moment ? { admin: moment.admin, username: moment.username } : null)

    if (!moment) {
      addLog(`⚠️ No moment found for ${normalizedAddress}, using fallback`)
      const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
      const displayName = await getDisplayName(fallbackCreator)
      addLog(`✅ Fallback artist: ${displayName} (${fallbackCreator})`)
      return {
        address: fallbackCreator.toLowerCase(),
        displayName: displayName,
      }
    }

    if (moment.username) {
      addLog(`✅ Found username in moment: ${moment.username}`)
      return {
        address: moment.admin.toLowerCase(),
        displayName: moment.username,
      }
    }

    addLog(`🔄 No username in moment, fetching display name for: ${moment.admin}`)
    const displayName = await getDisplayName(moment.admin)
    addLog(`✅ Fetched display name: ${displayName}`)

    return {
      address: moment.admin.toLowerCase(),
      displayName: displayName,
    }
  } catch (error) {
    addLog(`❌ Error fetching artist:`, error)
    const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
    return {
      address: fallbackCreator.toLowerCase(),
      displayName: formatAddress(fallbackCreator),
    }
  }
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
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [copiedLogs, setCopiedLogs] = useState(false)

  const addDebugLog = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
    const log = { timestamp, message, data }
    setDebugLogs((prev) => [...prev, log])
  }

  const copyLogsToClipboard = async () => {
    const logsText = debugLogs
      .map((log) => {
        const dataStr = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : ""
        return `[${log.timestamp}] ${log.message}${dataStr}`
      })
      .join("\n\n")

    try {
      await navigator.clipboard.writeText(logsText)
      setCopiedLogs(true)
      setTimeout(() => setCopiedLogs(false), 2000)
    } catch (error) {
      console.error("Failed to copy logs:", error)
    }
  }

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        addDebugLog("🚀 Starting gallery fetch")

        const [allMoments, galleryData] = await Promise.all([
          fetchWithRetry(async () => await getAllMoments(8453)),
          fetchWithRetry(async () => {
            const response = await fetch("/api/gallery/list")
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return await response.json()
          }),
        ])

        addDebugLog(`📊 Fetched ${allMoments.length} moments from InProcess`)
        addDebugLog(`📊 Fetched ${galleryData.tokens?.length || 0} tokens from gallery API`)

        const momentLookup = buildMomentLookupMap(allMoments)
        addDebugLog(`🗺️ Built moment lookup map with ${momentLookup.size} entries`, {
          keys: Array.from(momentLookup.keys()),
        })

        if (!galleryData.tokens || galleryData.tokens.length === 0) {
          addDebugLog("⚠️ No tokens found in gallery data")
          setTokens([])
          setIsLoading(false)
          return
        }

        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const BATCH_SIZE = 5
        const tokenData: TokenMetadata[] = []

        for (let i = 0; i < galleryData.tokens.length; i += BATCH_SIZE) {
          const batch = galleryData.tokens.slice(i, i + BATCH_SIZE)
          addDebugLog(
            `📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(galleryData.tokens.length / BATCH_SIZE)}`,
          )

          const batchResults = await Promise.all(
            batch.map(async (config: { contractAddress: string; tokenId: string }) => {
              try {
                addDebugLog(`🎨 Processing token: ${config.contractAddress} #${config.tokenId}`)

                const artistInfo = await fetchArtistForToken(
                  config.contractAddress,
                  config.tokenId,
                  momentLookup,
                  addDebugLog,
                )

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

                    addDebugLog(`✅ Successfully processed token: ${metadata.name}`, {
                      artist: artistInfo.displayName,
                      address: artistInfo.address,
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
                  } catch (fetchError) {
                    addDebugLog(`❌ Error fetching metadata:`, fetchError)
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
                addDebugLog(`❌ Error processing token:`, error)

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
            }),
          )

          tokenData.push(...batchResults)
          setTokens(shuffleArray([...tokenData]))
        }

        addDebugLog(`🎉 Gallery fetch complete! Loaded ${tokenData.length} tokens`)
      } catch (error) {
        addDebugLog(`❌ Fatal error in fetchTokenMetadata:`, error)
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

    return filtered
  }, [tokens, searchQuery])

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

          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-white text-lg">Cargando...</p>
              </div>
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
                      <div className="relative aspect-square overflow-hidden bg-white">
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
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Por: {token.artistDisplay}</p>
                          <p className="text-xs text-gray-400 font-mono">{formatAddress(token.artist)}</p>
                        </div>
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

          <div className="fixed bottom-4 right-4 z-50 max-w-md">
            <Card className="shadow-2xl">
              <CardContent className="p-4">
                <button
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span>🐛 Debug Logs ({debugLogs.length})</span>
                  {showDebugPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showDebugPanel && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-end">
                      <Button
                        onClick={copyLogsToClipboard}
                        variant="outline"
                        size="sm"
                        className="text-xs bg-transparent"
                      >
                        {copiedLogs ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Logs
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="max-h-96 overflow-y-auto bg-gray-900 rounded-lg p-3 space-y-1">
                      {debugLogs.length === 0 ? (
                        <p className="text-gray-400 text-xs">No logs yet...</p>
                      ) : (
                        debugLogs.map((log, index) => (
                          <div key={index} className="text-xs font-mono text-gray-300">
                            <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                            {log.data && (
                              <pre className="text-gray-400 mt-1 ml-4 text-[10px] overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
