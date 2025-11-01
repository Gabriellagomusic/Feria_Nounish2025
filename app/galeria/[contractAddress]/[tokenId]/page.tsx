"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { createPublicClient, http, parseUnits, type Address, encodeAbiParameters } from "viem"
import { base } from "viem/chains"
import { useAccount, useWriteContract, useConnect } from "wagmi"
import { ArrowLeft, Plus, Minus } from "lucide-react"
import { getDisplayName } from "@/lib/farcaster"
import { ShareToFarcasterButton } from "@/components/share/ShareToFarcasterButton"
import { getTimeline, type Moment } from "@/lib/inprocess"
import { useMiniKit } from "@coinbase/onchainkit/minikit"

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address
const ZORA_ERC20_MINTER = "0x777777E8850d8D6d98De2B5f64fae401F96eFF31" as Address

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
  {
    inputs: [
      { name: "tokenContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "sale",
    outputs: [
      {
        components: [
          { name: "saleStart", type: "uint64" },
          { name: "saleEnd", type: "uint64" },
          { name: "maxTokensPerAddress", type: "uint64" },
          { name: "pricePerToken", type: "uint96" },
          { name: "fundsRecipient", type: "address" },
          { name: "currency", type: "address" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const

const ZORA_1155_ABI = [
  {
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "salesConfig", type: "address" },
      { name: "salesConfigData", type: "bytes" },
    ],
    name: "callSale",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const

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

interface TokenMetadata {
  name: string
  description: string
  image: string
  creator?: string
}

async function fetchWithRetry<T>(fetchFn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
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
  const { writeContractAsync } = useWriteContract()

  const frameReadyCalledRef = useRef(false)
  const connectAttemptedRef = useRef(false)

  const [tokenData, setTokenData] = useState<TokenMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [creator, setCreator] = useState<string>("")
  const [artistName, setArtistName] = useState<string>("")
  const [justCollected, setJustCollected] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [mintError, setMintError] = useState<string | null>(null)
  const [mintHash, setMintHash] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [contractInfo, setContractInfo] = useState<{
    userBalance: string
    totalSupply: string
  } | null>(null)

  // Removed unused states: debugInfo, showDebugPanel, persistentLogs, isApproving, approvalHash, needsApproval, isSettingSalesConfig

  const isExperimentalMusicToken =
    contractAddress.toLowerCase() === "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5" && tokenId === "1"

  useEffect(() => {
    if (!isFrameReady && !frameReadyCalledRef.current) {
      console.log("[v0] Initializing MiniKit frame")
      frameReadyCalledRef.current = true
      setFrameReady()
    }
  }, [isFrameReady, setFrameReady])

  useEffect(() => {
    if (isFrameReady && !isConnected && !connectAttemptedRef.current && connectors.length > 0) {
      const farcasterConnector = connectors.find((c) => c.name === "Farcaster")
      if (farcasterConnector) {
        console.log("[v0] Auto-connecting wallet via Farcaster")
        connectAttemptedRef.current = true
        connect({ connector: farcasterConnector })
      }
    }
  }, [isFrameReady, isConnected, connectors, connect])

  // Removed initial mount and connection status logs

  // Removed quantity change log

  const checkSalesConfig = async () => {
    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const salesConfig = await publicClient.readContract({
        address: ZORA_ERC20_MINTER,
        abi: ZORA_ERC20_MINTER_ABI,
        functionName: "sale",
        args: [contractAddress, BigInt(tokenId)],
      })

      // Check if sales config is valid
      if (salesConfig.currency === "0x0000000000000000000000000000000000000000") {
        return null
      }

      return salesConfig
    } catch (error: any) {
      console.error("[v0] Error checking sales config:", error)
      return null
    }
  }

  const setupSalesConfig = async () => {
    if (!address) throw new Error("No wallet connected")

    console.log("[v0] Setting up sales config...")

    const salesConfigData = {
      saleStart: BigInt(0),
      saleEnd: BigInt("18446744073709551615"),
      maxTokensPerAddress: BigInt(0),
      pricePerToken: parseUnits("1", 6),
      fundsRecipient: address,
      currency: USDC_ADDRESS,
    }

    const setSaleData = encodeAbiParameters(
      [
        { name: "tokenId", type: "uint256" },
        {
          name: "salesConfig",
          type: "tuple",
          components: [
            { name: "saleStart", type: "uint64" },
            { name: "saleEnd", type: "uint64" },
            { name: "maxTokensPerAddress", type: "uint64" },
            { name: "pricePerToken", type: "uint96" },
            { name: "fundsRecipient", type: "address" },
            { name: "currency", type: "address" },
          ],
        },
      ],
      [BigInt(tokenId), salesConfigData],
    )

    const hash = await writeContractAsync({
      address: contractAddress,
      abi: ZORA_1155_ABI,
      functionName: "callSale",
      args: [BigInt(tokenId), ZORA_ERC20_MINTER, setSaleData],
    })

    console.log("[v0] Sales config setup tx:", hash)

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    })

    await publicClient.waitForTransactionReceipt({ hash })
    console.log("[v0] Sales config setup confirmed")
  }

  const approveUSDC = async (amount: bigint) => {
    if (!address) throw new Error("No wallet connected")

    console.log("[v0] Approving USDC...")

    const hash = await writeContractAsync({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ZORA_ERC20_MINTER, amount],
    })

    console.log("[v0] USDC approval tx:", hash)

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    })

    await publicClient.waitForTransactionReceipt({ hash })
    console.log("[v0] USDC approval confirmed")
  }

  const handleMint = async () => {
    console.log("[v0] ========== STARTING MINT FLOW ==========")

    if (!address) {
      setMintError("Por favor conecta tu wallet primero")
      return
    }

    try {
      setMintError(null)
      setIsMinting(true)
      setMintHash(null)

      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      // Step 1: Check sales config
      console.log("[v0] Step 1: Checking sales config...")
      let salesConfig = await checkSalesConfig()

      if (!salesConfig) {
        if (!isOwner) {
          throw new Error("Este token no tiene configurado ERC20 minting. Contacta al artista.")
        }

        console.log("[v0] No sales config found, setting up...")
        await setupSalesConfig()
        salesConfig = await checkSalesConfig()

        if (!salesConfig) {
          throw new Error("Error configurando sales config")
        }
      }

      const pricePerToken = salesConfig.pricePerToken || parseUnits("1", 6)
      const totalCost = pricePerToken * BigInt(quantity)

      console.log("[v0] Price per token:", Number(pricePerToken) / 1e6, "USDC")
      console.log("[v0] Total cost:", Number(totalCost) / 1e6, "USDC")

      // Step 2: Check USDC balance
      console.log("[v0] Step 2: Checking USDC balance...")
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })

      if (balance < totalCost) {
        throw new Error(
          `Balance insuficiente. Necesitas ${Number(totalCost) / 1e6} USDC pero tienes ${Number(balance) / 1e6} USDC`,
        )
      }

      // Step 3: Check and approve USDC if needed
      console.log("[v0] Step 3: Checking USDC allowance...")
      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, ZORA_ERC20_MINTER],
      })

      if (allowance < totalCost) {
        console.log("[v0] Insufficient allowance, approving...")
        await approveUSDC(totalCost * BigInt(2)) // Approve 2x for future mints
      }

      // Step 4: Mint
      console.log("[v0] Step 4: Minting...")
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

      const hash = await writeContractAsync({
        address: ZORA_ERC20_MINTER,
        abi: ZORA_ERC20_MINTER_ABI,
        functionName: "mint",
        args: [mintArgs],
      })

      setMintHash(hash)
      console.log("[v0] Mint tx:", hash)

      await publicClient.waitForTransactionReceipt({ hash })
      console.log("[v0] Mint confirmed!")

      setJustCollected(true)
      setIsMinting(false)
      await checkContractState()
    } catch (error: any) {
      console.error("[v0] Mint error:", error)

      let errorMessage = error.message || "Error desconocido"

      if (errorMessage.includes("User rejected")) {
        errorMessage = "Transacción rechazada por el usuario"
      } else if (errorMessage.includes("insufficient")) {
        errorMessage = "Balance insuficiente de USDC o ETH para gas"
      }

      setMintError(errorMessage)
      setIsMinting(false)
    }
  }

  const checkOwnership = async () => {
    if (!address) return

    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const owner = await publicClient.readContract({
        address: contractAddress,
        abi: ZORA_1155_ABI,
        functionName: "owner",
      })

      setIsOwner(owner.toLowerCase() === address.toLowerCase())
    } catch (error: any) {
      console.error("[v0] Error checking ownership:", error)
    }
  }

  const checkContractState = async () => {
    if (!address || !isExperimentalMusicToken) return

    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const [userBalance, totalSupply] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: ERC1155_ABI,
          functionName: "balanceOf",
          args: [address, BigInt(tokenId)],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: ERC1155_ABI,
          functionName: "totalSupply",
          args: [BigInt(tokenId)],
        }),
      ])

      setContractInfo({
        userBalance: userBalance.toString(),
        totalSupply: totalSupply.toString(),
      })
    } catch (error: any) {
      console.error("[v0] Error checking contract state:", error)
    }
  }

  // Removed checkUSDCAllowance, approveUSDC (now part of handleMint)

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
    if (address) {
      checkOwnership()
    }
  }, [address])

  useEffect(() => {
    if (address && isExperimentalMusicToken) {
      checkContractState()
    }
  }, [address, isExperimentalMusicToken])

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
                          {isOwner && (
                            <p className="text-blue-600 text-xs mt-1">
                              🔧 Si no hay sales config, se configurará automáticamente
                            </p>
                          )}
                        </div>

                        <Button
                          onClick={handleMint}
                          disabled={!isConnected || isMinting}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {!isConnected ? "Conecta tu Wallet" : isMinting ? "Coleccionando..." : "Coleccionar"}
                        </Button>

                        <p className="text-xs text-center text-gray-500">💳 Pagas {quantity} USDC + gas en Base</p>
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
