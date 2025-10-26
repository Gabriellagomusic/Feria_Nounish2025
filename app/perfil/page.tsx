"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Plus } from "lucide-react"
import { useAccount } from "wagmi"
import { getDisplayName, getFarcasterProfilePic } from "@/lib/farcaster"
import { getNounAvatarUrl } from "@/lib/noun-avatar"
import { getTimeline, type Moment } from "@/lib/inprocess"

interface MomentWithMetadata extends Moment {
  metadata?: {
    name: string
    description: string
    image: string
  }
}

export default function PerfilPage() {
  const router = useRouter()
  const { address } = useAccount()
  const [userName, setUserName] = useState<string>("")
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [moments, setMoments] = useState<MomentWithMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log("[v0] Perfil - Mount/Update - address:", address)

    if (!address) {
      console.log("[v0] Perfil - No address available")
      setIsLoading(false)
      return
    }

    console.log("[v0] Perfil - Fetching data for address:", address)

    const fetchUserProfile = async () => {
      setIsLoading(true)

      try {
        // Fetch profile info
        console.log("[v0] Perfil - Fetching profile info...")
        const [picUrl, displayName] = await Promise.all([getFarcasterProfilePic(address), getDisplayName(address)])

        setProfilePicUrl(picUrl)
        setUserName(displayName)
        console.log("[v0] Perfil - Profile loaded:", displayName)

        console.log("[v0] Perfil - Fetching timeline...")
        const timelineData = await getTimeline(1, 100, true, address, 8453, false)

        console.log("[v0] Perfil - Timeline response:", {
          status: timelineData.status,
          momentsCount: timelineData.moments.length,
          totalCount: timelineData.pagination.total_count,
        })

        if (timelineData.moments && timelineData.moments.length > 0) {
          console.log("[v0] Perfil - Processing", timelineData.moments.length, "moments...")

          const momentsWithMetadata = await Promise.all(
            timelineData.moments.map(async (moment, index) => {
              console.log(`[v0] Perfil - Processing moment ${index + 1}:`, moment.id)
              try {
                let metadataUrl = moment.uri

                // Convert ar:// to https://
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

                  return {
                    ...moment,
                    metadata: {
                      name: metadata.name || "Sin título",
                      description: metadata.description || "",
                      image: imageUrl || "/placeholder.svg",
                    },
                  }
                }
              } catch (error) {
                console.error(`[v0] Perfil - Error fetching metadata:`, error)
              }

              return {
                ...moment,
                metadata: {
                  name: "Sin título",
                  description: "",
                  image: "/placeholder.svg",
                },
              }
            }),
          )

          console.log("[v0] Perfil - Successfully loaded", momentsWithMetadata.length, "moments")
          setMoments(momentsWithMetadata)
        } else {
          console.log("[v0] Perfil - No moments found")
          setMoments([])
        }
      } catch (error) {
        console.error("[v0] Perfil - Error fetching profile:", error)
        setMoments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [address])

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
            {isLoading ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <p className="text-white text-lg">Cargando...</p>
              </div>
            ) : !address ? (
              <div className="text-center py-16">
                <p className="text-white text-lg mb-4">Conecta tu wallet para ver tus NFTs</p>
              </div>
            ) : moments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {moments.map((moment) => (
                  <Card
                    key={moment.id}
                    className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                  >
                    <CardContent className="p-0">
                      <Link href={`/galeria/${moment.address}/${moment.tokenId}`} className="block">
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <Image
                            src={moment.metadata?.image || "/placeholder.svg"}
                            alt={moment.metadata?.name || "NFT"}
                            fill
                            className="object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      </Link>
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
                <p className="text-white text-lg">No tienes NFTs todavía</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
