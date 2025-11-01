"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { createPublicClient, http, parseUnits, type Address, encodeFunctionData } from "viem"
import { base } from "viem/chains"
import { useAccount, useWriteContract, useConnect } from "wagmi"
import { ArrowLeft, Plus, Minus, ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
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

interface DebugLog {
  timestamp: string
  message: string
  type: "info" | "success" | "error" | "warning"
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

  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [copiedLogs, setCopiedLogs] = useState(false)

  const addDebugLog = (message: string, type: DebugLog["type"] = "info") => {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
    const log = { timestamp, message, type }
    setDebugLogs((prev) => [...prev, log])
    console.log(`[v0] ${message}`)
  }

  const copyLogsToClipboard = async () => {
    const logsText = debugLogs.map((log) => `[${log.timestamp}] ${log.message}`).join("\n")

    try {
      await navigator.clipboard.writeText(logsText)
      setCopiedLogs(true)
      setTimeout(() => setCopiedLogs(false), 2000)
    } catch (error) {
      console.error("Failed to copy logs:", error)
    }
  }

  const isExperimentalMusicToken =
    contractAddress.toLowerCase() === "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5" && tokenId === "1"

  useEffect(() => {
    if (!isFrameReady && !frameReadyCalledRef.current) {
      addDebugLog("Initializing MiniKit frame", "info")
      frameReadyCalledRef.current = true
      setFrameReady()
    }
  }, [isFrameReady, setFrameReady])

  useEffect(() => {
    if (isFrameReady && !isConnected && !connectAttemptedRef.current && connectors.length > 0) {
      const farcasterConnector = connectors.find((c) => c.name === "Farcaster")
      if (farcasterConnector) {
        addDebugLog("Auto-connecting wallet via Farcaster", "info")
        connectAttemptedRef.current = true
        connect({ connector: farcasterConnector })
      }
    }
  }, [isFrameReady, isConnected, connectors, connect])

  // Removed initial mount and connection status logs

  // Removed quantity change log

  const checkSalesConfig = async () => {
    try {
      addDebugLog("🔍 Checking sales config for token...", "info")
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

      addDebugLog(
        `📊 Sales Config: ${JSON.stringify({
          saleStart: salesConfig.saleStart.toString(),
          saleEnd: salesConfig.saleEnd.toString(),
          maxTokensPerAddress: salesConfig.maxTokensPerAddress.toString(),
          pricePerToken: salesConfig.pricePerToken.toString(),
          pricePerTokenUSDC: `${Number(salesConfig.pricePerToken) / 1e6} USDC`,
          fundsRecipient: salesConfig.fundsRecipient,
          currency: salesConfig.currency,
        })}`,
        "info",
      )

      // Check if sales config is valid
      if (salesConfig.currency === "0x0000000000000000000000000000000000000000") {
        addDebugLog("❌ No ERC20 sales config found for this token", "error")
        return null
      }

      addDebugLog("✅ Valid sales config found", "success")
      return salesConfig
    } catch (error: any) {
      addDebugLog(`❌ Error checking sales config: ${error.message}`, "error")
      return null
    }
  }

  const setupSalesConfig = async () => {
    if (!address) throw new Error("No wallet connected")

    addDebugLog("🔧 Setting up sales config...", "info")
    addDebugLog(`👤 Wallet address: ${address}`, "info")
    addDebugLog(`🎨 Contract address: ${contractAddress}`, "info")
    addDebugLog(`🎫 Token ID: ${tokenId}`, "info")

    const salesConfigData = {
      saleStart: BigInt(0),
      saleEnd: BigInt("18446744073709551615"),
      maxTokensPerAddress: BigInt(0),
      pricePerToken: parseUnits("1", 6),
      fundsRecipient: address,
      currency: USDC_ADDRESS,
    }

    addDebugLog(
      `📝 Sales config data: ${JSON.stringify({
        saleStart: salesConfigData.saleStart.toString(),
        saleEnd: salesConfigData.saleEnd.toString(),
        maxTokensPerAddress: salesConfigData.maxTokensPerAddress.toString(),
        pricePerToken: salesConfigData.pricePerToken.toString(),
        fundsRecipient: salesConfigData.fundsRecipient,
        currency: salesConfigData.currency,
      })}`,
      "info",
    )

    const setSaleData = encodeFunctionData({
      abi: [
        {
          inputs: [
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
          name: "setSale",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "setSale",
      args: [BigInt(tokenId), salesConfigData],
    })

    addDebugLog(`📦 Encoded setSale data: ${setSaleData}`, "info")

    addDebugLog("⚠️ IMPORTANT: Please APPROVE the transaction in your wallet to set up ERC20 minting", "warning")
    addDebugLog("📤 Sending callSale transaction...", "info")

    const hash = await writeContractAsync({
      address: contractAddress,
      abi: ZORA_1155_ABI,
      functionName: "callSale",
      args: [BigInt(tokenId), ZORA_ERC20_MINTER, setSaleData],
    })

    addDebugLog(`✅ Sales config setup tx hash: ${hash}`, "success")

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    })

    addDebugLog("⏳ Waiting for transaction confirmation...", "info")
    await publicClient.waitForTransactionReceipt({ hash })
    addDebugLog("✅ Sales config setup confirmed!", "success")
  }

  const approveUSDC = async (amount: bigint) => {
    if (!address) throw new Error("No wallet connected")

    addDebugLog("💳 Approving USDC...", "info")
    addDebugLog(`💰 Amount to approve: ${Number(amount) / 1e6} USDC`, "info")

    const hash = await writeContractAsync({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ZORA_ERC20_MINTER, amount],
    })

    addDebugLog(`✅ USDC approval tx hash: ${hash}`, "success")

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    })

    addDebugLog("⏳ Waiting for approval confirmation...", "info")
    await publicClient.waitForTransactionReceipt({ hash })
    addDebugLog("✅ USDC approval confirmed!", "success")
  }

  const handleMint = async () => {
    addDebugLog("========== STARTING MINT FLOW ==========", "info")
    addDebugLog(`👤 Connected wallet: ${address}`, "info")
    addDebugLog(`🎨 Contract: ${contractAddress}`, "info")
    addDebugLog(`🎫 Token ID: ${tokenId}`, "info")
    addDebugLog(`🔢 Quantity: ${quantity}`, "info")
    addDebugLog(`👑 Is owner: ${isOwner}`, "info")

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
      addDebugLog("========== STEP 1: CHECK SALES CONFIG ==========", "info")
      let salesConfig = await checkSalesConfig()

      if (!salesConfig) {
        addDebugLog("⚠️ No sales config found", "warning")
        if (!isOwner) {
          addDebugLog("❌ User is not owner, cannot setup sales config", "error")
          throw new Error("Este token no tiene configurado ERC20 minting. Contacta al artista.")
        }

        addDebugLog("✅ User is owner, setting up sales config...", "success")
        addDebugLog("📢 IMPORTANT: You will be prompted to approve a transaction to set up ERC20 minting.", "warning")
        addDebugLog("📢 This is a ONE-TIME setup. Please APPROVE the transaction in your wallet.", "warning")
        addDebugLog("📢 After this setup, anyone will be able to mint this token with USDC.", "info")
        addDebugLog("📢 If you REJECT the transaction, the minting process will fail.", "warning")

        await setupSalesConfig()

        addDebugLog("🔄 Re-checking sales config after setup...", "info")
        salesConfig = await checkSalesConfig()

        if (!salesConfig) {
          addDebugLog("❌ Sales config still not found after setup", "error")
          throw new Error("Error configurando sales config")
        }
      }

      const pricePerToken = salesConfig.pricePerToken || parseUnits("1", 6)
      const totalCost = pricePerToken * BigInt(quantity)

      addDebugLog(`💰 Price per token: ${Number(pricePerToken) / 1e6} USDC`, "info")
      addDebugLog(`💰 Total cost: ${Number(totalCost) / 1e6} USDC`, "info")

      // Step 2: Check USDC balance
      addDebugLog("========== STEP 2: CHECK USDC BALANCE ==========", "info")
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })

      addDebugLog(`💵 USDC balance: ${Number(balance) / 1e6} USDC`, "info")

      if (balance < totalCost) {
        addDebugLog("❌ Insufficient USDC balance", "error")
        throw new Error(
          `Balance insuficiente. Necesitas ${Number(totalCost) / 1e6} USDC pero tienes ${Number(balance) / 1e6} USDC`,
        )
      }

      addDebugLog("✅ Sufficient USDC balance", "success")

      // Step 3: Check and approve USDC if needed
      addDebugLog("========== STEP 3: CHECK USDC ALLOWANCE ==========", "info")
      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, ZORA_ERC20_MINTER],
      })

      addDebugLog(`💳 Current allowance: ${Number(allowance) / 1e6} USDC`, "info")

      if (allowance < totalCost) {
        addDebugLog("⚠️ Insufficient allowance, need to approve", "warning")
        const approvalAmount = totalCost * BigInt(2) // Approve 2x for future mints
        addDebugLog(`💳 Approving: ${Number(approvalAmount) / 1e6} USDC`, "info")
        await approveUSDC(approvalAmount)
      } else {
        addDebugLog("✅ Sufficient allowance already exists", "success")
      }

      // Step 4: Mint
      addDebugLog("========== STEP 4: MINT ==========", "info")
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
        `📤 Mint Arguments: ${JSON.stringify({
          tokenContract: mintArgs.tokenContract,
          tokenId: mintArgs.tokenId.toString(),
          mintTo: mintArgs.mintTo,
          quantity: mintArgs.quantity.toString(),
          currency: mintArgs.currency,
          pricePerToken: `${Number(mintArgs.pricePerToken) / 1e6} USDC`,
          mintReferral: mintArgs.mintReferral,
          comment: mintArgs.comment,
        })}`,
        "info",
      )

      addDebugLog("📤 Sending mint transaction...", "info")
      const hash = await writeContractAsync({
        address: ZORA_ERC20_MINTER,
        abi: ZORA_ERC20_MINTER_ABI,
        functionName: "mint",
        args: [mintArgs],
      })

      setMintHash(hash)
      addDebugLog(`✅ Mint tx hash: ${hash}`, "success")

      addDebugLog("⏳ Waiting for mint confirmation...", "info")
      await publicClient.waitForTransactionReceipt({ hash })
      addDebugLog("✅ Mint confirmed!", "success")
      addDebugLog("========== MINT FLOW COMPLETE ==========", "success")

      setJustCollected(true)
      setIsMinting(false)
      await checkContractState()
    } catch (error: any) {
      addDebugLog("========== MINT FLOW ERROR ==========", "error")
      addDebugLog(`❌ Error: ${error}`, "error")
      addDebugLog(`❌ Error message: ${error.message}`, "error")

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
      addDebugLog(`Error checking ownership: ${error}`, "error")
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
      addDebugLog(`Error checking contract state: ${error}`, "error")
    }
  }

  // Removed checkUSDCAllowance, approveUSDC (now part of handleMint)

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      setIsLoading(true)
      addDebugLog("Fetching token metadata...", "info")

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
          addDebugLog("Token metadata fetched successfully", "success")

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
                addDebugLog(`Artist found: ${displayName} (${moment.admin})`, "info")
              } else {
                const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
                setCreator(fallbackCreator)
                const displayName = await getDisplayName(fallbackCreator)
                setArtistName(displayName)
                addDebugLog(
                  `Artist not found in timeline, using fallback: ${displayName} (${fallbackCreator})`,
                  "warning",
                )
              }
            } else {
              const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
              setCreator(fallbackCreator)
              setArtistName(await getDisplayName(fallbackCreator))
              addDebugLog(`Timeline empty, using fallback artist: ${await getDisplayName(fallbackCreator)}`, "warning")
            }
          } catch (error) {
            addDebugLog(`Error fetching artist from inprocess after retries: ${error}`, "error")
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
        addDebugLog("Token URI not found, using fallback data", "warning")
      } catch (error) {
        addDebugLog(`Error fetching token metadata after retries: ${error}`, "error")
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

              <Card>
                <CardContent className="p-4">
                  <button
                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <span>Debug Logs ({debugLogs.length})</span>
                    {showDebugPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showDebugPanel && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-end">
                        <Button
                          onClick={copyLogsToClipboard}
                          variant="outline"
                          size="sm"
                          className="text-xs bg-transparent"
                        >
                          {copiedLogs ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Logs
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="max-h-96 overflow-y-auto bg-gray-900 rounded-lg p-3 space-y-1">
                        {debugLogs.length === 0 ? (
                          <p className="text-gray-400 text-xs">No logs yet...</p>
                        ) : (
                          debugLogs.map((log, index) => (
                            <div
                              key={index}
                              className={`text-xs font-mono ${
                                log.type === "error"
                                  ? "text-red-400"
                                  : log.type === "success"
                                    ? "text-green-400"
                                    : log.type === "warning"
                                      ? "text-yellow-400"
                                      : "text-gray-300"
                              }`}
                            >
                              <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
