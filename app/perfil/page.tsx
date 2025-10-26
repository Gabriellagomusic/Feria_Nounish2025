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

interface MomentWithImage extends Moment {
  imageUrl: string
  title: string
}

export default function PerfilPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()

  const [userName, setUserName] = useState<string>("")
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [moments, setMoments] = useState<MomentWithImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebug = (message: string) => {
    console.log(`[v0] ${message}`)
    setDebugInfo((prev) => [...prev, message])
  }

  const convertToGatewayUrl = (uri: string): string => {
    if (uri.startsWith("ar://")) {
      return uri.replace("ar://", "https://arweave.net/")
    } else if (uri.startsWith("ipfs://")) {
      return uri.replace("ipfs://", "https://ipfs.io/ipfs/")
    }
    return uri
  }

  useEffect(() => {
    addDebug(`=== PERFIL USEEFFECT START ===`)
    addDebug(`Address: ${address || "undefined"}`)
    addDebug(`IsConnected: ${isConnected}`)

    if (!address) {
      addDebug("No address, skipping fetch")
      setIsLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setDebugInfo([]) // Clear previous debug info

        addDebug("Fetching profile info...")
        const picUrl = await getFarcasterProfilePic(address)
        setProfilePicUrl(picUrl)

        const displayName = await getDisplayName(address)
        setUserName(displayName)
        addDebug(`Display name: ${displayName}`)

        addDebug(`Calling getTimeline with artist: ${address}`)
        const timelineData = await getTimeline(1, 100, true, address, 8453, false)

        addDebug(`Timeline received: ${timelineData.moments?.length || 0} moments`)

        if (timelineData.moments && timelineData.moments.length > 0) {
          const filteredMoments = timelineData.moments
            .filter((moment) => moment.admin.toLowerCase() === address.toLowerCase())
            .map((moment) => ({
              ...moment,
              imageUrl: convertToGatewayUrl(moment.uri),
              title: `Moment #${moment.tokenId}`,
            }))

          addDebug(`After filtering: ${filteredMoments.length} moments match artist`)
          setMoments(filteredMoments)
        } else {
          addDebug("No moments returned from API")
          setMoments([])
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        addDebug(`ERROR: ${errorMsg}`)
        setError(errorMsg)
        setMoments([])
      } finally {
        setIsLoading(false)
        addDebug("=== FETCH COMPLETE ===")
      }
    }

    fetchData()
  }, [address, isConnected])

  const handleAddToGallery = async (moment: MomentWithImage) => {
    alert(`Agregar ${moment.title} a la galería (funcionalidad pendiente)`)
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

        {debugInfo.length > 0 && (
          <div className="container mx-auto px-4 mb-4">
            <details className="bg-black/80 text-white p-4 rounded-lg text-xs max-w-4xl mx-auto">
              <summary className="cursor-pointer font-bold mb-2">Debug Info (Click to expand)</summary>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {debugInfo.map((info, i) => (
                  <div key={i} className="font-mono">
                    {info}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

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
