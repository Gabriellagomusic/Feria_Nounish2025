"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import { getName } from "@coinbase/onchainkit/identity"
import { base } from "viem/chains"

interface NFTMetadata {
  name: string
  description: string
  image: string
  contractAddress: string
  tokenId: string
}

export default function PerfilPage() {
  const router = useRouter()
  const { address } = useMiniKit()
  const [userName, setUserName] = useState<string>("")
  const [nfts, setNfts] = useState<NFTMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!address) {
        console.log("[v0] No wallet connected")
        setIsLoading(false)
        return
      }

      console.log("[v0] Wallet connected:", address)

      try {
        const basename = await getName({ address, chain: base })
        const displayName = basename || `${address.slice(0, 6)}...${address.slice(-4)}`
        setUserName(displayName)
        console.log("[v0] User name:", displayName)

        console.log("[v0] Fetching NFTs from inprocess timeline...")

        // Try multiple possible API endpoints
        const possibleEndpoints = [
          `https://inprocess.fun/api/moment/timeline?address=${address}`,
          `https://inprocess.fun/api/user/moments?address=${address}`,
          `https://inprocess.fun/api/timeline/${address}`,
        ]

        let fetchedNFTs: NFTMetadata[] = []
        let apiSuccess = false

        for (const endpoint of possibleEndpoints) {
          try {
            console.log("[v0] Trying endpoint:", endpoint)
            const response = await fetch(endpoint)

            if (response.ok) {
              const data = await response.json()
              console.log("[v0] API response:", data)

              // Parse the response based on the structure
              if (Array.isArray(data)) {
                fetchedNFTs = data.map((item: any) => ({
                  name: item.name || item.token?.name || "Obra de Arte",
                  description: item.description || item.token?.description || "Obra de arte digital única",
                  image: item.image || item.token?.image || "/placeholder.svg",
                  contractAddress: item.contractAddress || item.contract?.address || "",
                  tokenId: item.tokenId?.toString() || item.token?.id?.toString() || "1",
                }))
                apiSuccess = true
                break
              } else if (data.moments || data.tokens) {
                const items = data.moments || data.tokens
                fetchedNFTs = items.map((item: any) => ({
                  name: item.name || item.token?.name || "Obra de Arte",
                  description: item.description || item.token?.description || "Obra de arte digital única",
                  image: item.image || item.token?.image || "/placeholder.svg",
                  contractAddress: item.contractAddress || item.contract?.address || "",
                  tokenId: item.tokenId?.toString() || item.token?.id?.toString() || "1",
                }))
                apiSuccess = true
                break
              }
            }
          } catch (error) {
            console.log("[v0] Endpoint failed:", endpoint, error)
            continue
          }
        }

        if (apiSuccess) {
          console.log("[v0] Successfully fetched NFTs from API:", fetchedNFTs.length)
          setNfts(fetchedNFTs)
        } else {
          console.log("[v0] All API endpoints failed, no NFTs found")
          setNfts([])
        }
      } catch (error) {
        console.error("[v0] Error fetching user data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [address])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image src="/images/fondo-crear-nuevo.png" alt="Fondo" fill className="object-cover" priority />
      </div>

      <div className="relative z-10">
        {/* Header */}
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
                  <h1 className="font-extrabold text-4xl text-white mb-4">MI PERFIL</h1>
                  <p className="text-white text-xl font-semibold">{userName || "Cargando..."}</p>
                </>
              ) : (
                <>
                  <h1 className="font-extrabold text-4xl text-white mb-4">MI PERFIL</h1>
                  <p className="text-white/80 text-lg">Conecta tu wallet para ver tu perfil</p>
                </>
              )}
            </div>
          </div>

          {/* NFTs Section */}
          <div className="max-w-6xl mx-auto">
            <h2 className="font-extrabold text-3xl text-white mb-8 text-center">MIS NFTs</h2>

            {isLoading ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <p className="text-white text-lg">Cargando...</p>
              </div>
            ) : !address ? (
              <div className="text-center py-16">
                <p className="text-white text-lg">Conecta tu wallet para ver tus NFTs</p>
              </div>
            ) : nfts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nfts.map((nft, index) => (
                  <Link
                    key={`${nft.contractAddress}-${nft.tokenId}-${index}`}
                    href={`/galeria/${nft.contractAddress}/${nft.tokenId}`}
                    className="group block"
                  >
                    <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                      <CardContent className="p-0">
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <Image
                            src={nft.image || "/placeholder.svg"}
                            alt={nft.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-6 bg-white">
                          <h3 className="font-extrabold text-xl text-gray-800 mb-2">{nft.name}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{nft.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-white text-lg mb-4">Aún no tienes NFTs de la Feria Nounish</p>
                <Link href="/galeria">
                  <button className="bg-white text-black hover:bg-gray-100 font-semibold px-6 py-3 rounded-full shadow-lg transition-all">
                    EXPLORAR GALERÍA
                  </button>
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
