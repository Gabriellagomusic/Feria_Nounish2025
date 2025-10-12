"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

interface TokenMetadata {
  name: string
  description: string
  image: string
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

export default function GaleriaPage() {
  const [tokenData, setTokenData] = useState<TokenMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const tokenURI = await publicClient.readContract({
          address: "0x990b7de26fbf87624a0a8ee83b03759bd191de64",
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

            setTokenData({
              name: metadata.name || "Obra de Arte #1",
              description: metadata.description || "Obra de arte digital única",
              image: imageUrl || "/placeholder.svg",
            })
            setIsLoading(false)
            return
          }
        }

        // Fallback to placeholder data
        setTokenData({
          name: "Obra de Arte #1",
          description: "Obra de arte digital única de la colección oficial",
          image: "/abstract-digital-composition.png",
        })
      } catch (error) {
        console.error("[v0] Error fetching token metadata:", error)
        // Fallback to placeholder data
        setTokenData({
          name: "Obra de Arte #1",
          description: "Obra de arte digital única de la colección oficial",
          image: "/abstract-digital-composition.png",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokenMetadata()
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src="/images/fondos2.png" alt="Fondo colorido abstracto" fill className="object-cover" priority />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/">
              <Image
                src="/images/feria-logo.png"
                alt="Feria Nounish Logo"
                width={150}
                height={75}
                className="h-12 w-auto"
              />
            </Link>
            <h1 className="font-bold text-2xl text-gray-800">Colección Oficial</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <p className="text-white text-lg">Cargando...</p>
            </div>
          ) : tokenData ? (
            <div className="max-w-md mx-auto">
              <Link href="/galeria/0x990b7de26fbf87624a0a8ee83b03759bd191de64/1" className="group block">
                <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                  <CardContent className="p-0">
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <Image
                        src={tokenData.image || "/placeholder.svg"}
                        alt={tokenData.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-6 bg-white">
                      <h3 className="font-bold text-xl text-gray-800 mb-2">{tokenData.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{tokenData.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-white text-lg">No hay obras disponibles en este momento.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
