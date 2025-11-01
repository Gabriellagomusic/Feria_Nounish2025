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
import { getDisplayName } from "@/lib/farcaster"
import { ShareToFarcasterButton } from "@/components/share/ShareToFarcasterButton"
import { getTimeline, type Moment } from "@/lib/inprocess"

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
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxPerAddress",
    outputs: [{ name: "", type: "uint256" }],
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
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
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
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [creator, setCreator] = useState<string>("")
  const [artistName, setArtistName] = useState<string>("")
  const [justCollected, setJustCollected] = useState(false)

  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [contractInfo, setContractInfo] = useState<{
    userBalance: string
    totalSupply: string
    usdcBalance: string
    maxPerAddress?: string
  } | null>(null)

  const [mintError, setMintError] = useState<string | null>(null)

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
        checkContractState()
      }
    }
  }, [isConfirmed, hash, isApproving, isMinting])

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

        await checkContractState()
      } catch (error: any) {
        console.error("[v0] Error checking allowance:", error)
        addDebugLog(`❌ Error checking allowance: ${error.message}`)
      }
    }

    checkAllowance()
  }, [address, contractAddress, isExperimentalMusicToken, tokenId])

  const checkContractState = async () => {
    if (!address || !isExperimentalMusicToken) return

    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const [userBalance, totalSupply, usdcBalance, maxPerAddress] = await Promise.all([
        publicClient
          .readContract({
            address: contractAddress,
            abi: ERC1155_ABI,
            functionName: "balanceOf",
            args: [address, BigInt(tokenId)],
          })
          .catch(() => BigInt(0)),
        publicClient
          .readContract({
            address: contractAddress,
            abi: ERC1155_ABI,
            functionName: "totalSupply",
            args: [BigInt(tokenId)],
          })
          .catch(() => BigInt(0)),
        publicClient
          .readContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address],
          })
          .catch(() => BigInt(0)),
        publicClient
          .readContract({
            address: contractAddress,
            abi: ERC1155_ABI,
            functionName: "maxPerAddress",
            args: [],
          })
          .catch(() => null),
      ])

      const info = {
        userBalance: userBalance.toString(),
        totalSupply: totalSupply.toString(),
        usdcBalance: (Number(usdcBalance) / 1e6).toFixed(2),
        maxPerAddress: maxPerAddress ? maxPerAddress.toString() : undefined,
      }

      setContractInfo(info)
      addDebugLog(`📊 User already owns: ${info.userBalance} of this token`)
      addDebugLog(`📊 Total supply of this token: ${info.totalSupply}`)
      addDebugLog(`💵 User USDC balance: ${info.usdcBalance} USDC`)
      if (info.maxPerAddress) {
        addDebugLog(`🔒 Max per address: ${info.maxPerAddress}`)
      }

      if (Number(info.userBalance) > 0) {
        addDebugLog(`✅ User already owns this token - showing success state`)
        setJustCollected(true)
      }

      if (Number(info.usdcBalance) < 1) {
        addDebugLog(`⚠️ WARNING: Insufficient USDC balance! Need at least 1 USDC`)
      }

      if (info.maxPerAddress && Number(info.userBalance) >= Number(info.maxPerAddress)) {
        addDebugLog(`⚠️ WARNING: User has reached max per address limit (${info.maxPerAddress})`)
        setMintError(
          `Has alcanzado el límite máximo de ${info.maxPerAddress} token(s) por dirección. No puedes coleccionar más.`,
        )
      }
    } catch (error: any) {
      addDebugLog(`⚠️ Could not fetch contract state: ${error.message}`)
    }
  }

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      setIsLoading(true)
      setMetadataLoaded(false)

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

            try {
              const timelineData = await getTimeline(1, 100, true, undefined, 8453, false)

              if (timelineData.moments && timelineData.moments.length > 0) {
                console.log("[v0] Searching for moment:", { contractAddress, tokenId })
                console.log("[v0] Total moments:", timelineData.moments.length)

                const moment = timelineData.moments.find((m: Moment) => {
                  const addressMatch = m.address.toLowerCase() === contractAddress.toLowerCase()
                  const tokenIdMatch = m.tokenId?.toString() === tokenId.toString()

                  if (addressMatch) {
                    console.log("[v0] Found address match:", {
                      momentAddress: m.address,
                      momentTokenId: m.tokenId,
                      momentUsername: m.username,
                      searchingForTokenId: tokenId,
                      tokenIdMatch,
                    })
                  }

                  return addressMatch && tokenIdMatch
                })

                if (moment) {
                  console.log("[v0] Found matching moment for token detail:", {
                    admin: moment.admin,
                    username: moment.username,
                  })
                  setCreator(moment.admin)
                  const displayName = moment.username || (await getDisplayName(moment.admin))
                  setArtistName(displayName)
                } else {
                  console.log("[v0] No matching moment found, using fallback")
                  const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
                  setCreator(fallbackCreator)
                  const displayName = await getDisplayName(fallbackCreator)
                  setArtistName(displayName)
                }
              } else {
                const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
                setCreator(fallbackCreator)
                const displayName = await getDisplayName(fallbackCreator)
                setArtistName(displayName)
              }
            } catch (error) {
              console.error("[v0] Error fetching artist from inprocess:", error)
              const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
              setCreator(fallbackCreator)
              setArtistName(`${fallbackCreator.slice(0, 6)}...${fallbackCreator.slice(-4)}`)
            }

            setMetadataLoaded(true)
            setIsLoading(false)
            return
          }
        }

        try {
          const timelineData = await getTimeline(1, 100, true, undefined, 8453, false)

          if (timelineData.moments && timelineData.moments.length > 0) {
            console.log("[v0] Searching for moment (fallback):", { contractAddress, tokenId })

            const moment = timelineData.moments.find((m: Moment) => {
              const addressMatch = m.address.toLowerCase() === contractAddress.toLowerCase()
              const tokenIdMatch = m.tokenId?.toString() === tokenId.toString()
              return addressMatch && tokenIdMatch
            })

            if (moment) {
              console.log("[v0] Found moment in fallback:", moment.username)
              setCreator(moment.admin)
              const displayName = moment.username || (await getDisplayName(moment.admin))
              setArtistName(displayName)
            } else {
              const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
              setCreator(fallbackCreator)
              const displayName = await getDisplayName(fallbackCreator)
              setArtistName(displayName)
            }
          }
        } catch (error) {
          console.error("[v0] Error fetching artist from inprocess:", error)
          const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
          setCreator(fallbackCreator)
          setArtistName(`${fallbackCreator.slice(0, 6)}...${fallbackCreator.slice(-4)}`)
        }

        setTokenData({
          name: `Obra de Arte #${tokenId}`,
          description: "Obra de arte digital única de la colección oficial",
          image: "/abstract-digital-composition.png",
        })
      } catch (error) {
        console.error("Error fetching token metadata:", error)
        const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
        setCreator(fallbackCreator)
        setArtistName(`${fallbackCreator.slice(0, 6)}...${fallbackCreator.slice(-4)}`)
        setTokenData({
          name: `Obra de Arte #${tokenId}`,
          description: "Obra de arte digital única de la colección oficial",
          image: "/abstract-digital-composition.png",
        })
      } finally {
        setMetadataLoaded(true)
        setIsLoading(false)
      }
    }

    fetchTokenMetadata()
  }, [contractAddress, tokenId])

  const handleApprove = async () => {
    addDebugLog("💰 Starting USDC approval...")

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
    setMintError(null)

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

    if (contractInfo) {
      if (Number(contractInfo.usdcBalance) < 1) {
        addDebugLog("❌ Insufficient USDC balance")
        alert(`Saldo insuficiente de USDC. Tienes ${contractInfo.usdcBalance} USDC, necesitas al menos 1 USDC`)
        return
      }

      if (contractInfo.maxPerAddress && Number(contractInfo.userBalance) >= Number(contractInfo.maxPerAddress)) {
        addDebugLog("❌ User has reached max per address limit")
        const errorMsg = `Has alcanzado el límite máximo de ${contractInfo.maxPerAddress} token(s) por dirección. No puedes coleccionar más.`
        setMintError(errorMsg)
        alert(errorMsg)
        return
      }
    }

    addDebugLog(`📝 Wallet address: ${address}`)
    addDebugLog(`📝 Contract address: ${contractAddress}`)
    addDebugLog(`📝 Token ID: ${tokenId}`)
    addDebugLog(`📝 Quantity: ${quantity}`)

    try {
      // The wallet will simulate it anyway, and we'll get better error messages from the wallet
      addDebugLog("📤 Attempting mint transaction...")

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

      let errorMessage = "Error al intentar mintear: "
      if (error.message.includes("User rejected")) {
        errorMessage += "Transacción cancelada por el usuario."
      } else if (error.message.includes("insufficient")) {
        errorMessage += "Fondos insuficientes."
      } else if (error.message.includes("max")) {
        errorMessage += "Has alcanzado el límite máximo permitido."
      } else {
        errorMessage += error.shortMessage || error.message
      }

      setMintError(errorMessage)
      alert(errorMessage)
    }
  }

  if (isLoading || !metadataLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-lg">Cargando...</p>
        </div>
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
                    {mintError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
                        <p className="text-red-800 font-semibold mb-1">⚠️ Error de Transacción</p>
                        <p className="text-red-600 text-sm">{mintError}</p>
                      </div>
                    )}

                    {justCollected ? (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                          <p className="text-green-800 font-semibold mb-1">¡Colección exitosa!</p>
                          <p className="text-green-600 text-sm">
                            {contractInfo && Number(contractInfo.userBalance) > 0
                              ? `Ahora tienes ${contractInfo.userBalance} de este token`
                              : "Token coleccionado exitosamente"}
                          </p>
                        </div>
                        <ShareToFarcasterButton
                          mode="collect"
                          pieceId={`${contractAddress}-${tokenId}`}
                          pieceTitle={tokenData?.name}
                          contractAddress={contractAddress}
                          tokenId={tokenId}
                          onShareComplete={() => {}}
                        />
                        <Button
                          onClick={() => router.push("/perfil")}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-6 text-base"
                        >
                          Ver en Mi Perfil
                        </Button>
                        {(!contractInfo?.maxPerAddress ||
                          Number(contractInfo.userBalance) < Number(contractInfo.maxPerAddress)) && (
                          <Button
                            onClick={() => {
                              setJustCollected(false)
                              setMintError(null)
                            }}
                            variant="outline"
                            className="w-full font-extrabold py-6 text-base"
                          >
                            Coleccionar Más
                          </Button>
                        )}
                      </div>
                    ) : isExperimentalMusicToken ? (
                      <>
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
                                    : "Aprobar 1 USDC"}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleMint}
                            disabled={
                              !isConnected ||
                              isMinting ||
                              isPending ||
                              isConfirming ||
                              (contractInfo?.maxPerAddress &&
                                Number(contractInfo.userBalance) >= Number(contractInfo.maxPerAddress))
                            }
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {!isConnected
                              ? "Conecta tu Wallet"
                              : contractInfo?.maxPerAddress &&
                                  Number(contractInfo.userBalance) >= Number(contractInfo.maxPerAddress)
                                ? `Límite Alcanzado (${contractInfo.maxPerAddress} max)`
                                : isPending
                                  ? "Esperando confirmación..."
                                  : isConfirming
                                    ? "Confirmando transacción..."
                                    : isMinting
                                      ? "Minteando..."
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
                              {contractInfo && (
                                <>
                                  <div className="mt-2 pt-2 border-t border-gray-700">
                                    <div className="text-white font-bold mb-1">📊 Contract State:</div>
                                    <div>User Token Balance: {contractInfo.userBalance}</div>
                                    <div>Total Supply: {contractInfo.totalSupply}</div>
                                    <div>User USDC Balance: {contractInfo.usdcBalance} USDC</div>
                                    {contractInfo.maxPerAddress && (
                                      <div>Max Per Address: {contractInfo.maxPerAddress}</div>
                                    )}
                                  </div>
                                </>
                              )}
                              {mintError && (
                                <div className="mt-2 pt-2 border-t border-gray-700">
                                  <div className="text-red-400 font-bold mb-1">❌ Mint Error:</div>
                                  <div className="text-red-300">{mintError}</div>
                                </div>
                              )}
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
