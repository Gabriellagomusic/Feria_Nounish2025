"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createPublicClient, http, encodeFunctionData } from "viem"
import { base } from "viem/chains"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { ArrowLeft, Plus, Minus } from "lucide-react"
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

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC on Base
const PRICE_PER_TOKEN = BigInt(1000000) // 1 USDC (6 decimals)

const USDC_ABI = [
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

const ZORA_1155_ABI = [
  {
    inputs: [
      { name: "minter", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "quantity", type: "uint256" },
      { name: "minterArguments", type: "bytes" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
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

  const [tokenData, setTokenData] = useState<TokenMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [creator, setCreator] = useState<string>("")
  const [artistName, setArtistName] = useState<string>("")
  const [justCollected, setJustCollected] = useState(false)

  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [isMinting, setIsMinting] = useState(false)
  const [contractInfo, setContractInfo] = useState<{
    userBalance: string
    totalSupply: string
    ethBalance: string
  } | null>(null)

  const [salesConfig, setSalesConfig] = useState<{
    type: string
    pricePerToken: string
    currency?: string
    saleStart?: number
    saleEnd?: number
  } | null>(null)

  const [mintError, setMintError] = useState<string | null>(null)

  const isExperimentalMusicToken =
    contractAddress.toLowerCase() === "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5" && tokenId === "1"

  const ethAmountDisplay = salesConfig ? (Number(salesConfig.pricePerToken) / 1e18) * quantity : 0.0003 * quantity

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    console.log("[v0]", logMessage)
    setDebugInfo((prev) => [...prev, logMessage])
  }

  const checkContractState = async () => {
    if (!address || !isExperimentalMusicToken) return

    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const [userBalance, totalSupply, ethBalance] = await Promise.all([
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
        publicClient.getBalance({ address }).catch(() => BigInt(0)),
      ])

      const info = {
        userBalance: userBalance.toString(),
        totalSupply: totalSupply.toString(),
        ethBalance: (Number(ethBalance) / 1e18).toFixed(4),
      }

      setContractInfo(info)
      addDebugLog(`📊 [Base Chain] User already owns: ${info.userBalance} of this token`)
      addDebugLog(`📊 [Base Chain] Total supply of this token: ${info.totalSupply}`)
      addDebugLog(`💎 [Base Chain] User ETH balance: ${info.ethBalance} ETH`)

      const requiredEth = ethAmountDisplay
      if (Number(info.ethBalance) < requiredEth) {
        addDebugLog(`⚠️ WARNING: Low ETH balance! Have ${info.ethBalance} ETH on Base (though minting is gasless)`)
      }
    } catch (error: any) {
      addDebugLog(`⚠️ Could not fetch contract state: ${error.message}`)
    }
  }

  const checkUSDCBalance = async () => {
    if (!address) return

    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const [balance, allowance] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: "balanceOf",
          args: [address],
        }),
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: "allowance",
          args: [address, contractAddress],
        }),
      ])

      setUsdcBalance(balance)
      setUsdcAllowance(allowance)

      const totalCost = PRICE_PER_TOKEN * BigInt(quantity)
      addDebugLog(`💵 [Base] USDC Balance: ${Number(balance) / 1e6} USDC`)
      addDebugLog(`✅ [Base] USDC Allowance: ${Number(allowance) / 1e6} USDC`)
      addDebugLog(`💰 [Base] Total Cost: ${Number(totalCost) / 1e6} USDC`)

      setIsApproved(allowance >= totalCost)
    } catch (error: any) {
      addDebugLog(`❌ Error checking USDC: ${error.message}`)
    }
  }

  const [isApproving, setIsApproving] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0))
  const [usdcAllowance, setUsdcAllowance] = useState<bigint>(BigInt(0))

  const { writeContract: approveUSDC, data: approveHash } = useWriteContract()
  const { writeContract: mintToken, data: mintHash } = useWriteContract()

  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  const { isSuccess: mintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  })

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
              console.log("[v0] Searching for moment:", { contractAddress, tokenId })

              const moment = timelineData.moments.find((m: Moment) => {
                const addressMatch = m.address.toLowerCase() === contractAddress.toLowerCase()
                const tokenIdMatch = m.tokenId?.toString() === tokenId.toString()
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

        try {
          const timelineData = await fetchWithRetry(async () => {
            return await getTimeline(1, 100, true, undefined, 8453, false)
          })

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
              setArtistName(await getDisplayName(fallbackCreator))
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
    const fetchSalesConfig = async () => {
      if (!isExperimentalMusicToken) return

      try {
        addDebugLog("📤 [Base Chain] Fetching sales config from InProcess API...")
        const response = await fetch(
          `/api/inprocess/moment?contractAddress=${contractAddress}&tokenId=${tokenId}&chainId=8453`,
        )

        if (!response.ok) {
          const errorData = await response.json()
          addDebugLog(`❌ Failed to fetch sales config: ${JSON.stringify(errorData)}`)
          const defaultConfig = {
            type: "fixedPrice",
            pricePerToken: "300000000000000", // 0.0003 ETH ≈ 1 USD
            saleStart: 0,
            saleEnd: "18446744073709551615", // maxUint64
          }
          addDebugLog(`ℹ️ Using default sales config: 0.0003 ETH per edition on Base`)
          setSalesConfig(defaultConfig)
          return
        }

        const data = await response.json()
        addDebugLog(`✅ [Base Chain] Sales config fetched: ${JSON.stringify(data.salesConfig, null, 2)}`)

        if (data.salesConfig) {
          setSalesConfig(data.salesConfig)
          addDebugLog(`💰 Price per token: ${data.salesConfig.pricePerToken}`)
          addDebugLog(
            `💎 Type: ${data.salesConfig.type} (${data.salesConfig.type === "fixedPrice" ? "Native ETH on Base" : "ERC20"})`,
          )
          addDebugLog(`📅 Sale start: ${data.salesConfig.saleStart}`)
          addDebugLog(`📅 Sale end: ${data.salesConfig.saleEnd}`)
        }
      } catch (error: any) {
        addDebugLog(`❌ Error fetching sales config: ${error.message}`)
        const defaultConfig = {
          type: "fixedPrice",
          pricePerToken: "300000000000000", // 0.0003 ETH ≈ 1 USD
          saleStart: 0,
          saleEnd: "18446744073709551615", // maxUint64
        }
        addDebugLog(`ℹ️ Using default sales config: 0.0003 ETH per edition on Base`)
        setSalesConfig(defaultConfig)
      }
    }

    fetchSalesConfig()
  }, [contractAddress, tokenId, isExperimentalMusicToken])

  useEffect(() => {
    if (address && isExperimentalMusicToken) {
      checkContractState()
      checkUSDCBalance()
    }
  }, [address, quantity, isExperimentalMusicToken])

  useEffect(() => {
    if (approveSuccess) {
      addDebugLog("✅ [Base] USDC approval successful!")
      setIsApproving(false)
      checkUSDCBalance()
    }
  }, [approveSuccess])

  useEffect(() => {
    if (mintSuccess) {
      addDebugLog("✅ [Base] Mint successful!")
      setJustCollected(true)
      setIsMinting(false)
      checkContractState()
    }
  }, [mintSuccess])

  const handleApprove = async () => {
    if (!address) {
      addDebugLog("❌ No wallet connected")
      return
    }

    try {
      setMintError(null)
      setIsApproving(true)

      const totalCost = PRICE_PER_TOKEN * BigInt(quantity)
      addDebugLog(`🔐 [Base] Approving ${Number(totalCost) / 1e6} USDC...`)
      addDebugLog(`📝 USDC Address: ${USDC_ADDRESS}`)
      addDebugLog(`📝 Spender (Contract): ${contractAddress}`)
      addDebugLog(`📝 Amount: ${totalCost.toString()} (${Number(totalCost) / 1e6} USDC)`)

      approveUSDC({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "approve",
        args: [contractAddress, totalCost],
      })
    } catch (error: any) {
      addDebugLog(`❌ Error approving USDC: ${error.message}`)
      setMintError(`Error al aprobar USDC: ${error.message}`)
      setIsApproving(false)
    }
  }

  const handleMint = async () => {
    if (!address) {
      addDebugLog("❌ No wallet connected")
      return
    }

    if (!isApproved) {
      addDebugLog("❌ USDC not approved")
      setMintError("Primero debes aprobar el gasto de USDC")
      return
    }

    try {
      setMintError(null)
      setIsMinting(true)

      const totalCost = PRICE_PER_TOKEN * BigInt(quantity)
      addDebugLog("🚀 [Base] Starting mint (COLLECTOR PAYS)...")
      addDebugLog(`📝 Wallet: ${address}`)
      addDebugLog(`📝 Contract: ${contractAddress}`)
      addDebugLog(`📝 Token ID: ${tokenId}`)
      addDebugLog(`📝 Quantity: ${quantity}`)
      addDebugLog(`💰 Total Cost: ${Number(totalCost) / 1e6} USDC on Base`)
      addDebugLog(`💎 Collector pays: ${Number(totalCost) / 1e6} USDC + gas`)

      // Try Zora 1155 mint pattern with ERC20 Minter
      // The minter arguments need to be encoded as:
      // (address mintTo, uint256 quantity, address tokenAddress, uint256 tokenId, uint256 totalValue, address currency, address mintReferral)

      const ERC20_MINTER_ADDRESS = "0x04E2516A2c207E84a1839755675dfd8eF6302F0a" // Zora ERC20 Minter on Base

      const minterArguments = encodeFunctionData({
        abi: [
          {
            inputs: [
              { name: "mintTo", type: "address" },
              { name: "quantity", type: "uint256" },
              { name: "tokenAddress", type: "address" },
              { name: "tokenId", type: "uint256" },
              { name: "totalValue", type: "uint256" },
              { name: "currency", type: "address" },
              { name: "mintReferral", type: "address" },
            ],
            name: "mint",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "mint",
        args: [
          address, // mintTo
          BigInt(quantity), // quantity
          contractAddress, // tokenAddress
          BigInt(tokenId), // tokenId
          totalCost, // totalValue
          USDC_ADDRESS, // currency
          "0x0000000000000000000000000000000000000000", // mintReferral (zero address)
        ],
      })

      addDebugLog(`📦 Encoded minter arguments: ${minterArguments}`)
      addDebugLog(`🎯 Calling mint on contract with ERC20 Minter...`)

      mintToken({
        address: contractAddress,
        abi: ZORA_1155_ABI,
        functionName: "mint",
        args: [ERC20_MINTER_ADDRESS, BigInt(tokenId), BigInt(quantity), minterArguments],
      })
    } catch (error: any) {
      addDebugLog(`❌ Error minting: ${error.message}`)
      addDebugLog(`❌ Error details: ${JSON.stringify(error, null, 2)}`)
      setMintError(`Error al mintear: ${error.message}`)
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
                        <p className="text-red-600 text-sm whitespace-pre-line">{mintError}</p>
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
                          onClick={() => {
                            setJustCollected(false)
                            setMintError(null)
                            setIsApproved(false)
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
                              setIsApproved(false)
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
                              setIsApproved(false)
                            }}
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                          <p className="text-blue-800 font-semibold">
                            💰 Total: {Number(PRICE_PER_TOKEN * BigInt(quantity)) / 1e6} USDC + gas
                          </p>
                          <p className="text-blue-600 text-xs mt-1">El coleccionista paga todo en Base</p>
                        </div>

                        {!isApproved ? (
                          <Button
                            onClick={handleApprove}
                            disabled={!isConnected || isApproving}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {!isConnected
                              ? "Conecta tu Wallet"
                              : isApproving
                                ? "Aprobando USDC..."
                                : `Aprobar ${Number(PRICE_PER_TOKEN * BigInt(quantity)) / 1e6} USDC`}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleMint}
                            disabled={!isConnected || isMinting}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {!isConnected
                              ? "Conecta tu Wallet"
                              : isMinting
                                ? "Minteando..."
                                : `Mintear ${quantity} edición${quantity > 1 ? "es" : ""}`}
                          </Button>
                        )}

                        <p className="text-xs text-center text-gray-500">
                          💎 Pagas {Number(PRICE_PER_TOKEN * BigInt(quantity)) / 1e6} USDC + gas en Base
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
                      <span className="text-gray-500">Hash:</span>
                      <p className="font-mono text-xs text-gray-800 break-all">{mintHash}</p>
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
