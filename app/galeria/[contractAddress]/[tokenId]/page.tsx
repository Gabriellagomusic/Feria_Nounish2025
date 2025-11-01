"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { createPublicClient, http, parseUnits, type Address } from "viem"
import { base } from "viem/chains"
import { useAccount, useWriteContract, useConnect } from "wagmi"
import { ArrowLeft, Plus, Minus } from "lucide-react"
import { getDisplayName } from "@/lib/farcaster"
import { ShareToFarcasterButton } from "@/components/share/ShareToFarcasterButton"
import { getTimeline, type Moment } from "@/lib/inprocess"
import { useMiniKit } from "@coinbase/onchainkit/minikit"

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address // USDC on Base
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

const ZORA_ERC20_MINTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenContract", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "mintTo", type: "address" },
          { name: "quantity", type: "uint256" },
          { name: "currency", type: "address" },
          { name: "pricePerToken", type: "uint256" },
          { name: "mintReferral", type: "address" },
          { name: "comment", type: "string" },
        ],
        name: "mintArguments",
        type: "tuple",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

const ZORA_ERC20_MINTER = "0x3678862f04290E565cCA2EF163BAeb92Bb76790C" as Address

interface TokenMetadata {
  name: string
  description: string
  image: string
  creator?: string
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
    name: "totalSupply",
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

async function fetchWithRetry<T>(fetchFn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`[v0] Token Detail - Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Failed after retries")
}

export default function TokenDetailPage() {
  const router = useRouter()
  const params = useParams()
  const contractAddress = params.contractAddress as `0x${string}`
  const tokenId = params.tokenId as string
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { setFrameReady, isFrameReady } = useMiniKit()

  const frameReadyCalledRef = useRef(false)
  const connectAttemptedRef = useRef(false)

  const [tokenData, setTokenData] = useState<TokenMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [creator, setCreator] = useState<string>("")
  const [artistName, setArtistName] = useState<string>("")
  const [justCollected, setJustCollected] = useState(false)

  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebugPanel, setShowDebugPanel] = useState(true)
  const [isMinting, setIsMinting] = useState(false)
  const [contractInfo, setContractInfo] = useState<{
    userBalance: string
    totalSupply: string
  } | null>(null)

  const [mintError, setMintError] = useState<string | null>(null)
  const [mintHash, setMintHash] = useState<string | null>(null)

  const [persistentLogs, setPersistentLogs] = useState<string[]>([])

  const [isApproving, setIsApproving] = useState(false)
  const [approvalHash, setApprovalHash] = useState<string | null>(null)
  const [needsApproval, setNeedsApproval] = useState(false)

  const { writeContractAsync } = useWriteContract()

  const isExperimentalMusicToken =
    contractAddress.toLowerCase() === "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5" && tokenId === "1"

  const addDebugLog = (message: string, persist = false) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    console.log("[v0]", logMessage)
    setDebugInfo((prev) => [...prev, logMessage])

    if (persist) {
      setPersistentLogs((prev) => [...prev, logMessage])
    }
  }

  useEffect(() => {
    if (!isFrameReady && !frameReadyCalledRef.current) {
      console.log("[v0] Token Detail - Calling setFrameReady() once")
      addDebugLog("🎬 Calling setFrameReady() once", true)
      frameReadyCalledRef.current = true
      setFrameReady()
    }
  }, [isFrameReady, setFrameReady])

  useEffect(() => {
    if (isFrameReady && !isConnected && !connectAttemptedRef.current && connectors.length > 0) {
      const farcasterConnector = connectors.find((c) => c.name === "Farcaster")
      if (farcasterConnector) {
        console.log("[v0] Token Detail - Auto-connecting to Farcaster connector once")
        addDebugLog("🔌 Auto-connecting to Farcaster connector...", true)
        connectAttemptedRef.current = true
        connect({ connector: farcasterConnector })
      } else {
        addDebugLog("⚠️ Farcaster connector not found", true)
      }
    }
  }, [isFrameReady, isConnected, connectors, connect])

  useEffect(() => {
    console.log("[v0] ========== TOKEN DETAIL PAGE MOUNTED ==========")
    addDebugLog("🚀 Token Detail Page Mounted", true)
    addDebugLog(`📝 Contract Address: ${contractAddress}`, true)
    addDebugLog(`📝 Token ID: ${tokenId}`, true)
    addDebugLog(`📝 Is Experimental Music Token: ${isExperimentalMusicToken}`, true)
  }, [])

  useEffect(() => {
    console.log("[v0] ========== WALLET CONNECTION STATUS CHANGED ==========")
    console.log("[v0] Is Connected:", isConnected)
    console.log("[v0] Address:", address)
    addDebugLog(`🔌 Wallet Connection Status: ${isConnected ? "Connected" : "Disconnected"}`, true)
    if (address) {
      addDebugLog(`👛 Wallet Address: ${address}`, true)
    }
  }, [isConnected, address])

  useEffect(() => {
    console.log("[v0] ========== QUANTITY CHANGED ==========")
    console.log("[v0] New Quantity:", quantity)
    addDebugLog(`🔢 Quantity changed to: ${quantity}`, true)
  }, [quantity])

  const checkContractState = async () => {
    if (!address || !isExperimentalMusicToken) return

    console.log("[v0] ========== CHECKING CONTRACT STATE ==========")
    addDebugLog("🔍 Checking contract state on Base chain...", true)

    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      addDebugLog(`📡 Created public client for Base chain`, true)
      addDebugLog(`📡 Reading balanceOf for address: ${address}`, true)
      addDebugLog(`📡 Reading totalSupply for token ID: ${tokenId}`, true)

      const [userBalance, totalSupply] = await Promise.all([
        publicClient
          .readContract({
            address: contractAddress,
            abi: ERC1155_ABI,
            functionName: "balanceOf",
            args: [address, BigInt(tokenId)],
          })
          .catch((error) => {
            addDebugLog(`⚠️ Error reading balanceOf: ${error.message}`, true)
            return BigInt(0)
          }),
        publicClient
          .readContract({
            address: contractAddress,
            abi: ERC1155_ABI,
            functionName: "totalSupply",
            args: [BigInt(tokenId)],
          })
          .catch((error) => {
            addDebugLog(`⚠️ Error reading totalSupply: ${error.message}`, true)
            return BigInt(0)
          }),
      ])

      const info = {
        userBalance: userBalance.toString(),
        totalSupply: totalSupply.toString(),
      }

      setContractInfo(info)
      addDebugLog(`📊 [Base Chain] User Balance: ${info.userBalance}`, true)
      addDebugLog(`📊 [Base Chain] Total Supply: ${info.totalSupply}`, true)
    } catch (error: any) {
      console.log("[v0] Error checking contract state:", error)
      addDebugLog(`❌ Error checking contract state: ${error.message}`, true)
      addDebugLog(`❌ Full error: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`, true)
    }
  }

  const checkUSDCAllowance = async () => {
    if (!address) return

    addDebugLog("🔍 Checking USDC allowance and balance...", true)

    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const pricePerToken = parseUnits("1", 6) // 1 USDC (6 decimals)
      const totalCost = pricePerToken * BigInt(quantity)

      const [allowance, balance] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, ZORA_ERC20_MINTER],
        }),
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        }),
      ])

      addDebugLog(`💰 Your USDC Balance: ${Number(balance) / 1e6} USDC`, true)
      addDebugLog(`💰 Total Cost: ${Number(totalCost) / 1e6} USDC (${quantity} × 1 USDC)`, true)
      addDebugLog(`✅ Current Allowance: ${Number(allowance) / 1e6} USDC`, true)

      if (balance < totalCost) {
        throw new Error(
          `Insufficient USDC balance. You need ${Number(totalCost) / 1e6} USDC but have ${Number(balance) / 1e6} USDC`,
        )
      }

      if (allowance < totalCost) {
        addDebugLog(
          `⚠️ Needs approval: allowance (${Number(allowance) / 1e6}) < cost (${Number(totalCost) / 1e6})`,
          true,
        )
        setNeedsApproval(true)
        return false
      }

      addDebugLog(`✅ Sufficient allowance: ${Number(allowance) / 1e6} USDC`, true)
      setNeedsApproval(false)
      return true
    } catch (error: any) {
      addDebugLog(`❌ Error checking USDC: ${error.message}`, true)
      throw error
    }
  }

  const approveUSDC = async () => {
    if (!address) return

    addDebugLog("🔐 Starting USDC approval...", true)
    setIsApproving(true)

    try {
      const pricePerToken = parseUnits("1", 6) // 1 USDC
      const totalCost = pricePerToken * BigInt(quantity)

      // Approve a bit more to account for potential price changes
      const approvalAmount = totalCost * BigInt(2)

      addDebugLog(`📝 Approving ${Number(approvalAmount) / 1e6} USDC to Zora ERC20 Minter`, true)
      addDebugLog(`📝 Spender: ${ZORA_ERC20_MINTER}`, true)

      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ZORA_ERC20_MINTER, approvalAmount],
      })

      setApprovalHash(hash)
      addDebugLog(`✅ Approval transaction sent: ${hash}`, true)
      addDebugLog(`🔗 View on BaseScan: https://basescan.org/tx/${hash}`, true)

      // Wait for approval transaction
      addDebugLog(`⏳ Waiting for approval confirmation...`, true)
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      addDebugLog(`✅ Approval confirmed! Block: ${receipt.blockNumber}`, true)

      setNeedsApproval(false)
      setIsApproving(false)
      return true
    } catch (error: any) {
      addDebugLog(`❌ Approval failed: ${error.message}`, true)
      setIsApproving(false)
      throw error
    }
  }

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      setIsLoading(true)

      try {
        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const tokenURI = await fetchWithRetry(async () => {
          return await publicClient.readContract({
            address: contractAddress,
            abi: ERC1155_ABI,
            functionName: "uri",
            args: [BigInt(tokenId)],
          })
        })

        if (tokenURI) {
          let metadataUrl = tokenURI.replace("{id}", tokenId)
          if (metadataUrl.startsWith("ar://")) {
            metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
          }

          const metadata = await fetchWithRetry(async () => {
            const response = await fetch(metadataUrl)
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }
            return await response.json()
          })

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
            const timelineData = await fetchWithRetry(async () => {
              return await getTimeline(1, 100, true, undefined, 8453, false)
            })

            if (timelineData.moments && timelineData.moments.length > 0) {
              const moment = timelineData.moments.find((m: Moment) => {
                const addressMatch = m.address.toLowerCase() === contractAddress.toLowerCase()
                const tokenIdMatch = m.tokenId?.toString() === tokenId.toString()
                return addressMatch && tokenIdMatch
              })

              if (moment) {
                setCreator(moment.admin)
                const displayName = moment.username || (await getDisplayName(moment.admin))
                setArtistName(displayName)
              } else {
                const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
                setCreator(fallbackCreator)
                const displayName = await getDisplayName(fallbackCreator)
                setArtistName(displayName)
              }
            } else {
              const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
              setCreator(fallbackCreator)
              setArtistName(await getDisplayName(fallbackCreator))
            }
          } catch (error) {
            console.error("[v0] Error fetching artist from inprocess after retries:", error)
            const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
            setCreator(fallbackCreator)
            setArtistName(`${fallbackCreator.slice(0, 6)}...${fallbackCreator.slice(-4)}`)
          }

          setIsLoading(false)
          return
        }

        const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
        setCreator(fallbackCreator)
        setArtistName(`${fallbackCreator.slice(0, 6)}...${fallbackCreator.slice(-4)}`)
        setTokenData({
          name: `Obra de Arte #${tokenId}`,
          description: "Obra de arte digital única de la colección oficial",
          image: "/abstract-digital-composition.png",
        })
      } catch (error) {
        console.error("Error fetching token metadata after retries:", error)
        const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
        setCreator(fallbackCreator)
        setArtistName(`${fallbackCreator.slice(0, 6)}...${fallbackCreator.slice(-4)}`)
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
    if (address && isExperimentalMusicToken) {
      checkContractState()
    }
  }, [address, isExperimentalMusicToken])

  const handleMint = async () => {
    console.log("[v0] ========== COLECCIONAR BUTTON CLICKED ==========")
    addDebugLog("🔘 ========== COLECCIONAR BUTTON CLICKED ==========", true)
    addDebugLog(`⏰ Timestamp: ${new Date().toISOString()}`, true)

    if (!address) {
      addDebugLog("❌ ERROR: No wallet connected", true)
      setMintError("Por favor conecta tu wallet primero")
      return
    }

    addDebugLog(`✅ Wallet connected: ${address}`, true)
    addDebugLog(`💡 IMPORTANTE: TÚ (el coleccionista) pagas 1 USDC + gas`, true)
    addDebugLog(`💡 El artista NO paga nada`, true)

    try {
      setMintError(null)
      setIsMinting(true)
      setMintHash(null)

      addDebugLog("🚀 ========== STARTING COLLECTOR-PAID MINT ==========", true)
      addDebugLog(`📝 Chain: Base (8453)`, true)
      addDebugLog(`📝 Collector (YOU): ${address}`, true)
      addDebugLog(`📝 Contract: ${contractAddress}`, true)
      addDebugLog(`📝 Token ID: ${tokenId}`, true)
      addDebugLog(`📝 Quantity: ${quantity}`, true)
      addDebugLog(`💰 Price: 1 USDC per edition`, true)
      addDebugLog(`💰 Total Cost: ${quantity} USDC + gas`, true)
      addDebugLog(`✨ Minting Type: COLLECTOR PAYS (you pay USDC + gas)`, true)

      // Step 1: Check USDC allowance
      addDebugLog("📋 Step 1: Checking USDC allowance...", true)
      const hasAllowance = await checkUSDCAllowance()

      // Step 2: Approve USDC if needed
      if (!hasAllowance) {
        addDebugLog("📋 Step 2: Approving USDC...", true)
        await approveUSDC()
        addDebugLog("✅ USDC approved successfully!", true)
      } else {
        addDebugLog("✅ Step 2: USDC already approved, skipping", true)
      }

      // Step 3: Mint with Zora ERC20 Minter
      addDebugLog("📋 Step 3: Minting with Zora ERC20 Minter...", true)

      const pricePerToken = parseUnits("1", 6) // 1 USDC

      const mintArgs = {
        tokenContract: contractAddress,
        tokenId: BigInt(tokenId),
        mintTo: address,
        quantity: BigInt(quantity),
        currency: USDC_ADDRESS,
        pricePerToken: pricePerToken,
        mintReferral: "0x0000000000000000000000000000000000000000" as Address,
        comment: "Collected via Feria Nounish on Base!",
      }

      addDebugLog(
        `📤 Mint Arguments: ${JSON.stringify(
          {
            ...mintArgs,
            tokenId: mintArgs.tokenId.toString(),
            quantity: mintArgs.quantity.toString(),
            pricePerToken: (Number(mintArgs.pricePerToken) / 1e6).toString() + " USDC",
          },
          null,
          2,
        )}`,
        true,
      )

      const hash = await writeContractAsync({
        address: ZORA_ERC20_MINTER,
        abi: ZORA_ERC20_MINTER_ABI,
        functionName: "mint",
        args: [mintArgs],
      })

      setMintHash(hash)
      addDebugLog(`✅ Mint transaction sent: ${hash}`, true)
      addDebugLog(`🔗 View on BaseScan: https://basescan.org/tx/${hash}`, true)

      // Wait for mint transaction
      addDebugLog(`⏳ Waiting for mint confirmation...`, true)
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      addDebugLog(`✅ Mint confirmed! Block: ${receipt.blockNumber}`, true)

      addDebugLog("✅ ========== MINT SUCCESSFUL ==========", true)
      setJustCollected(true)
      setIsMinting(false)

      await checkContractState()
    } catch (error: any) {
      console.log("[v0] ========== ERROR IN MINT ==========")
      console.log("[v0] Error:", error)

      addDebugLog("❌ ========== MINT ERROR ==========", true)
      addDebugLog(`❌ Error Type: ${error.constructor.name}`, true)
      addDebugLog(`❌ Error Message: ${error.message}`, true)

      if (error.cause) {
        addDebugLog(`❌ Error Cause: ${JSON.stringify(error.cause, null, 2)}`, true)
      }

      let errorMessage = error.message || "Error desconocido"

      if (errorMessage.includes("User rejected")) {
        errorMessage = "Transacción rechazada por el usuario"
      } else if (errorMessage.includes("Insufficient")) {
        errorMessage = "Balance insuficiente de USDC o ETH para gas"
      }

      setMintError(`Error al coleccionar: ${errorMessage}`)
      setIsMinting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
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
          {showDebugPanel && (debugInfo.length > 0 || persistentLogs.length > 0) && (
            <div className="mb-8 max-w-6xl mx-auto">
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold text-sm">🐛 Debug Logs (Persistent)</h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setDebugInfo([])
                          setPersistentLogs([])
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-gray-800"
                      >
                        Limpiar
                      </Button>
                      <Button
                        onClick={() => setShowDebugPanel(false)}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-gray-800"
                      >
                        Ocultar
                      </Button>
                    </div>
                  </div>
                  <div className="bg-black rounded p-3 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                      {[...debugInfo, ...persistentLogs].join("\n")}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    💡 Los logs marcados como persistentes no se borran al re-renderizar
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {!showDebugPanel && (debugInfo.length > 0 || persistentLogs.length > 0) && (
            <div className="mb-4 max-w-6xl mx-auto">
              <Button onClick={() => setShowDebugPanel(true)} variant="outline" size="sm" className="w-full">
                🐛 Mostrar Debug Logs ({debugInfo.length + persistentLogs.length})
              </Button>
            </div>
          )}

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
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-3">
                        <p className="text-red-800 font-bold mb-2 text-base">⚠️ Error</p>
                        <p className="text-red-700 text-sm font-semibold mb-2 whitespace-pre-line">{mintError}</p>
                      </div>
                    )}

                    {justCollected ? (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                          <p className="text-green-800 font-semibold mb-1">¡Colección exitosa!</p>
                          <p className="text-green-600 text-xs">
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
                          onClick={() => {
                            setJustCollected(false)
                            setMintError(null)
                            setMintHash(null)
                          }}
                          variant="outline"
                          className="w-full font-extrabold py-6 text-base"
                        >
                          Coleccionar Más
                        </Button>
                      </div>
                    ) : isExperimentalMusicToken ? (
                      <>
                        <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <Button
                            onClick={() => {
                              const newQuantity = Math.max(1, quantity - 1)
                              setQuantity(newQuantity)
                              setMintError(null)
                            }}
                            disabled={quantity <= 1}
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="text-center">
                            <div className="text-2xl font-extrabold text-gray-800">{quantity}</div>
                            <div className="text-xs text-gray-500">ediciones</div>
                          </div>
                          <Button
                            onClick={() => {
                              const newQuantity = quantity + 1
                              setQuantity(newQuantity)
                              setMintError(null)
                            }}
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                          <p className="text-blue-800 font-semibold">💰 Precio: 1 USDC por edición</p>
                          <p className="text-blue-600 text-xs mt-1">💳 Tú pagas: {quantity} USDC + gas en Base</p>
                        </div>

                        <Button
                          onClick={handleMint}
                          disabled={!isConnected || isMinting || isApproving}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {!isConnected
                            ? "Conecta tu Wallet"
                            : isApproving
                              ? "Aprobando USDC..."
                              : isMinting
                                ? "Coleccionando..."
                                : "Coleccionar"}
                        </Button>

                        <p className="text-xs text-center text-gray-500">
                          💳 Pagas {quantity} USDC + gas en Base - el coleccionista paga directamente
                        </p>
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
                    {mintHash && (
                      <div>
                        <span className="text-gray-500">Transaction Hash:</span>
                        <p className="font-mono text-xs text-gray-800 break-all">{mintHash}</p>
                      </div>
                    )}
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
