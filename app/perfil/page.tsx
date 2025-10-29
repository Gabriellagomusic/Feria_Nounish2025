"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
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
  inGallery?: boolean
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
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null)

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

        const picUrl = await getFarcasterProfilePic(address)
        setProfilePicUrl(picUrl)

        const displayName = await getDisplayName(address)
        setUserName(displayName)

        const timelineData = await getTimeline(1, 100, true, address, 8453, false)

        if (timelineData.moments && timelineData.moments.length > 0) {
          const filteredMoments = timelineData.moments.filter(
            (moment) => moment.admin.toLowerCase() === address.toLowerCase(),
          )

          const publicClient = createPublicClient({
            chain: base,
            transport: http(),
          })

          const momentsWithMetadata = await Promise.all(
            filteredMoments.map(async (moment) => {
              try {
                const tokenURI = await publicClient.readContract({
                  address: moment.address as `0x${string}`,
                  abi: ERC1155_ABI,
                  functionName: "uri",
                  args: [BigInt(1)],
                })

                if (tokenURI) {
                  let metadataUrl = tokenURI.replace("{id}", "1")

                  if (metadataUrl.startsWith("ar://")) {
                    metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
                  }

                  const metadataResponse = await fetch(metadataUrl)

                  if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json()

                    let imageUrl = metadata.image
                    if (imageUrl?.startsWith("ipfs://")) {
                      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
                    } else if (imageUrl?.startsWith("ar://")) {
                      imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
                    }

                    const galleryCheck = await fetch(`/api/gallery/check?contractAddress=${moment.address}&tokenId=1`)
                    const galleryData = await galleryCheck.json()

                    return {
                      ...moment,
                      imageUrl: imageUrl || "/placeholder.svg",
                      title: metadata.name || `Obra de Arte #1`,
                      description: metadata.description || "Obra de arte digital única",
                      inGallery: galleryData.inGallery || false,
                    }
                  }
                }

                const galleryCheck = await fetch(`/api/gallery/check?contractAddress=${moment.address}&tokenId=1`)
                const galleryData = await galleryCheck.json()

                return {
                  ...moment,
                  imageUrl: "/placeholder.svg",
                  title: `Obra de Arte #1`,
                  description: "Obra de arte digital única de la colección oficial",
                  inGallery: galleryData.inGallery || false,
                }
              } catch (error) {
                console.error(`Error processing token at ${moment.address}:`, error)

                return {
                  ...moment,
                  imageUrl: "/placeholder.svg",
                  title: `Obra de Arte #1`,
                  description: "Obra de arte digital única de la colección oficial",
                  inGallery: false,
                }
              }
            }),
          )

          setMoments(momentsWithMetadata)
        } else {
          setMoments([])
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        console.error("Error in fetchData:", errorMsg, error)
        setError(errorMsg)
        setMoments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [address, isConnected, isWhitelisted])

  const handleGalleryToggle = async (moment: MomentWithImage) => {
    try {
      const endpoint = moment.inGallery ? "/api/gallery/remove" : "/api/gallery/add"
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress: moment.address,
          tokenId: "1",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update gallery")
      }

      setMoments((prev) => prev.map((m) => (m.id === moment.id ? { ...m, inGallery: !m.inGallery } : m)))

      alert(`${moment.title} ${moment.inGallery ? "removido de" : "agregado a"} la galería exitosamente`)
    } catch (error) {
      console.error("Error updating gallery:", error)
      alert("Error al actualizar la galería. Por favor intenta de nuevo.")
    }
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

                        <Button
                          onClick={() => handleGalleryToggle(moment)}
                          className={`w-full font-semibold ${
                            moment.inGallery ? "bg-gray-700 hover:bg-gray-800" : "bg-[#FF0B00] hover:bg-[#CC0900]"
                          } text-white`}
                          size="sm"
                        >
                          {moment.inGallery ? (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover de Galería
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Agregar a Galería
                            </>
                          )}
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
