"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useAccount } from "wagmi"
import { getName } from "@coinbase/onchainkit/identity"
import { base } from "viem/chains"

interface InprocessMoment {
  id: string
  name: string
  description: string
  image: string
  contractAddress: string
  tokenId: string
  createdAt: string
  creator: string
}

export default function PerfilPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [userName, setUserName] = useState<string>("")
  const [moments, setMoments] = useState<InprocessMoment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async () => {
      console.log("[v0] Perfil - Wallet connected:", isConnected)
      console.log("[v0] Perfil - Wallet address:", address)

      if (!address) {
        console.log("[v0] Perfil - No wallet connected")
        setIsLoading(false)
        return
      }

      console.log("[v0] Perfil - Fetching profile for address:", address)

      try {
        const basename = await getName({ address, chain: base })
        const displayName = basename || `${address.slice(0, 6)}...${address.slice(-4)}`
        setUserName(displayName)
        console.log("[v0] Perfil - Display name:", displayName)

        console.log("[v0] Perfil - Fetching tokens from inprocess.fun API...")

        const apiEndpoints = [
          `https://inprocess.fun/api/timeline?address=${address}`,
          `https://inprocess.fun/api/tokens?owner=${address}`,
          `https://inprocess.fun/api/nfts?wallet=${address}`,
          `https://inprocess.fun/api/user/${address}/tokens`,
        ]

        let fetchedMoments: InprocessMoment[] = []
        let apiSuccess = false

        for (const endpoint of apiEndpoints) {
          try {
            console.log("[v0] Perfil - Trying API endpoint:", endpoint)
            const response = await fetch(endpoint, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            })

            console.log("[v0] Perfil - Response status:", response.status)

            if (response.ok) {
              const data = await response.json()
              console.log("[v0] Perfil - API response data:", JSON.stringify(data).substring(0, 200))

              let momentsArray: any[] = []

              if (Array.isArray(data)) {
                momentsArray = data
              } else if (data.moments && Array.isArray(data.moments)) {
                momentsArray = data.moments
              } else if (data.data && Array.isArray(data.data)) {
                momentsArray = data.data
              } else if (data.tokens && Array.isArray(data.tokens)) {
                momentsArray = data.tokens
              } else if (data.nfts && Array.isArray(data.nfts)) {
                momentsArray = data.nfts
              }

              console.log("[v0] Perfil - Parsed array length:", momentsArray.length)

              if (momentsArray.length > 0) {
                fetchedMoments = momentsArray.map((item: any) => ({
                  id: item.id || item._id || `${item.contractAddress}-${item.tokenId}`,
                  name: item.name || item.title || "Sin título",
                  description: item.description || "",
                  image: item.image || item.imageUrl || item.media || "/placeholder.svg",
                  contractAddress: item.contractAddress || item.contract?.address || "",
                  tokenId: item.tokenId?.toString() || item.token?.id?.toString() || "1",
                  createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
                  creator: item.creator || address,
                }))

                console.log("[v0] Perfil - Successfully parsed tokens:", fetchedMoments.length)
                apiSuccess = true
                break
              }
            }
          } catch (error) {
            console.log("[v0] Perfil - Error with endpoint:", endpoint, error)
            continue
          }
        }

        if (apiSuccess) {
          const sortedMoments = fetchedMoments.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })
          console.log("[v0] Perfil - Setting tokens:", sortedMoments.length)
          setMoments(sortedMoments)
        } else {
          console.log("[v0] Perfil - No tokens found from any API endpoint")
          setMoments([])
        }
      } catch (error) {
        console.error("[v0] Perfil - Error fetching user profile:", error)
        setMoments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [address, isConnected])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src="/images/fondo-crear-nuevo.png" alt="Fondo" fill className="object-cover" priority />
      </div>

      <div className="relative z-10">
        {/* Header with back button */}
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
                  <Link
                    key={moment.id}
                    href={`/galeria/${moment.contractAddress}/${moment.tokenId}`}
                    className="group block"
                  >
                    <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                      <CardContent className="p-0">
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <Image
                            src={moment.image || "/placeholder.svg"}
                            alt={moment.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-6 bg-white">
                          <h3 className="font-extrabold text-xl text-gray-800 mb-2">{moment.name}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{moment.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(moment.createdAt).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
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
