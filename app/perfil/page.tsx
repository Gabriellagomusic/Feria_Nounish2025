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

console.log("[v0] ===== PERFIL PAGE MODULE LOADED =====")

interface MomentWithMetadata extends Moment {
  metadata?: {
    name: string
    description: string
    image: string
  }
}

export default function PerfilPage() {
  console.log("[v0] ===== PERFIL COMPONENT RENDERING =====")

  const router = useRouter()
  const { address, isConnected } = useAccount()

  console.log("[v0] Perfil - Component render - address:", address, "isConnected:", isConnected)

  const [userName, setUserName] = useState<string>("")
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [moments, setMoments] = useState<MomentWithMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("[v0] ===== PERFIL USEEFFECT TRIGGERED =====")
    console.log("[v0] Perfil - useEffect - address:", address)
    console.log("[v0] Perfil - useEffect - isConnected:", isConnected)

    if (!address) {
      console.log("[v0] Perfil - No address available, skipping fetch")
      setIsLoading(false)
      return
    }

    console.log("[v0] Perfil - Using address:", address)

    const fetchData = async () => {
      try {
        console.log("[v0] Perfil - Starting fetchData...")
        setIsLoading(true)
        setError(null)

        // Fetch profile info
        console.log("[v0] Perfil - Step 1: Fetching profile info...")
        const picUrl = await getFarcasterProfilePic(address)
        console.log("[v0] Perfil - Profile pic URL:", picUrl)
        setProfilePicUrl(picUrl)

        const displayName = await getDisplayName(address)
        console.log("[v0] Perfil - Display name:", displayName)
        setUserName(displayName)

        // Fetch timeline - ONLY moments created by this artist
        console.log("[v0] Perfil - Step 2: Calling getTimeline with artist filter...")
        console.log("[v0] Perfil - Artist address:", address)

        const timelineData = await getTimeline(1, 100, true, address, 8453, false)

        console.log("[v0] Perfil - Step 3: Timeline data received!")
        console.log("[v0] Perfil - Timeline status:", timelineData.status)
        console.log("[v0] Perfil - Moments count (before filtering):", timelineData.moments?.length || 0)

        if (timelineData.moments && timelineData.moments.length > 0) {
          console.log("[v0] Perfil - Filtering moments by artist address...")

          const filteredMoments = timelineData.moments.filter((moment) => {
            const matches = moment.admin.toLowerCase() === address.toLowerCase()
            console.log(`[v0] Perfil - Moment ${moment.id} admin: ${moment.admin} - matches: ${matches}`)
            return matches
          })

          console.log("[v0] Perfil - Moments count (after filtering):", filteredMoments.length)
          console.log("[v0] Perfil - Filtered out:", timelineData.moments.length - filteredMoments.length, "moments")

          if (filteredMoments.length > 0) {
            console.log("[v0] Perfil - Step 4: Processing filtered moments...")

            const momentsWithMetadata = await Promise.all(
              filteredMoments.map(async (moment, index) => {
                console.log(`[v0] Perfil - Processing moment ${index + 1}/${filteredMoments.length}`)
                console.log(`[v0] Perfil - Moment URI:`, moment.uri)

                try {
                  let metadataUrl = moment.uri

                  // Convert ar:// to https://
                  if (metadataUrl.startsWith("ar://")) {
                    metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
                    console.log(`[v0] Perfil - Converted Arweave URL:`, metadataUrl)
                  } else if (metadataUrl.startsWith("ipfs://")) {
                    metadataUrl = metadataUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
                    console.log(`[v0] Perfil - Converted IPFS URL:`, metadataUrl)
                  }

                  console.log(`[v0] Perfil - Fetching metadata from:`, metadataUrl)

                  // Add timeout to metadata fetch
                  const controller = new AbortController()
                  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

                  const metadataResponse = await fetch(metadataUrl, {
                    signal: controller.signal,
                  })
                  clearTimeout(timeoutId)

                  console.log(`[v0] Perfil - Metadata response status:`, metadataResponse.status)

                  if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json()
                    console.log(`[v0] Perfil - Metadata received:`, {
                      name: metadata.name,
                      hasImage: !!metadata.image,
                      imagePrefix: metadata.image?.substring(0, 20),
                    })

                    let imageUrl = metadata.image
                    if (imageUrl?.startsWith("ipfs://")) {
                      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
                      console.log(`[v0] Perfil - Converted image IPFS URL:`, imageUrl)
                    } else if (imageUrl?.startsWith("ar://")) {
                      imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
                      console.log(`[v0] Perfil - Converted image Arweave URL:`, imageUrl)
                    }

                    return {
                      ...moment,
                      metadata: {
                        name: metadata.name || "Sin título",
                        description: metadata.description || "",
                        image: imageUrl || "/placeholder.svg?height=400&width=400",
                      },
                    }
                  } else {
                    console.error(`[v0] Perfil - Metadata fetch failed with status:`, metadataResponse.status)
                  }
                } catch (error) {
                  if (error instanceof Error && error.name === "AbortError") {
                    console.error(`[v0] Perfil - Metadata fetch timeout for moment ${index + 1}`)
                  } else {
                    console.error(`[v0] Perfil - Error processing moment ${index + 1}:`, error)
                  }
                }

                console.log(`[v0] Perfil - Using fallback metadata for moment ${index + 1}`)
                return {
                  ...moment,
                  metadata: {
                    name: "Sin título",
                    description: "",
                    image: "/placeholder.svg?height=400&width=400",
                  },
                }
              }),
            )

            console.log("[v0] Perfil - Step 5: Setting moments state with", momentsWithMetadata.length, "items")
            setMoments(momentsWithMetadata)
          } else {
            console.log("[v0] Perfil - No moments found for this artist after filtering")
            setMoments([])
          }
        } else {
          console.log("[v0] Perfil - No moments returned from API")
          setMoments([])
        }

        console.log("[v0] Perfil - fetchData completed successfully!")
      } catch (error) {
        console.error("[v0] Perfil - ERROR in fetchData:", error)
        console.error("[v0] Perfil - Error stack:", error instanceof Error ? error.stack : "No stack")
        setError(error instanceof Error ? error.message : "Unknown error")
        setMoments([])
      } finally {
        console.log("[v0] Perfil - Setting isLoading to false")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [address, isConnected])

  console.log("[v0] Perfil - Render state:", {
    isLoading,
    momentsCount: moments.length,
    hasAddress: !!address,
    error,
  })

  const handleAddToGallery = async (moment: MomentWithMetadata) => {
    console.log("[v0] Perfil - Adding to gallery:", moment.address, moment.tokenId)
    alert(`Agregar ${moment.metadata?.name || "token"} a la galería (funcionalidad pendiente)`)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0">
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
                          src={moment.metadata?.image || "/placeholder.svg"}
                          alt={moment.metadata?.name || "NFT"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-6 bg-white">
                        <h3 className="font-extrabold text-xl text-gray-800 mb-2">
                          {moment.metadata?.name || "Sin título"}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{moment.metadata?.description || ""}</p>
                        <p className="text-xs text-gray-500 mb-4">Por: {moment.username || userName}</p>

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
