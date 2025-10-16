"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"
import { ArrowLeft } from "lucide-react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import { getName } from "@coinbase/onchainkit/identity"

interface NFTMetadata {
  name: string
  description: string
  image: string
  contractAddress: string
  tokenId: string
  balance: string
}

const ERC1155_ABI = [
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "uri",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const

export default function PerfilPage() {
  const router = useRouter()
  const { address } = useMiniKit()
  const [userName, setUserName] = useState<string>("")
  const [nfts, setNfts] = useState<NFTMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!address) {
        setIsLoading(false)
        return
      }

      try {
        // Get basename or use wallet address
        const basename = await getName({ address, chain: base })
        setUserName(basename || `${address.slice(0, 6)}...${address.slice(-4)}`)

        // Fetch user's NFTs
        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        // Check balance for known contract
        const contractAddress = "0x990b7de26fbf87624a0a8ee83b03759bd191de64"
        const tokenId = BigInt(1)

        const balance = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ERC1155_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`, tokenId],
        })

        if (balance > 0n) {
          // Fetch metadata
          const tokenURI = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: ERC1155_ABI,
            functionName: "uri",
            args: [tokenId],
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

              setNfts([
                {
                  name: metadata.name || "Obra de Arte #1",
                  description: metadata.description || "Obra de arte digital única",
                  image: imageUrl || "/placeholder.svg",
                  contractAddress,
                  tokenId: "1",
                  balance: balance.toString(),
                },
              ])
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
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
          {/* User Info */}
          <div className="max-w-2xl mx-auto mb-12 text-center">
            <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 border-2 border-white/30">
              <h1 className="font-extrabold text-4xl text-white mb-4">MI PERFIL</h1>
              {address ? (
                <p className="text-white text-xl font-semibold">{userName}</p>
              ) : (
                <p className="text-white/80 text-lg">Conecta tu wallet para ver tu perfil</p>
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
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{nft.description}</p>
                          <p className="text-xs text-gray-500">Cantidad: {nft.balance}</p>
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
