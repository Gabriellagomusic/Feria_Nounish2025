"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from "@coinbase/onchainkit/transaction"
import type { LifecycleStatus } from "@coinbase/onchainkit/transaction"
import { createPublicClient, http, parseUnits } from "viem"
import { base } from "viem/chains"
import { useAccount } from "wagmi"
import { ArrowLeft } from "lucide-react"

interface TokenMetadata {
  name: string
  description: string
  image: string
}

const ERC1155_ABI = [
  {
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "quantity", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    name: "purchase",
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

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const

const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
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

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        console.log("[v0] Fetching metadata for contract:", contractAddress, "tokenId:", tokenId)

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

        console.log("[v0] Token URI:", tokenURI)

        if (tokenURI) {
          let metadataUrl = tokenURI.replace("{id}", tokenId)
          if (metadataUrl.startsWith("ar://")) {
            metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
          }

          console.log("[v0] Fetching metadata from:", metadataUrl)

          const metadataResponse = await fetch(metadataUrl)
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json()

            console.log("[v0] Metadata:", metadata)

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
            })
            setIsLoading(false)
            return
          }
        }

        // Fallback to placeholder data
        setTokenData({
          name: `Obra de Arte #${tokenId}`,
          description: "Obra de arte digital única de la colección oficial",
          image: "/abstract-digital-composition.png",
        })
      } catch (error) {
        console.error("[v0] Error fetching token metadata:", error)
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

  const usdcAmount = parseUnits((quantity * 1).toString(), 6)

  console.log("[v0] Contract address:", contractAddress)
  console.log("[v0] Token ID:", tokenId)
  console.log("[v0] Quantity:", quantity)
  console.log("[v0] USDC amount:", usdcAmount.toString())
  console.log("[v0] User address:", address)

  const contracts = [
    {
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contractAddress, usdcAmount],
    },
    {
      address: contractAddress,
      abi: ERC1155_ABI,
      functionName: "purchase",
      args: [BigInt(tokenId), BigInt(quantity), address],
    },
  ]

  const handleOnStatus = (status: LifecycleStatus) => {
    console.log("[v0] Transaction status:", status)
    console.log("[v0] Status details:", JSON.stringify(status, null, 2))
  }

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

        {/* Token Detail */}
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Image */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-white shadow-xl">
              <Image
                src={tokenData?.image || "/placeholder.svg"}
                alt={tokenData?.name || "Token"}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Details */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardContent className="p-6">
                  <h1 className="font-extrabold text-3xl text-gray-800 mb-2">{tokenData?.name}</h1>

                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <h2 className="font-extrabold text-lg text-gray-800 mb-2">Descripción</h2>
                    <p className="text-gray-600 leading-relaxed font-normal">{tokenData?.description}</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-600 font-normal">Precio</span>
                      <span className="font-extrabold text-2xl text-gray-800">1 USDC</span>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="quantity" className="block text-sm font-extrabold text-gray-700 mb-2">
                        Cantidad
                      </label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                        className="w-full font-normal"
                      />
                      <p className="text-sm text-gray-500 mt-1 font-normal">Total: {quantity} USDC</p>
                    </div>

                    {!isConnected ? (
                      <p className="text-center text-gray-600 py-4 font-normal">Conecta tu wallet para comprar</p>
                    ) : (
                      <Transaction chainId={base.id} calls={contracts} onStatus={handleOnStatus}>
                        <TransactionButton
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-6 text-lg"
                          text={`Comprar ${quantity > 1 ? `(${quantity})` : ""}`}
                        />
                        <TransactionStatus>
                          <TransactionStatusLabel />
                          <TransactionStatusAction />
                        </TransactionStatus>
                      </Transaction>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contract Info */}
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
