"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { ArrowLeft, Plus } from "lucide-react"
import { useAccount, useConnect } from "wagmi"
import { getDisplayName, getFarcasterProfilePic } from "@/lib/farcaster"
import { getNounAvatarUrl } from "@/lib/noun-avatar"

interface InprocessMoment {
  address: string
  tokenId: string
  chainId: number
  id: string
  uri: string
  admin: string
  createdAt: string
  username: string
  hidden: boolean
  metadata?: {
    name: string
    description: string
    image: string
  }
}

export default function PerfilPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const [userName, setUserName] = useState<string>("")
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [moments, setMoments] = useState<InprocessMoment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const hasAttemptedConnect = useRef(false)
  const hasFetchedData = useRef(false)

  useEffect(() => {
    if (!hasAttemptedConnect.current && !isConnected) {
      console.log("[v0] Perfil - Wallet not connected, attempting auto-connect...")
      const farcasterConnector = connectors.find((c) => c.id === "farcaster")

      if (farcasterConnector) {
        console.log("[v0] Perfil - Found Farcaster connector, connecting...")
        connect({ connector: farcasterConnector })
        hasAttemptedConnect.current = true
      } else {
        console.log("[v0] Perfil - No Farcaster connector found")
      }
    } else if (isConnected) {
      console.log("[v0] Perfil - Wallet already connected:", address)
    }
  }, [isConnected, connect, connectors, address])

  useEffect(() => {
    if (!isConnected || !address || hasFetchedData.current) {
      if (!isConnected) {
        console.log("[v0] Perfil - Waiting for wallet connection...")
        setIsLoading(true)
      }
      return
    }

    const fetchUserProfile = async () => {
      console.log("[v0] Perfil - Starting fetchUserProfile")
      console.log("[v0] Perfil - Wallet connected:", isConnected)
      console.log("[v0] Perfil - Wallet address:", address)

      hasFetchedData.current = true

      try {
        console.log("[v0] Perfil - Fetching Farcaster profile pic...")
        const picUrl = await getFarcasterProfilePic(address)
        setProfilePicUrl(picUrl)
        console.log("[v0] Perfil - Profile pic URL:", picUrl)

        console.log("[v0] Perfil - Fetching display name...")
        const displayName = await getDisplayName(address)
        setUserName(displayName)
        console.log("[v0] Perfil - Display name:", displayName)

        console.log("[v0] Perfil - Fetching tokens from Inprocess Timeline API...")
        const timelineUrl = `https://inprocess.fun/api/timeline?artist=${address}&chainId=8453&limit=100&latest=true`
        console.log("[v0] Perfil - API URL:", timelineUrl)

        const response = await fetch(timelineUrl)
        console.log("[v0] Perfil - Response status:", response.status)
        console.log("[v0] Perfil - Response ok:", response.ok)

        if (!response.ok) {
          console.error("[v0] Perfil - API error:", response.status, response.statusText)
          const errorText = await response.text()
          console.error("[v0] Perfil - Error response body:", errorText)
          setMoments([])
          setIsLoading(false)
          return
        }

        const responseText = await response.text()
        console.log("[v0] Perfil - Raw response (first 500 chars):", responseText.substring(0, 500))

        let data
        try {
          data = JSON.parse(responseText)
          console.log("[v0] Perfil - Parsed data status:", data.status)
          console.log("[v0] Perfil - Moments array length:", data.moments?.length || 0)

          if (data.moments && data.moments.length > 0) {
            console.log("[v0] Perfil - First moment sample:", JSON.stringify(data.moments[0]))
          }
        } catch (parseError) {
          console.error("[v0] Perfil - JSON parse error:", parseError)
          setMoments([])
          setIsLoading(false)
          return
        }

        if (data && data.moments && Array.isArray(data.moments) && data.moments.length > 0) {
          console.log("[v0] Perfil - Processing", data.moments.length, "moments...")

          const momentsWithMetadata = await Promise.all(
            data.moments.map(async (moment: InprocessMoment, index: number) => {
              console.log(`[v0] Perfil - Processing moment ${index + 1}:`, moment.id)
              try {
                let metadataUrl = moment.uri

                if (metadataUrl.startsWith("ar://")) {
                  metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
                }

                console.log(`[v0] Perfil - Fetching metadata from:`, metadataUrl)
                const metadataResponse = await fetch(metadataUrl)

                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json()
                  console.log(`[v0] Perfil - Got metadata for:`, metadata.name)

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
                console.error(`[v0] Perfil - Error fetching metadata for moment ${moment.id}:`, error)
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

          console.log("[v0] Perfil - Setting moments state with", momentsWithMetadata.length, "items")
          setMoments(momentsWithMetadata)
          console.log("[v0] Perfil - Successfully loaded moments")
        } else {
          console.log("[v0] Perfil - No moments found in response")
          setMoments([])
        }
      } catch (error) {
        console.error("[v0] Perfil - Error in fetchUserProfile:", error)
        if (error instanceof Error) {
          console.error("[v0] Perfil - Error details:", error.message)
        }
        setMoments([])
      } finally {
        console.log("[v0] Perfil - Fetch complete, setting isLoading to false")
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [address, isConnected])

  const handleAddToGallery = async (moment: InprocessMoment) => {
    console.log("[v0] Perfil - Adding to gallery:", moment.address, moment.tokenId)
    // TODO: Implement add to gallery functionality
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
                <p className="text-white text-lg">Conecta tu wallet para ver tus NFTs</p>
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
