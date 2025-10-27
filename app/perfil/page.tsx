"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Plus } from "lucide-react"
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

export default function PerfilPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()

  const [userName, setUserName] = useState<string>("")
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [moments, setMoments] = useState<MomentWithImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    console.log("[v0] PerfilPage - Main useEffect triggered")
    console.log("[v0] PerfilPage - Address:", address)
    console.log("[v0] PerfilPage - isConnected:", isConnected)

    if (!address) {
      console.log("[v0] PerfilPage - No address, setting loading to false")
      setIsLoading(false)
      return
    }

    console.log("[v0] PerfilPage - Starting fetchData for address:", address)

    const fetchData = async () => {
      try {
        console.log("[v0] PerfilPage - fetchData started")
        setIsLoading(true)
        setError(null)

        console.log("[v0] PerfilPage - Fetching profile pic...")
        const picUrl = await getFarcasterProfilePic(address)
        console.log("[v0] PerfilPage - Profile pic URL:", picUrl)
        setProfilePicUrl(picUrl)

        console.log("[v0] PerfilPage - Fetching display name...")
        const displayName = await getDisplayName(address)
        console.log("[v0] PerfilPage - Display name:", displayName)
        setUserName(displayName)

        console.log("[v0] PerfilPage - Fetching timeline for address:", address)
        const timelineData = await getTimeline(1, 100, true, address, 8453, false)
        console.log("[v0] PerfilPage - Timeline data received:", timelineData)
        console.log("[v0] PerfilPage - Number of moments:", timelineData.moments?.length || 0)

        if (timelineData.moments && timelineData.moments.length > 0) {
          const filteredMoments = timelineData.moments.filter(
            (moment) => moment.admin.toLowerCase() === address.toLowerCase(),
          )

          console.log("[v0] PerfilPage - Filtered moments (created by user):", filteredMoments.length)
          filteredMoments.forEach((moment, index) => {
            console.log(`[v0] PerfilPage - Moment ${index}:`, {
              id: moment.id,
              tokenId: moment.tokenId,
              address: moment.address,
              admin: moment.admin,
              uri: moment.uri,
            })
          })

          console.log("[v0] PerfilPage - Starting metadata fetch using gallery method")
          const publicClient = createPublicClient({
            chain: base,
            transport: http(),
          })

          const momentsWithMetadata = await Promise.all(
            filteredMoments.map(async (moment) => {
              try {
                console.log(`[v0] PerfilPage - Fetching URI for token ${moment.tokenId} at ${moment.address}`)

                const tokenURI = await publicClient.readContract({
                  address: moment.address as `0x${string}`,
                  abi: ERC1155_ABI,
                  functionName: "uri",
                  args: [BigInt(moment.tokenId)],
                })

                console.log(`[v0] PerfilPage - Token URI received:`, tokenURI)

                if (tokenURI) {
                  // Replace {id} placeholder with actual token ID
                  let metadataUrl = tokenURI.replace("{id}", moment.tokenId.toString())
                  console.log(`[v0] PerfilPage - After {id} replacement:`, metadataUrl)

                  // Convert ar:// to Arweave gateway URL
                  if (metadataUrl.startsWith("ar://")) {
                    metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
                    console.log(`[v0] PerfilPage - After ar:// conversion:`, metadataUrl)
                  }

                  console.log(`[v0] PerfilPage - Fetching metadata from:`, metadataUrl)

                  const metadataResponse = await fetch(metadataUrl)
                  console.log(`[v0] PerfilPage - Metadata response status:`, metadataResponse.status)

                  if (metadataResponse.ok) {
                    const contentType = metadataResponse.headers.get("content-type")
                    console.log(`[v0] PerfilPage - Content-Type:`, contentType)

                    if (contentType?.includes("image/")) {
                      console.log(`[v0] PerfilPage - Content-Type indicates image, using URI as image URL`)
                      return {
                        ...moment,
                        imageUrl: metadataUrl,
                        title: moment.title || `NFT #${moment.tokenId}`,
                        description: moment.description || "Digital collectible from Feria Nounish",
                      }
                    }

                    const responseText = await metadataResponse.text()
                    console.log(`[v0] PerfilPage - Response text (first 200 chars):`, responseText.substring(0, 200))

                    const isJPEG =
                      responseText.includes("JFIF") ||
                      responseText.includes("EXIF") ||
                      responseText.startsWith("\xFF\xD8\xFF")
                    const isPNG = responseText.startsWith("\x89PNG")

                    if (isJPEG || isPNG) {
                      console.log(
                        `[v0] PerfilPage - Detected image file (JPEG: ${isJPEG}, PNG: ${isPNG}), using URI as image URL`,
                      )
                      return {
                        ...moment,
                        imageUrl: metadataUrl,
                        title: moment.title || `NFT #${moment.tokenId}`,
                        description: moment.description || "Digital collectible from Feria Nounish",
                      }
                    }

                    try {
                      const metadata = JSON.parse(responseText)
                      console.log(`[v0] PerfilPage - Metadata parsed successfully:`, metadata)

                      // Convert image URL to gateway URL if needed
                      let imageUrl = metadata.image
                      if (imageUrl?.startsWith("ipfs://")) {
                        imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
                      } else if (imageUrl?.startsWith("ar://")) {
                        imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
                      }

                      return {
                        ...moment,
                        imageUrl: imageUrl || "/placeholder.svg",
                        title: metadata.name || `Token #${moment.tokenId}`,
                        description: metadata.description || "",
                      }
                    } catch (parseError) {
                      console.error(`[v0] PerfilPage - JSON parse failed, treating as image:`, parseError)
                      return {
                        ...moment,
                        imageUrl: metadataUrl,
                        title: moment.title || `NFT #${moment.tokenId}`,
                        description: moment.description || "Digital collectible from Feria Nounish",
                      }
                    }
                  }
                }

                // Fallback if metadata fetch fails
                console.log(`[v0] PerfilPage - Using fallback for token ${moment.tokenId}`)
                return {
                  ...moment,
                  imageUrl: convertToGatewayUrl(moment.uri),
                  title: `Token #${moment.tokenId}`,
                  description: "NFT from Feria Nounish",
                  metadataError: "Failed to fetch metadata",
                }
              } catch (error) {
                console.error(`[v0] PerfilPage - Error fetching metadata for token ${moment.tokenId}:`, error)
                return {
                  ...moment,
                  imageUrl: convertToGatewayUrl(moment.uri),
                  title: `Token #${moment.tokenId}`,
                  description: "NFT from Feria Nounish",
                  metadataError: error instanceof Error ? error.message : "Unknown error",
                }
              }
            }),
          )

          console.log("[v0] PerfilPage - Final moments with metadata:", momentsWithMetadata.length)
          setMoments(momentsWithMetadata)
        } else {
          console.log("[v0] PerfilPage - No moments found in timeline")
          setMoments([])
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        console.error("[v0] PerfilPage - Error in fetchData:", errorMsg, error)
        setError(errorMsg)
        setMoments([])
      } finally {
        console.log("[v0] PerfilPage - fetchData completed, setting loading to false")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [address, isConnected])

  const handleAddToGallery = async (moment: MomentWithImage) => {
    alert(`Agregar ${moment.title} a la galería (funcionalidad pendiente)`)
  }

  console.log("[v0] PerfilPage - Render state:", {
    address,
    isConnected,
    isLoading,
    momentsCount: moments.length,
    error,
  })

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-fixed-parallax">
        <Image src="/images/fondo-crear-nuevo.png" alt="Fondo" fill className="object-cover" priority unoptimized />
      </div>

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

                        {moment.metadataError && (
                          <details className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-xs">
                            <summary className="font-semibold text-yellow-800 cursor-pointer">
                              ⚠️ Metadata Error (Click to expand)
                            </summary>
                            <div className="mt-2 space-y-1">
                              <p className="text-yellow-700 font-mono">{moment.metadataError}</p>
                              <p className="text-yellow-600">
                                <span className="font-semibold">Contract:</span> {moment.address}
                              </p>
                              <p className="text-yellow-600">
                                <span className="font-semibold">Token ID:</span> {moment.tokenId}
                              </p>
                              <p className="text-yellow-600">
                                <span className="font-semibold">Chain:</span> Base ({moment.chainId})
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
