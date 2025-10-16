"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createPublicClient, http, parseEther, encodeFunctionData, decodeErrorResult } from "viem"
import { base } from "viem/chains"
import { useAccount } from "wagmi"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"

interface TokenMetadata {
  name: string
  description: string
  image: string
}

const ZORA1155_ABI = [
  {
    inputs: [
      { name: "minter", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "quantity", type: "uint256" },
      { name: "rewardsRecipients", type: "address[]" },
      { name: "minterArguments", type: "bytes" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "uri",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SaleEnded",
    type: "error",
  },
  {
    inputs: [],
    name: "SaleHasNotStarted",
    type: "error",
  },
  {
    inputs: [],
    name: "WrongValueSent",
    type: "error",
  },
] as const

const ZORA_MINTER_ADDRESS = "0x04E2516A2c207E84a1839755675dfd8eF6302F0a" as `0x${string}`
const ZORA_MINT_PRICE = "0.000777"

export default function TokenDetailPage() {
  const router = useRouter()
  const params = useParams()
  const contractAddress = params.contractAddress as `0x${string}`
  const tokenId = params.tokenId as string
  const { address, isConnected } = useAccount()
  const { sendTransaction, isReady } = useMiniKit()

  const [tokenData, setTokenData] = useState<TokenMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchaseSuccess, setpurchaseSuccess] = useState(false)

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const tokenURI = await publicClient.readContract({
          address: contractAddress,
          abi: ZORA1155_ABI,
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
            })
            setIsLoading(false)
            return
          }
        }

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

  const handlePurchase = async () => {
    if (!address || !isConnected) {
      setPurchaseError("Por favor conecta tu wallet")
      return
    }

    if (!isReady) {
      setPurchaseError("MiniKit no está disponible. Abre esta app desde Farcaster o Base.")
      return
    }

    setIsPurchasing(true)
    setPurchaseError(null)
    setpurchaseSuccess(false)

    try {
      console.log("[v0] Iniciando compra...")
      console.log("[v0] Contrato:", contractAddress)
      console.log("[v0] Token ID:", tokenId)
      console.log("[v0] Cantidad:", quantity)
      console.log("[v0] Comprador:", address)

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const totalValue = parseEther((Number.parseFloat(ZORA_MINT_PRICE) * quantity).toString())
      console.log("[v0] Valor total:", totalValue.toString(), "wei")

      const minterArguments = encodeFunctionData({
        abi: [{ inputs: [{ name: "recipient", type: "address" }], name: "mint", type: "function" }],
        functionName: "mint",
        args: [address],
      })

      const mintArgs = [
        ZORA_MINTER_ADDRESS,
        BigInt(tokenId),
        BigInt(quantity),
        [] as `0x${string}`[],
        minterArguments,
      ] as const

      console.log("[v0] Argumentos de mint:", mintArgs)

      console.log("[v0] Simulando transacción...")
      try {
        const { request } = await publicClient.simulateContract({
          address: contractAddress,
          abi: ZORA1155_ABI,
          functionName: "mint",
          args: mintArgs,
          value: totalValue,
          account: address,
        })
        console.log("[v0] Simulación exitosa:", request)
      } catch (simulationError: any) {
        console.error("[v0] Error en simulación:", simulationError)

        let errorMessage = "Error al simular la transacción"

        try {
          if (simulationError.data) {
            const decodedError = decodeErrorResult({
              abi: ZORA1155_ABI,
              data: simulationError.data,
            })
            console.log("[v0] Error decodificado:", decodedError)

            switch (decodedError.errorName) {
              case "SaleEnded":
                errorMessage = "La venta ha terminado"
                break
              case "SaleHasNotStarted":
                errorMessage = "La venta aún no ha comenzado"
                break
              case "WrongValueSent":
                errorMessage = "El monto enviado es incorrecto"
                break
              default:
                errorMessage = `Error: ${decodedError.errorName}`
            }
          }
        } catch (decodeError) {
          console.error("[v0] No se pudo decodificar el error:", decodeError)
        }

        if (simulationError.message) {
          if (simulationError.message.includes("insufficient funds")) {
            errorMessage = "Fondos insuficientes en tu wallet"
          } else if (simulationError.message.includes("execution reverted")) {
            errorMessage = "La transacción fue rechazada por el contrato"
          }
        }

        setPurchaseError(errorMessage)
        setIsPurchasing(false)
        return
      }

      console.log("[v0] Codificando datos de transacción...")
      const data = encodeFunctionData({
        abi: ZORA1155_ABI,
        functionName: "mint",
        args: mintArgs,
      })

      console.log("[v0] Enviando transacción con MiniKit...")
      const txHash = await sendTransaction({
        to: contractAddress,
        data,
        value: totalValue.toString(),
        chainId: base.id,
      })

      console.log("[v0] Transacción enviada:", txHash)
      setpurchaseSuccess(true)
      setPurchaseError(null)

      setTimeout(() => {
        router.refresh()
      }, 2000)
    } catch (error: any) {
      console.error("[v0] Error en compra:", error)
      setPurchaseError(error.message || "Error al procesar la compra")
    } finally {
      setIsPurchasing(false)
    }
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

                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <h2 className="font-extrabold text-lg text-gray-800 mb-2">Descripción</h2>
                    <p className="text-gray-600 leading-relaxed font-normal">{tokenData?.description}</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-600 font-normal">Precio</span>
                      <span className="font-extrabold text-2xl text-gray-800">{ZORA_MINT_PRICE} ETH</span>
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
                        disabled={isPurchasing}
                      />
                      <p className="text-sm text-gray-500 mt-1 font-normal">
                        Total: {(Number.parseFloat(ZORA_MINT_PRICE) * quantity).toFixed(6)} ETH
                      </p>
                    </div>

                    {!isConnected ? (
                      <p className="text-center text-gray-600 py-4 font-normal">Conecta tu wallet para comprar</p>
                    ) : (
                      <div className="space-y-3">
                        <Button
                          onClick={handlePurchase}
                          disabled={isPurchasing || purchaseSuccess}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-6 text-lg disabled:opacity-50"
                        >
                          {isPurchasing ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Procesando...
                            </>
                          ) : purchaseSuccess ? (
                            "¡Compra exitosa!"
                          ) : (
                            `Comprar ${quantity > 1 ? `(${quantity})` : ""}`
                          )}
                        </Button>

                        {purchaseError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800 font-normal">{purchaseError}</p>
                          </div>
                        )}

                        {purchaseSuccess && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800 font-normal">
                              ¡Tu compra se procesó exitosamente! La transacción está siendo confirmada.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
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
