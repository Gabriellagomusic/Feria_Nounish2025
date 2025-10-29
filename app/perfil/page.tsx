"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { useAccount } from "wagmi"
import { getDisplayName, getFarcasterProfilePic } from "@/lib/farcaster"
import { getNounAvatarUrl } from "@/lib/noun-avatar"
import { getTimeline, type Moment } from "@/lib/inprocess"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

interface MomentWithImage extends Moment {
  imageUrl: string
  title: string
  description?: string
  metadataError?: string
  debugInfo?: {
    apiUri: string
    contractUri?: string
    fetchedUrl: string
    responseStatus?: number
    contentType?: string
    isDirectImage: boolean
    parseError?: string
    rawResponse?: string
  }
}

interface DebugInfo {
  rawApiResponse: any
  filteredMoments: any[]
  processedMoments: any[]
  metadataFetchLogs: Array<{
    tokenId: string
    contractAddress: string
    step: string
    data: any
    error?: string
  }>
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

const KNOWN_TOKENS: Record<
  string,
  {
    name: string
    description: string
    artistName: string
  }
> = {
  // TokenId 0 mappings
  "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5-0": {
    name: "Experimental Music Sessions",
    description: "🎶🎵🎤",
    artistName: "gabriellagomusic",
  },
  "0xfaa54c8258b419ab0411da8ddc1985f42f98f59b-0": {
    name: "Feria Nounish NFT",
    description: "Obra de arte digital única de ferianounish",
    artistName: "ferianounish",
  },
  // TokenId 1 mappings (keeping for compatibility)
  "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5-1": {
    name: "Experimental Music Sessions",
    description: "🎶🎵🎤",
    artistName: "gabriellagomusic",
  },
  "0xfaa54c8258b419ab0411da8ddc1985f42f98f59b-1": {
    name: "Feria Nounish NFT",
    description: "Obra de arte digital única de ferianounish",
    artistName: "ferianounish",
  },
}

function getKnownTokenMetadata(contractAddress: string, tokenId: string) {
  const key = `${contractAddress.toLowerCase()}-${tokenId}`
  return KNOWN_TOKENS[key]
}

export default function PerfilPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()

  const [userName, setUserName] = useState<string>("")
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [moments, setMoments] = useState<MomentWithImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null)

  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    rawApiResponse: null,
    filteredMoments: [],
    processedMoments: [],
    metadataFetchLogs: [],
  })
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    console.log("[v0] PerfilPage - Component mounted")
    console.log("[v0] PerfilPage - Initial state:", {
      address,
      isConnected,
      isLoading,
    })
  }, [])

  useEffect(() => {
    console.log("[v0] PerfilPage - Account state changed:", {
      address,
      isConnected,
      addressType: typeof address,
      addressValue: address,
    })
  }, [address, isConnected])

  const convertToGatewayUrl = (uri: string): string => {
    if (uri.startsWith("ar://")) {
      return uri.replace("ar://", "https://arweave.net/")
    } else if (uri.startsWith("ipfs://")) {
      return uri.replace("ipfs://", "https://ipfs.io/ipfs/")
    }
    return uri
  }

  useEffect(() => {
    const checkWhitelist = async () => {
      if (!address) {
        setIsWhitelisted(false)
        return
      }

      try {
        const response = await fetch(`/api/whitelist/check?address=${address}`)
        const data = await response.json()

        if (!data.isWhitelisted) {
          alert("No tienes acceso a esta página. Solo artistas autorizados pueden ver su perfil.")
          router.push("/")
          return
        }

        setIsWhitelisted(data.isWhitelisted)
      } catch (error) {
        console.error("Error checking whitelist:", error)
        setIsWhitelisted(false)
        router.push("/")
      }
    }

    checkWhitelist()
  }, [address, router])

  useEffect(() => {
    if (isWhitelisted === null || !isWhitelisted) {
      return
    }

    if (!address) {
      setIsLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const newDebugInfo: DebugInfo = {
          rawApiResponse: null,
          filteredMoments: [],
          processedMoments: [],
          metadataFetchLogs: [],
        }

        const picUrl = await getFarcasterProfilePic(address)
        setProfilePicUrl(picUrl)

        const displayName = await getDisplayName(address)
        setUserName(displayName)

        console.log("[v0] Fetching timeline for address:", address)
        const timelineData = await getTimeline(1, 100, true, address, 8453, false)

        newDebugInfo.rawApiResponse = timelineData
        console.log("[v0] Raw API response:", timelineData)

        if (timelineData.moments && timelineData.moments.length > 0) {
          const filteredMoments = timelineData.moments.filter(
            (moment) => moment.admin.toLowerCase() === address.toLowerCase(),
          )

          newDebugInfo.filteredMoments = filteredMoments
          console.log("[v0] Filtered moments:", filteredMoments)

          const publicClient = createPublicClient({
            chain: base,
            transport: http(),
          })

          const momentsWithMetadata = await Promise.all(
            filteredMoments.map(async (moment) => {
              const logEntry = {
                tokenId: "1", // Always use tokenId 1
                contractAddress: moment.address,
                step: "",
                data: {} as any,
              }

              try {
                console.log(`[v0] Processing token at ${moment.address} with tokenId 1`)

                // Step 1: Get URI from contract using tokenId 1 (same as galeria)
                const tokenURI = await publicClient.readContract({
                  address: moment.address as `0x${string}`,
                  abi: ERC1155_ABI,
                  functionName: "uri",
                  args: [BigInt(1)], // Always use tokenId 1
                })

                logEntry.step = "Got URI from contract"
                logEntry.data.tokenURI = tokenURI

                if (tokenURI) {
                  // Step 2: Replace {id} with tokenId (same as galeria)
                  let metadataUrl = tokenURI.replace("{id}", "1")

                  // Step 3: Convert ar:// to gateway URL (same as galeria)
                  if (metadataUrl.startsWith("ar://")) {
                    metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
                  }

                  logEntry.data.metadataUrl = metadataUrl

                  // Step 4: Fetch and parse metadata (same as galeria)
                  const metadataResponse = await fetch(metadataUrl)

                  if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json()

                    logEntry.step = "Successfully fetched and parsed metadata"
                    logEntry.data.metadata = metadata

                    // Step 5: Convert image URLs (same as galeria)
                    let imageUrl = metadata.image
                    if (imageUrl?.startsWith("ipfs://")) {
                      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
                    } else if (imageUrl?.startsWith("ar://")) {
                      imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
                    }

                    newDebugInfo.metadataFetchLogs.push(logEntry)

                    return {
                      ...moment,
                      imageUrl: imageUrl || "/placeholder.svg",
                      title: metadata.name || `Obra de Arte #1`,
                      description: metadata.description || "Obra de arte digital única",
                    }
                  }
                }

                // Fallback if metadata fetch fails (same as galeria)
                logEntry.step = "Using fallback data"
                newDebugInfo.metadataFetchLogs.push(logEntry)

                return {
                  ...moment,
                  imageUrl: "/placeholder.svg",
                  title: `Obra de Arte #1`,
                  description: "Obra de arte digital única de la colección oficial",
                }
              } catch (error) {
                console.error(`[v0] Error processing token at ${moment.address}:`, error)
                logEntry.step = "Error occurred"
                logEntry.data.error = error instanceof Error ? error.message : String(error)
                newDebugInfo.metadataFetchLogs.push(logEntry)

                // Fallback on error (same as galeria)
                return {
                  ...moment,
                  imageUrl: "/placeholder.svg",
                  title: `Obra de Arte #1`,
                  description: "Obra de arte digital única de la colección oficial",
                  metadataError: error instanceof Error ? error.message : "Unknown error",
                }
              }
            }),
          )

          newDebugInfo.processedMoments = momentsWithMetadata
          console.log("[v0] Processed moments with metadata:", momentsWithMetadata)

          setMoments(momentsWithMetadata)
          setDebugInfo(newDebugInfo)
        } else {
          setMoments([])
          setDebugInfo(newDebugInfo)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        console.error("[v0] Error in fetchData:", errorMsg, error)
        setError(errorMsg)
        setMoments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [address, isConnected, isWhitelisted])

  const handleAddToGallery = async (moment: MomentWithImage) => {
    alert(`Agregar ${moment.title} a la galería (funcionalidad pendiente)`)
  }

  if (isWhitelisted === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white text-lg">Verificando acceso...</p>
      </div>
    )
  }

  if (!isWhitelisted) {
    return null
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-fixed-parallax"
        style={{
          backgroundImage: "url(/images/fondo-crear-nuevo.png)",
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
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto mb-12">
            {address && (
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl mb-4">
                  <Image
                    src={profilePicUrl || getNounAvatarUrl(address) || "/placeholder.svg"}
                    alt="Profile Avatar"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
            <h1 className="font-extrabold text-4xl text-white text-center">
              {address ? userName || "Cargando..." : "Conecta tu wallet"}
            </h1>
            <p className="text-center text-white/70 mt-2 text-sm">
              {isConnected ? `Conectado: ${address?.slice(0, 6)}...${address?.slice(-4)}` : "No conectado"}
            </p>
          </div>

          <div className="max-w-6xl mx-auto mb-8">
            <Button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 flex items-center justify-center gap-2"
            >
              {showDebug ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              Debug Information
              {showDebug ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>

            {showDebug && (
              <Card className="mt-4 bg-black/90 border-yellow-500">
                <CardContent className="p-6 text-white font-mono text-xs max-h-[600px] overflow-y-auto">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-yellow-400 font-bold text-sm mb-2">Raw API Response:</h3>
                      <pre className="bg-gray-900 p-3 rounded overflow-x-auto">
                        {JSON.stringify(debugInfo.rawApiResponse, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <h3 className="text-yellow-400 font-bold text-sm mb-2">
                        Filtered Moments ({debugInfo.filteredMoments.length}):
                      </h3>
                      <pre className="bg-gray-900 p-3 rounded overflow-x-auto">
                        {JSON.stringify(debugInfo.filteredMoments, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <h3 className="text-yellow-400 font-bold text-sm mb-2">Metadata Fetch Logs:</h3>
                      {debugInfo.metadataFetchLogs.map((log, index) => (
                        <div key={index} className="bg-gray-900 p-3 rounded mb-2">
                          <p className="text-green-400 font-bold">
                            Token {log.tokenId} - {log.step}
                          </p>
                          <pre className="mt-2 text-xs overflow-x-auto">{JSON.stringify(log.data, null, 2)}</pre>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h3 className="text-yellow-400 font-bold text-sm mb-2">
                        Processed Moments ({debugInfo.processedMoments.length}):
                      </h3>
                      <pre className="bg-gray-900 p-3 rounded overflow-x-auto">
                        {JSON.stringify(debugInfo.processedMoments, null, 2)}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="max-w-6xl mx-auto">
            {error && (
              <div className="text-center py-8 mb-4">
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
                  <p className="text-white font-semibold">Error: {error}</p>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <p className="text-white text-lg">Cargando...</p>
              </div>
            ) : moments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {moments.map((moment) => (
                  <Card
                    key={moment.id}
                    className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <Image
                          src={moment.imageUrl || "/placeholder.svg"}
                          alt={moment.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="p-6 bg-white">
                        <h3 className="font-extrabold text-xl text-gray-800 mb-2">{moment.title}</h3>
                        {moment.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{moment.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mb-4">Por: {moment.username || userName}</p>

                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 font-semibold mb-1">NFT Hash:</p>
                          <p className="text-xs text-gray-700 font-mono break-all mb-1">{moment.address}</p>
                          <p className="text-xs text-gray-700 font-mono">Token ID: 1</p>
                        </div>

                        {moment.metadataError && (
                          <details className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-xs">
                            <summary className="font-semibold text-yellow-800 cursor-pointer">
                              ⚠️ Error (Click to expand)
                            </summary>
                            <div className="mt-2 space-y-1">
                              <p className="text-yellow-700 font-mono">{moment.metadataError}</p>
                              <p className="text-yellow-600">
                                <span className="font-semibold">Contract:</span> {moment.address}
                              </p>
                              <p className="text-yellow-600">
                                <span className="font-semibold">Token ID:</span> 1
                              </p>
                            </div>
                          </details>
                        )}

                        <Button
                          onClick={() => handleAddToGallery(moment)}
                          className="w-full bg-[#FF0B00] hover:bg-[#CC0900] text-white font-semibold"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar a Galería
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-white text-lg mb-2">No tienes NFTs todavía</p>
                <p className="text-white/70 text-sm">
                  {address
                    ? `Buscando NFTs creados por: ${address.slice(0, 6)}...${address.slice(-4)}`
                    : "Conecta tu wallet para ver tus NFTs"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
