"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createPublicClient, http, parseUnits } from "viem"
import { base } from "viem/chains"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { ArrowLeft } from "lucide-react"
import { ShareToFarcasterButton } from "@/components/share/ShareToFarcasterButton"

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
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`
const USDC_AMOUNT = parseUnits("1", 6) // 1 USDC with 6 decimals

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
  const [justCollected, setJustCollected] = useState(false)

  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [showRejectionMessage, setShowRejectionMessage] = useState(false)
  const [rejectionType, setRejectionType] = useState<"approve" | "mint" | null>(null)

  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const isExperimentalMusicToken =
    contractAddress.toLowerCase() === "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5" && tokenId === "1"

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    console.log("[v0]", logMessage)
    setDebugInfo((prev) => [...prev, logMessage])
  }

  useEffect(() => {
    if (isConfirmed && hash) {
      addDebugLog(`✅ Transaction confirmed! Hash: ${hash}`)

      if (isApproving) {
        addDebugLog("✅ USDC approval confirmed!")
        setIsApproved(true)
        setIsApproving(false)
      } else if (isMinting) {
        setJustCollected(true)
        setIsMinting(false)
      }
    }
  }, [isConfirmed, hash, isApproving, isMinting])

  useEffect(() => {
    if (writeError) {
      addDebugLog(`❌ Transaction error: ${writeError.message}`)

      const isUserRejection =
        writeError.message.includes("User rejected") ||
        writeError.message.includes("user rejected") ||
        writeError.message.includes("User denied")

      if (isUserRejection) {
        setShowRejectionMessage(true)
        setRejectionType(isApproving ? "approve" : "mint")
      } else {
        alert(`Error: ${writeError.message}`)
      }

      setIsMinting(false)
      setIsApproving(false)
    }
  }, [writeError, isApproving])

  useEffect(() => {
    const checkAllowance = async () => {
      if (!address || !isExperimentalMusicToken) return

      try {
        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const allowance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, contractAddress],
        })

        addDebugLog(`💰 Current USDC allowance: ${allowance.toString()}`)
        setIsApproved(allowance >= USDC_AMOUNT)
      } catch (error: any) {
        console.error("[v0] Error checking allowance:", error)
        addDebugLog(`❌ Error checking allowance: ${error.message}`)
      }
    }

    checkAllowance()
  }, [address, contractAddress, isExperimentalMusicToken])

  const handleApprove = async () => {
    addDebugLog("💰 Starting USDC approval...")
    setShowRejectionMessage(false)
    setRejectionType(null)

    if (!isConnected || !address) {
      addDebugLog("❌ Wallet not connected")
      alert("Por favor conecta tu wallet primero")
      return
    }

    try {
      setIsApproving(true)
      addDebugLog(`📤 Approving ${USDC_AMOUNT.toString()} USDC for contract ${contractAddress}`)

      writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [contractAddress, USDC_AMOUNT],
      })

      addDebugLog("✅ Approval transaction sent, waiting for confirmation...")
    } catch (error: any) {
      addDebugLog(`❌ Error in handleApprove: ${error.message}`)
      console.error("[v0] Approve error:", error)
      setIsApproving(false)
      alert(`Error al aprobar USDC: ${error.message}`)
    }
  }

  const handleMint = async () => {
    addDebugLog("🚀 Starting mint process...")
    setShowRejectionMessage(false)
    setRejectionType(null)

    if (!isConnected) {
      addDebugLog("❌ Wallet not connected")
      alert("Por favor conecta tu wallet primero")
      return
    }

    if (!address) {
      addDebugLog("❌ No wallet address found")
      alert("No se pudo obtener la dirección de tu wallet")
      return
    }

    if (!isApproved) {
      addDebugLog("❌ USDC not approved yet")
      alert("Primero debes aprobar el gasto de USDC")
      return
    }

    addDebugLog(`📝 Wallet address: ${address}`)
    addDebugLog(`📝 Contract address: ${contractAddress}`)
    addDebugLog(`📝 Token ID: ${tokenId}`)
    addDebugLog(`📝 Quantity: ${quantity}`)

    try {
      setIsMinting(true)
      addDebugLog("📤 Calling mint function...")
      addDebugLog("💰 Contract will pull 1 USDC from your wallet")

      writeContract({
        address: contractAddress,
        abi: ERC1155_ABI,
        functionName: "mint",
        args: [address, BigInt(tokenId), BigInt(quantity)],
      })

      addDebugLog("✅ Mint transaction sent, waiting for user confirmation...")
    } catch (error: any) {
      addDebugLog(`❌ Error in handleMint: ${error.message}`)
      console.error("[v0] Mint error:", error)
      setIsMinting(false)
      alert(`Error al intentar mintear: ${error.message}`)
    }
  }

  useEffect(() => {
    if (justCollected) {
      const redirectTimer = setTimeout(() => {
        router.push("/perfil")
      }, 3000)

      return () => clearTimeout(redirectTimer)
    }
  }, [justCollected, router])

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div
          className="absolute inset-0 z-0 bg-fixed-parallax"
          style={{
            backgroundImage: "url(/images/fondo-token.png)",
          }}
        />
        <p className="relative z-10 text-white text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-fixed-parallax"
        style={{
          backgroundImage: "url(/images/fondo-token.png)",
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

                  <div className="border-t border-gray-200 pt-4 shadow-sm space-y-2">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-600 mb-1">Precio</p>
                      <p className="text-2xl font-extrabold text-purple-600">1 USDC</p>
                    </div>

                    {justCollected ? (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                          <p className="text-green-800 font-semibold mb-1">¡Colección exitosa!</p>
                          <p className="text-green-600 text-sm">Redirigiendo a tu perfil en 3 segundos...</p>
                        </div>
                        <ShareToFarcasterButton
                          mode="collect"
                          pieceId={`${contractAddress}-${tokenId}`}
                          pieceTitle={tokenData?.name}
                          contractAddress={contractAddress}
                          tokenId={tokenId}
                          onShareComplete={() => setJustCollected(false)}
                        />
                        <Button
                          onClick={() => router.push("/perfil")}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-6 text-base"
                        >
                          Ir a Mi Perfil Ahora
                        </Button>
                      </div>
                    ) : isExperimentalMusicToken ? (
                      <>
                        {showRejectionMessage && (
                          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-3">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl">⚠️</div>
                              <div className="flex-1">
                                <p className="font-bold text-yellow-900 mb-1">Transacción Cancelada</p>
                                <p className="text-sm text-yellow-800 mb-2">
                                  {rejectionType === "approve"
                                    ? "Rechazaste la aprobación de USDC en tu wallet. Necesitas aprobar el gasto de 1 USDC para poder coleccionar esta obra."
                                    : "Rechazaste la transacción de minteo en tu wallet. Necesitas confirmar la transacción para coleccionar esta obra."}
                                </p>
                                <p className="text-xs text-yellow-700">
                                  💡 Tip: Cuando aparezca la ventana de tu wallet, asegúrate de hacer clic en
                                  "Confirmar" o "Approve" para completar la transacción.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {!isApproved ? (
                          <Button
                            onClick={handleApprove}
                            disabled={!isConnected || isApproving || isPending || isConfirming}
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-extrabold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {!isConnected
                              ? "Conecta tu Wallet"
                              : isPending
                                ? "Esperando confirmación..."
                                : isConfirming
                                  ? "Confirmando aprobación..."
                                  : isApproving
                                    ? "Aprobando USDC..."
                                    : showRejectionMessage && rejectionType === "approve"
                                      ? "Reintentar Aprobación"
                                      : "Aprobar 1 USDC"}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleMint}
                            disabled={!isConnected || isMinting || isPending || isConfirming}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {!isConnected
                              ? "Conecta tu Wallet"
                              : isPending
                                ? "Esperando confirmación..."
                                : isConfirming
                                  ? "Confirmando transacción..."
                                  : isMinting
                                    ? "Minteando..."
                                    : showRejectionMessage && rejectionType === "mint"
                                      ? "Reintentar Colección"
                                      : "Coleccionar Ahora"}
                          </Button>
                        )}

                        <Button onClick={() => setShowDebug(!showDebug)} variant="outline" className="w-full">
                          {showDebug ? "Ocultar" : "Mostrar"} Debug Info
                        </Button>

                        {showDebug && (
                          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto">
                            <div className="mb-2 text-white font-bold">🔍 Debug Information:</div>
                            <div className="space-y-1">
                              <div>Connected: {isConnected ? "✅ Yes" : "❌ No"}</div>
                              <div>Address: {address || "N/A"}</div>
                              <div>Contract: {contractAddress}</div>
                              <div>Token ID: {tokenId}</div>
                              <div>Is Experimental Token: {isExperimentalMusicToken ? "✅ Yes" : "❌ No"}</div>
                              <div>USDC Approved: {isApproved ? "✅ Yes" : "❌ No"}</div>
                              <div>Approving: {isApproving ? "✅ Yes" : "❌ No"}</div>
                              <div>Minting: {isMinting ? "✅ Yes" : "❌ No"}</div>
                              <div>Pending: {isPending ? "✅ Yes" : "❌ No"}</div>
                              <div>Confirming: {isConfirming ? "✅ Yes" : "❌ No"}</div>
                              {hash && <div>Tx Hash: {hash}</div>}
                              {writeError && <div className="text-red-400">Error: {writeError.message}</div>}
                            </div>
                            <div className="mt-4 border-t border-gray-700 pt-2">
                              <div className="text-white font-bold mb-2">📋 Transaction Log:</div>
                              {debugInfo.length === 0 ? (
                                <div className="text-gray-500">No logs yet...</div>
                              ) : (
                                debugInfo.map((log, i) => (
                                  <div key={i} className="mb-1">
                                    {log}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <Button
                        disabled
                        className="w-full bg-gray-500 text-white font-extrabold py-6 text-base cursor-not-allowed opacity-60"
                      >
                        Collection Drops November 1st!
                      </Button>
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
