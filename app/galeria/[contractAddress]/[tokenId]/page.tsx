"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"
import { useAccount } from "wagmi"
import { ArrowLeft } from "lucide-react"
import { getDisplayName } from "@/lib/farcaster"

interface TokenMetadata {
  name: string
  description: string
  image: string
  creator?: string
}

const ERC1155_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "quantity", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
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

export default function TokenDetailPage() {
  const router = useRouter()
  const params = useParams()
  const contractAddress = params.contractAddress as `0x${string}`
  const tokenId = params.tokenId as string
  const { address, isConnected } = useAccount()

  const [tokenData, setTokenData] = useState<TokenMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [creator, setCreator] = useState<string>("")
  const [artistName, setArtistName] = useState<string>("")

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const tokenURI = await publicClient.readContract({
          address: contractAddress,
          abi: ERC1155_ABI,
          functionName: "uri",
          args: [BigInt(tokenId)],
        })

        if (tokenURI) {
          let metadataUrl = tokenURI.replace("{id}", tokenId)
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
              name: metadata.name || `Obra de Arte #${tokenId}`,
              description: metadata.description || "Obra de arte digital única",
              image: imageUrl || "/placeholder.svg",
              creator: metadata.creator,
            })
            setCreator(metadata.creator || contractAddress)
            setIsLoading(false)
            return
          }
        }

        setCreator(contractAddress)
        setTokenData({
          name: `Obra de Arte #${tokenId}`,
          description: "Obra de arte digital única de la colección oficial",
          image: "/abstract-digital-composition.png",
        })
      } catch (error) {
        console.error("Error fetching token metadata:", error)
        setCreator(contractAddress)
        setTokenData({
          name: `Obra de Arte #${tokenId}`,
          description: "Obra de arte digital única de la colección oficial",
          image: "/abstract-digital-composition.png",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokenMetadata()
  }, [contractAddress, tokenId])

  useEffect(() => {
    const fetchArtistName = async () => {
      if (!creator) return

      try {
        const displayName = await getDisplayName(creator)
        setArtistName(displayName)
      } catch (error) {
        console.error("Error fetching artist name:", error)
        setArtistName(`${creator.slice(0, 6)}...${creator.slice(-4)}`)
      }
    }

    fetchArtistName()
  }, [creator])

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image src="/images/fondo-token.png" alt="Fondo colorido abstracto" fill className="object-cover" priority />
        </div>
        <p className="relative z-10 text-white text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src="/images/fondo-token.png" alt="Fondo colorido abstracto" fill className="object-cover" priority />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-white shadow-xl">
              <Image
                src={tokenData?.image || "/placeholder.svg"}
                alt={tokenData?.name || "Token"}
                fill
                className="object-cover"
                priority
              />
            </div>

            <div className="flex flex-col gap-6">
              <Card>
                <CardContent className="p-6">
                  <h1 className="font-extrabold text-3xl text-gray-800 mb-2">{tokenData?.name}</h1>

                  <p className="text-sm text-gray-500 font-normal mb-4">por: {artistName || "Cargando..."}</p>

                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <h2 className="font-extrabold text-lg text-gray-800 mb-2">Descripción</h2>
                    <p className="text-gray-600 leading-relaxed font-normal">{tokenData?.description}</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4 shadow-sm">
                    <Button
                      disabled
                      className="w-full bg-gray-500 text-white font-extrabold py-6 text-base cursor-not-allowed opacity-60"
                    >
                      Collection Drops November 1st!
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-extrabold text-sm text-gray-600 mb-2">Información del Contrato</h3>
                  <div className="space-y-2 text-sm font-normal">
                    <div>
                      <span className="text-gray-500">Contrato:</span>
                      <p className="font-mono text-xs text-gray-800 break-all">{contractAddress}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Token ID:</span>
                      <p className="font-mono text-xs text-gray-800">{tokenId}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
