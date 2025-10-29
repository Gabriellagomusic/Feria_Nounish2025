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

interface MomentWithImage extends Moment {
  imageUrl: string
  title: string
  description?: string
}

interface DebugInfo {
  rawApiResponse?: any
  filteredMoments?: any[]
  processedMoments?: any[]
  errors?: string[]
  gatewayInfo?: { uri: string; source?: string }[]
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
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    console.log("[v0] PerfilPage - Component mounted")
  }, [])

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
        const debug: DebugInfo = { errors: [], gatewayInfo: [] }

        console.log("[v0] ===== STARTING PROFILE DATA FETCH =====")
        console.log("[v0] Connected address:", address)

        const picUrl = await getFarcasterProfilePic(address)
        setProfilePicUrl(picUrl)

        const displayName = await getDisplayName(address)
        setUserName(displayName)

        console.log("[v0] Fetching timeline for address:", address)
        const timelineData = await getTimeline(1, 100, true, address, 8453, false)

        debug.rawApiResponse = timelineData
        console.log("[v0] Raw API Response:", JSON.stringify(timelineData, null, 2))
        console.log("[v0] Total moments from API:", timelineData.moments?.length || 0)

        if (timelineData.moments && timelineData.moments.length > 0) {
          const filteredMoments = timelineData.moments.filter(
            (moment) => moment.admin.toLowerCase() === address.toLowerCase(),
          )

          debug.filteredMoments = filteredMoments.map((m) => ({
            id: m.id,
            tokenId: m.tokenId,
            address: m.address,
            admin: m.admin,
            username: m.username,
            uri: m.uri,
          }))

          console.log("[v0] Filtered moments count:", filteredMoments.length)
          console.log("[v0] Filtered moments:", JSON.stringify(debug.filteredMoments, null, 2))

          const momentsWithMetadata: MomentWithImage[] = []

          for (let index = 0; index < filteredMoments.length; index++) {
            const moment = filteredMoments[index]
            console.log(`[v0] ===== Processing moment ${index + 1}/${filteredMoments.length} =====`)
            console.log(`[v0] Moment ID: ${moment.id}`)
            console.log(`[v0] Token ID: ${moment.tokenId}`)
            console.log(`[v0] Contract Address: ${moment.address}`)
            console.log(`[v0] URI from API: ${moment.uri}`)

            try {
              let metadataUrl = moment.uri
              if (metadataUrl.startsWith("ar://")) {
                metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
              } else if (metadataUrl.startsWith("ipfs://")) {
                metadataUrl = metadataUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
              }

              console.log(`[v0] Fetching metadata from: ${metadataUrl}`)

              const metadataResponse = await fetch(metadataUrl)
              console.log(`[v0] Response status: ${metadataResponse.status}`)
              console.log(`[v0] Response headers:`, Object.fromEntries(metadataResponse.headers.entries()))

              if (metadataResponse.ok) {
                const responseText = await metadataResponse.text()
                console.log(`[v0] Response text (first 500 chars):`, responseText.substring(0, 500))

                try {
                  const metadata = JSON.parse(responseText)
                  console.log(`[v0] Successfully parsed metadata:`, metadata)

                  let imageUrl = metadata.image
                  if (imageUrl?.startsWith("ipfs://")) {
                    imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
                  } else if (imageUrl?.startsWith("ar://")) {
                    imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
                  }

                  debug.gatewayInfo?.push({
                    uri: moment.uri,
                    source: metadataUrl,
                  })

                  const processedMoment: MomentWithImage = {
                    ...moment,
                    imageUrl: imageUrl || "/placeholder.svg",
                    title: metadata.name || `Obra de Arte #${moment.tokenId}`,
                    description: metadata.description || "Obra de arte digital única",
                  }

                  console.log(`[v0] Successfully processed moment:`, {
                    tokenId: processedMoment.tokenId,
                    title: processedMoment.title,
                  })

                  momentsWithMetadata.push(processedMoment)
                } catch (parseError) {
                  console.error(`[v0] JSON parse error:`, parseError)
                  console.error(`[v0] Full response text:`, responseText)
                  debug.errors?.push(`Token ${moment.tokenId}: JSON parse failed - ${parseError}`)

                  momentsWithMetadata.push({
                    ...moment,
                    imageUrl: "/placeholder.svg",
                    title: `Obra de Arte #${moment.tokenId}`,
                    description: "Obra de arte digital única de la colección oficial",
                  })
                }
              } else {
                console.error(`[v0] Metadata fetch failed with status: ${metadataResponse.status}`)
                const errorText = await metadataResponse.text()
                console.error(`[v0] Error response:`, errorText.substring(0, 500))
                debug.errors?.push(`Token ${moment.tokenId}: HTTP ${metadataResponse.status}`)

                momentsWithMetadata.push({
                  ...moment,
                  imageUrl: "/placeholder.svg",
                  title: `Obra de Arte #${moment.tokenId}`,
                  description: "Obra de arte digital única de la colección oficial",
                })
              }
            } catch (error) {
              const errorMsg = `Error fetching metadata for token ${moment.tokenId}: ${error}`
              console.error(`[v0] ${errorMsg}`, error)
              debug.errors?.push(errorMsg)

              momentsWithMetadata.push({
                ...moment,
                imageUrl: "/placeholder.svg",
                title: `Obra de Arte #${moment.tokenId}`,
                description: "Obra de arte digital única de la colección oficial",
              })
            }
          }

          debug.processedMoments = momentsWithMetadata.map((m) => ({
            id: m.id,
            tokenId: m.tokenId,
            title: m.title,
            description: m.description,
            address: m.address,
          }))

          console.log("[v0] Final processed moments:", JSON.stringify(debug.processedMoments, null, 2))
          console.log("[v0] ===== PROFILE DATA FETCH COMPLETE =====")

          setDebugInfo(debug)
          setMoments(momentsWithMetadata)
        } else {
          console.log("[v0] No moments found in timeline")
          setDebugInfo(debug)
          setMoments([])
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

          <div className="max-w-6xl mx-auto mb-6">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500 rounded-lg p-4 flex items-center justify-between transition-all"
            >
              <span className="text-white font-semibold">🐛 Debug Information</span>
              {showDebug ? <ChevronUp className="text-white" /> : <ChevronDown className="text-white" />}
            </button>

            {showDebug && (
              <div className="mt-2 bg-black/80 border border-yellow-500 rounded-lg p-4 max-h-96 overflow-auto">
                <div className="text-white font-mono text-xs space-y-4">
                  <div>
                    <h3 className="text-yellow-400 font-bold mb-2">Gateway Information:</h3>
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(debugInfo.gatewayInfo, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-yellow-400 font-bold mb-2">Raw API Response:</h3>
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(debugInfo.rawApiResponse, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-yellow-400 font-bold mb-2">Filtered Moments:</h3>
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(debugInfo.filteredMoments, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-yellow-400 font-bold mb-2">Processed Moments:</h3>
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(debugInfo.processedMoments, null, 2)}
                    </pre>
                  </div>

                  {debugInfo.errors && debugInfo.errors.length > 0 && (
                    <div>
                      <h3 className="text-red-400 font-bold mb-2">Errors:</h3>
                      <ul className="list-disc list-inside">
                        {debugInfo.errors.map((err, i) => (
                          <li key={i} className="text-red-300">
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
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
                          <p className="text-xs text-gray-700 font-mono">Token ID: {moment.tokenId}</p>
                        </div>

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
