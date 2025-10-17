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
import { isWhitelisted } from "@/lib/whitelist"

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

  const isUserWhitelisted = isWhitelisted(address)

  useEffect(() => {
    console.log("[v0] Perfil - Wallet connected:", isConnected)
    console.log("[v0] Perfil - Wallet address:", address)
    console.log("[v0] Perfil - Is whitelisted:", isUserWhitelisted)
  }, [address, isConnected, isUserWhitelisted])

  useEffect(() => {
    if (address && !isUserWhitelisted) {
      console.log("[v0] User not whitelisted, redirecting to home")
      router.push("/")
      return
    }

    const fetchUserProfile = async () => {
      if (!address) {
        console.log("[v0] No wallet connected")
        setIsLoading(false)
        return
      }

      console.log("[v0] Fetching profile for address:", address)

      try {
        const basename = await getName({ address, chain: base })
        const displayName = basename || `${address.slice(0, 6)}...${address.slice(-4)}`
        setUserName(displayName)
        console.log("[v0] Display name:", displayName)

        console.log("[v0] Fetching moments from inprocess.fun API...")

        const apiEndpoints = [
          `https://inprocess.fun/api/user/${address}/moments`,
          `https://inprocess.fun/api/moment/user/${address}`,
          `https://inprocess.fun/api/moments?creator=${address}`,
          `https://inprocess.fun/api/timeline?address=${address}`,
        ]

        let fetchedMoments: InprocessMoment[] = []
        let apiSuccess = false

        for (const endpoint of apiEndpoints) {
          try {
            console.log("[v0] Trying API endpoint:", endpoint)
            const response = await fetch(endpoint, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            })

            if (response.ok) {
              const data = await response.json()
              console.log("[v0] API response received:", data)

              let momentsArray: any[] = []

              if (Array.isArray(data)) {
                momentsArray = data
              } else if (data.moments && Array.isArray(data.moments)) {
                momentsArray = data.moments
              } else if (data.data && Array.isArray(data.data)) {
                momentsArray = data.data
              } else if (data.tokens && Array.isArray(data.tokens)) {
                momentsArray = data.tokens
              }

              if (momentsArray.length > 0) {
                fetchedMoments = momentsArray.map((item: any) => ({
                  id: item.id || item._id || `${item.contractAddress}-${item.tokenId}`,
                  name: item.name || item.title || "Momento sin título",
                  description: item.description || "Momento creado en inprocess.fun",
                  image: item.image || item.imageUrl || item.media || "/placeholder.svg",
                  contractAddress: item.contractAddress || item.contract?.address || "",
                  tokenId: item.tokenId?.toString() || item.token?.id?.toString() || "1",
                  createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
                  creator: item.creator || address,
                }))

                console.log("[v0] Successfully parsed moments:", fetchedMoments.length)
                apiSuccess = true
                break
              }
            } else {
              console.log("[v0] API endpoint returned status:", response.status)
            }
          } catch (error) {
            console.log("[v0] Error with endpoint:", endpoint, error)
            continue
          }
        }

        if (apiSuccess) {
          console.log("[v0] Setting moments:", fetchedMoments.length)
          setMoments(fetchedMoments)
        } else {
          console.log("[v0] No moments found from any API endpoint")
          setMoments([])
        }
      } catch (error) {
        console.error("[v0] Error fetching user profile:", error)
        setMoments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [address, isUserWhitelisted, router])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src="/images/fondo-crear-nuevo.png" alt="Fondo" fill className="object-cover" priority />
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
          <div className="max-w-2xl mx-auto mb-12 text-center">
            <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 border-2 border-white/30">
              {address ? (
                <>
                  <h1 className="font-extrabold text-4xl text-white mb-4">{userName || "Cargando..."}</h1>
                  <p className="text-white/80 text-lg">Mi perfil de Feria Nounish</p>
                </>
              ) : (
                <>
                  <h1 className="font-extrabold text-4xl text-white mb-4">MI PERFIL</h1>
                  <p className="text-white/80 text-lg">Conecta tu wallet para ver tu perfil</p>
                </>
              )}
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            <h2 className="font-extrabold text-3xl text-white mb-8 text-center">MIS MOMENTOS</h2>

            {isLoading ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-center">
                  <p className="text-white text-lg mb-2">Cargando momentos...</p>
                  <p className="text-white/60 text-sm">Conectando con inprocess.fun</p>
                </div>
              </div>
            ) : !address ? (
              <div className="text-center py-16">
                <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 border-2 border-white/30 max-w-md mx-auto">
                  <p className="text-white text-lg mb-4">Conecta tu wallet para ver tus momentos</p>
                  <p className="text-white/60 text-sm">Tus NFTs y creaciones de inprocess.fun aparecerán aquí</p>
                </div>
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
                <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 border-2 border-white/30 max-w-md mx-auto">
                  <p className="text-white text-lg mb-4">Aún no tienes momentos en inprocess.fun</p>
                  <p className="text-white/60 text-sm mb-6">Crea tu primer momento para verlo aparecer aquí</p>
                  <Link href="/crear">
                    <button className="bg-white text-black hover:bg-gray-100 font-extrabold px-8 py-3 rounded-full shadow-lg transition-all">
                      CREAR MOMENTO
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
