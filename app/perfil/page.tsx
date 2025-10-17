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

interface NFT {
  id: string
  name: string
  description: string
  image: string
  contractAddress: string
  tokenId: string
  createdAt: string
}

export default function PerfilPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [userName, setUserName] = useState<string>("")
  const [nfts, setNfts] = useState<NFT[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserNFTs = async () => {
      console.log("[v0] Wallet connected:", isConnected)
      console.log("[v0] Wallet address:", address)

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

        console.log("[v0] Fetching NFTs from Reservoir API...")
        const reservoirResponse = await fetch(
          `https://api-base.reservoir.tools/users/${address}/tokens/v10?limit=50&sortBy=acquiredAt&sortDirection=desc`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        )

        if (reservoirResponse.ok) {
          const data = await reservoirResponse.json()
          console.log("[v0] Reservoir API response:", data)

          if (data.tokens && Array.isArray(data.tokens)) {
            const fetchedNFTs: NFT[] = data.tokens.map((item: any) => ({
              id: `${item.token?.contract}-${item.token?.tokenId}`,
              name: item.token?.name || "Sin título",
              description: item.token?.description || "",
              image: item.token?.image || item.token?.imageSmall || "/placeholder.svg",
              contractAddress: item.token?.contract || "",
              tokenId: item.token?.tokenId || "1",
              createdAt: item.ownership?.acquiredAt || new Date().toISOString(),
            }))

            console.log("[v0] Successfully fetched NFTs:", fetchedNFTs.length)
            setNfts(fetchedNFTs)
          } else {
            console.log("[v0] No NFTs found in response")
            setNfts([])
          }
        } else {
          console.log("[v0] Reservoir API returned status:", reservoirResponse.status)
          setNfts([])
        }
      } catch (error) {
        console.error("[v0] Error fetching NFTs:", error)
        setNfts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserNFTs()
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
            ) : nfts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nfts.map((nft) => (
                  <Link key={nft.id} href={`/galeria/${nft.contractAddress}/${nft.tokenId}`} className="group block">
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
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{nft.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(nft.createdAt).toLocaleDateString("es-ES", {
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
