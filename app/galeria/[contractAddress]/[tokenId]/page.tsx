"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { createPublicClient, http, parseUnits, type Address, parseEther } from "viem"
import { base } from "viem/chains"
import { useAccount, useWriteContract, useConnect } from "wagmi"
import { ArrowLeft, Plus, Minus, ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import { getDisplayName } from "@/lib/farcaster"
import { ShareToFarcasterButton } from "@/components/share/ShareToFarcasterButton"
import { getTimeline, type Moment } from "@/lib/inprocess"
import { useMiniKit } from "@coinbase/onchainkit/minikit"

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address
const ZORA_ERC20_MINTER = "0xE27d9Dc88dAB82ACa3ebC49895c663C6a0CfA014" as Address

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

const ZORA_ERC20_MINTER_ABI = [{"inputs":[],"name":"AddressZero","type":"error"},{"inputs":[],"name":"ERC20TransferSlippage","type":"error"},{"inputs":[],"name":"FailedToSendEthReward","type":"error"},{"inputs":[],"name":"INITIALIZABLE_CONTRACT_ALREADY_INITIALIZED","type":"error"},{"inputs":[],"name":"INITIALIZABLE_CONTRACT_IS_NOT_INITIALIZING","type":"error"},{"inputs":[],"name":"InvalidCurrency","type":"error"},{"inputs":[{"internalType":"uint256","name":"expectedValue","type":"uint256"},{"internalType":"uint256","name":"actualValue","type":"uint256"}],"name":"InvalidETHValue","type":"error"},{"inputs":[],"name":"InvalidValue","type":"error"},{"inputs":[],"name":"ONLY_OWNER","type":"error"},{"inputs":[],"name":"ONLY_PENDING_OWNER","type":"error"},{"inputs":[],"name":"OWNER_CANNOT_BE_ZERO_ADDRESS","type":"error"},{"inputs":[],"name":"PricePerTokenTooLow","type":"error"},{"inputs":[],"name":"RequestMintInvalidUseMint","type":"error"},{"inputs":[],"name":"SaleEnded","type":"error"},{"inputs":[],"name":"SaleHasNotStarted","type":"error"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"limit","type":"uint256"},{"internalType":"uint256","name":"requestedAmount","type":"uint256"}],"name":"UserExceedsMintLimit","type":"error"},{"inputs":[],"name":"WrongValueSent","type":"error"},{"anonymous":false,"inputs":[{"components":[{"internalType":"address","name":"zoraRewardRecipientAddress","type":"address"},{"internalType":"uint256","name":"rewardRecipientPercentage","type":"uint256"},{"internalType":"uint256","name":"ethReward","type":"uint256"}],"indexed":false,"internalType":"struct IERC20Minter.ERC20MinterConfig","name":"config","type":"tuple"}],"name":"ERC20MinterConfigSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"createReferral","type":"address"},{"indexed":true,"internalType":"address","name":"mintReferral","type":"address"},{"indexed":true,"internalType":"address","name":"firstMinter","type":"address"},{"indexed":false,"internalType":"address","name":"zora","type":"address"},{"indexed":false,"internalType":"address","name":"collection","type":"address"},{"indexed":false,"internalType":"address","name":"currency","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"createReferralReward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"mintReferralReward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"firstMinterReward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"zoraReward","type":"uint256"}],"name":"ERC20RewardsDeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"tokenContract","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"quantity","type":"uint256"},{"indexed":false,"internalType":"string","name":"comment","type":"string"}],"name":"MintComment","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"canceledOwner","type":"address"}],"name":"OwnerCanceled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"pendingOwner","type":"address"}],"name":"OwnerPending","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"prevOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnerUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"mediaContract","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"components":[{"internalType":"uint64","name":"saleStart","type":"uint64"},{"internalType":"uint64","name":"saleEnd","type":"uint64"},{"internalType":"uint64","name":"maxTokensPerAddress","type":"uint64"},{"internalType":"uint256","name":"pricePerToken","type":"uint256"},{"internalType":"address","name":"fundsRecipient","type":"address"},{"internalType":"address","name":"currency","type":"address"}],"indexed":false,"internalType":"struct IERC20Minter.SalesConfig","name":"salesConfig","type":"tuple"}],"name":"SaleSet","type":"event"},{"inputs":[],"name":"acceptOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"uint64","name":"duration","type":"uint64"},{"internalType":"uint64","name":"maxTokensPerAddress","type":"uint64"},{"internalType":"uint256","name":"pricePerToken","type":"uint256"},{"internalType":"address","name":"fundsRecipient","type":"address"},{"internalType":"address","name":"currency","type":"address"}],"internalType":"struct IERC20Minter.PremintSalesConfig","name":"config","type":"tuple"}],"name":"buildSalesConfigForPremint","outputs":[{"components":[{"internalType":"uint64","name":"saleStart","type":"uint64"},{"internalType":"uint64","name":"saleEnd","type":"uint64"},{"internalType":"uint64","name":"maxTokensPerAddress","type":"uint64"},{"internalType":"uint256","name":"pricePerToken","type":"uint256"},{"internalType":"address","name":"fundsRecipient","type":"address"},{"internalType":"address","name":"currency","type":"address"}],"internalType":"struct IERC20Minter.SalesConfig","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"cancelOwnershipTransfer","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"totalReward","type":"uint256"}],"name":"computePaidMintRewards","outputs":[{"components":[{"internalType":"uint256","name":"createReferralReward","type":"uint256"},{"internalType":"uint256","name":"mintReferralReward","type":"uint256"},{"internalType":"uint256","name":"zoraReward","type":"uint256"},{"internalType":"uint256","name":"firstMinterReward","type":"uint256"}],"internalType":"struct IERC20Minter.RewardsSettings","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"totalReward","type":"uint256"},{"internalType":"uint256","name":"rewardPct","type":"uint256"}],"name":"computeReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"totalValue","type":"uint256"}],"name":"computeTotalReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"contractName","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"contractURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"contractVersion","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"ethRewardAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenContract","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getCreateReferral","outputs":[{"internalType":"address","name":"createReferral","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getERC20MinterConfig","outputs":[{"components":[{"internalType":"address","name":"zoraRewardRecipientAddress","type":"address"},{"internalType":"uint256","name":"rewardRecipientPercentage","type":"uint256"},{"internalType":"uint256","name":"ethReward","type":"uint256"}],"internalType":"struct IERC20Minter.ERC20MinterConfig","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenContract","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getFirstMinter","outputs":[{"internalType":"address","name":"firstMinter","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenContract","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"address","name":"wallet","type":"address"}],"name":"getMintedPerWallet","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_zoraRewardRecipientAddress","type":"address"},{"internalType":"address","name":"_owner","type":"address"},{"internalType":"uint256","name":"_rewardPct","type":"uint256"},{"internalType":"uint256","name":"_ethReward","type":"uint256"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"mintTo","type":"address"},{"internalType":"uint256","name":"quantity","type":"uint256"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"totalValue","type":"uint256"},{"internalType":"address","name":"currency","type":"address"},{"internalType":"address","name":"mintReferral","type":"address"},{"internalType":"string","name":"comment","type":"string"}],"name":"mint","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"minterConfig","outputs":[{"internalType":"address","name":"zoraRewardRecipientAddress","type":"address"},{"internalType":"uint256","name":"rewardRecipientPercentage","type":"uint256"},{"internalType":"uint256","name":"ethReward","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pendingOwner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"requestMint","outputs":[{"components":[{"components":[{"internalType":"enum ICreatorCommands.CreatorActions","name":"method","type":"uint8"},{"internalType":"bytes","name":"args","type":"bytes"}],"internalType":"struct ICreatorCommands.Command[]","name":"commands","type":"tuple[]"},{"internalType":"uint256","name":"at","type":"uint256"}],"internalType":"struct ICreatorCommands.CommandSet","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"resetSale","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"resignOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newOwner","type":"address"}],"name":"safeTransferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenContract","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"sale","outputs":[{"components":[{"internalType":"uint64","name":"saleStart","type":"uint64"},{"internalType":"uint64","name":"saleEnd","type":"uint64"},{"internalType":"uint64","name":"maxTokensPerAddress","type":"uint64"},{"internalType":"uint256","name":"pricePerToken","type":"uint256"},{"internalType":"address","name":"fundsRecipient","type":"address"},{"internalType":"address","name":"currency","type":"address"}],"internalType":"struct IERC20Minter.SalesConfig","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"zoraRewardRecipientAddress","type":"address"},{"internalType":"uint256","name":"rewardRecipientPercentage","type":"uint256"},{"internalType":"uint256","name":"ethReward","type":"uint256"}],"internalType":"struct IERC20Minter.ERC20MinterConfig","name":"config","type":"tuple"}],"name":"setERC20MinterConfig","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"encodedPremintSalesConfig","type":"bytes"}],"name":"setPremintSale","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"components":[{"internalType":"uint64","name":"saleStart","type":"uint64"},{"internalType":"uint64","name":"saleEnd","type":"uint64"},{"internalType":"uint64","name":"maxTokensPerAddress","type":"uint64"},{"internalType":"uint256","name":"pricePerToken","type":"uint256"},{"internalType":"address","name":"fundsRecipient","type":"address"},{"internalType":"address","name":"currency","type":"address"}],"internalType":"struct IERC20Minter.SalesConfig","name":"salesConfig","type":"tuple"}],"name":"setSale","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"totalRewardPct","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}] as const

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
  {
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "user", type: "address" },
      { name: "permissionBits", type: "uint256" },
    ],
    name: "addPermission",
    outputs: [],
    stateMutability: "nonpayable",
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

const ERC20_MINTER_SET_SALE_ABI = [
  {
    name: "setSale",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenContract", type: "address" },
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
    outputs: [],
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

  const grantMinterPermission = async () => {
    if (!address) throw new Error("No wallet connected")

    addDebugLog("========== GRANTING MINTER PERMISSION ==========", "info")
    addDebugLog("🔑 Granting ERC20 Minter permission on main contract...", "info")
    addDebugLog("⚠️ IMPORTANT: You must APPROVE this transaction in your wallet!", "warning")
    addDebugLog("⚠️ This allows the ERC20 Minter to mint tokens on your contract.", "warning")
    addDebugLog(`📍 Main Contract: ${contractAddress}`, "info")
    addDebugLog(`📍 ERC20 Minter: ${ZORA_ERC20_MINTER}`, "info")
    addDebugLog(`🔢 Permission Bits: 4 (PERMISSION_BIT_MINTER)`, "info")

    const hash = await writeContractAsync({
      address: contractAddress,
      abi: ZORA_1155_ABI,
      functionName: "addPermission",
      args: [
        BigInt(0), // tokenId 0 = contract-level permission
        ZORA_ERC20_MINTER,
        BigInt(4), // PERMISSION_BIT_MINTER = 2^2 = 4
      ],
    })

    addDebugLog(`✅ Permission grant tx sent: ${hash}`, "success")
    addDebugLog("⏳ Waiting for confirmation...", "info")

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === "success") {
      addDebugLog("✅ Minter permission granted successfully!", "success")
      return true
    } else {
      addDebugLog("❌ Permission grant transaction failed", "error")
      return false
    }
  }

  const setupSalesConfigDirectly = async () => {
    if (!address) throw new Error("No wallet connected")

    addDebugLog("========== WALLET ADDRESS VERIFICATION ==========", "info")
    addDebugLog(`🔐 Connected wallet address: ${address}`, "info")
    addDebugLog(`💰 This address will receive the funds from sales`, "info")
    addDebugLog("========================================", "info")

    addDebugLog("========== STEP 1: GRANT MINTER PERMISSION ==========", "info")
    try {
      const permissionGranted = await grantMinterPermission()
      if (!permissionGranted) {
        throw new Error("Failed to grant minter permission")
      }
    } catch (permissionError: any) {
      addDebugLog(`❌ Error granting permission: ${permissionError.message}`, "error")
      throw new Error(`Failed to grant minter permission: ${permissionError.message}`)
    }

    addDebugLog("========== STEP 2: SET UP SALES CONFIG ==========", "info")
    addDebugLog("📝 Calling setSale on ERC20 Minter contract...", "info")
    addDebugLog("⚠️ IMPORTANT: You must APPROVE this transaction in your wallet!", "warning")
    addDebugLog("⚠️ This configures the price and currency for minting.", "warning")

    const priceInWei = parseUnits("1", 6) // 1 USDC (6 decimals)

    addDebugLog(`💰 Price: 1 USDC per token`, "info")
    addDebugLog(`💵 Currency: USDC (${USDC_ADDRESS})`, "info")
    addDebugLog(`👤 Funds recipient (YOUR wallet): ${address}`, "info")
    addDebugLog(`📍 ERC20 Minter: ${ZORA_ERC20_MINTER}`, "info")

    const hash = await writeContractAsync({
      address: ZORA_ERC20_MINTER,
      abi: ERC20_MINTER_SET_SALE_ABI,
      functionName: "setSale",
      args: [
        contractAddress,
        BigInt(tokenId),
        {
          saleStart: BigInt(0),
          saleEnd: BigInt("18446744073709551615"),
          maxTokensPerAddress: BigInt(0),
          pricePerToken: priceInWei,
          fundsRecipient: address, // This is the connected wallet from useAccount()
          currency: USDC_ADDRESS,
        },
      ],
    })

    addDebugLog(`✅ Transaction sent: ${hash}`, "success")
    addDebugLog("⏳ Waiting for confirmation...", "info")

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.status === "success") {
      addDebugLog("✅ Sales config set up successfully!", "success")
      addDebugLog("🎉 ERC20 minting is now enabled with 1 USDC per token", "success")
      return true
    } else {
      addDebugLog("❌ Transaction failed", "error")
      return false
    }
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
    addDebugLog(`🔐 Connected wallet (from MiniKit/Farcaster): ${address}`, "info")
    addDebugLog(`🎨 Contract: ${contractAddress}`, "info")
    addDebugLog(`🎫 Token ID: ${tokenId}`, "info")
    addDebugLog(`🔢 Quantity: ${quantity}`, "info")
    addDebugLog(`👑 Is owner: ${isOwner}`, "info")

    if (!address) {
      setMintError("Por favor conecta tu wallet primero")
      addDebugLog("❌ No wallet address found - please connect wallet", "error")
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
      const salesConfig = await checkSalesConfig()

      if (!salesConfig) {
        addDebugLog("❌ No ERC20 sales config found for this token", "error")

        if (isOwner) {
          addDebugLog("⚠️ You are the owner. Attempting to set up ERC20 minting...", "warning")

          try {
            const setupSuccess = await setupSalesConfigDirectly()

            if (!setupSuccess) {
              setMintError("Failed to set up sales config. Please check the debug logs for details.")
              setIsMinting(false)
              return
            }

            // Recheck sales config after setup
            addDebugLog("🔄 Rechecking sales config after setup...", "info")
            const newSalesConfig = await checkSalesConfig()

            if (!newSalesConfig) {
              setMintError("Sales config setup completed but verification failed. Please try minting again.")
              setIsMinting(false)
              return
            }

            addDebugLog("✅ Sales config verified! Continuing with mint...", "success")
          } catch (setupError: any) {
            addDebugLog(`❌ Error setting up sales config: ${setupError.message}`, "error")

            if (setupError.message?.includes("User rejected")) {
              setMintError(
                "You rejected the sales config setup transaction. Please try again and approve it to enable ERC20 minting.",
              )
            } else {
              setMintError(
                `Failed to set up sales config: ${setupError.message}\n\nAlternatively, you can set it up manually at https://zora.co`,
              )
            }

            setIsMinting(false)
            return
          }
        } else {
          addDebugLog("⚠️ This token doesn't have ERC20 minting configured", "warning")
          addDebugLog("⚠️ Please contact the artist to set it up", "warning")
          setMintError("Este token no tiene configurado ERC20 minting. Contacta al artista.")
          setIsMinting(false)
          return
        }
      }

      addDebugLog("✅ Sales config found!", "success")
      addDebugLog(`💰 Price: ${Number(salesConfig.pricePerToken) / 1e6} USDC`, "info")
      addDebugLog(`💵 Currency: ${salesConfig.currency}`, "info")
      addDebugLog(`👤 Funds recipient: ${salesConfig.fundsRecipient}`, "info")

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

      addDebugLog("📤 Sending mint transaction...", "info")
      const hash = await writeContractAsync({
        address: ZORA_ERC20_MINTER,
        abi: ZORA_ERC20_MINTER_ABI,
        functionName: "mint",
        args: [address,BigInt(quantity), contractAddress, BigInt(tokenId), pricePerToken, USDC_ADDRESS,"0x0000000000000000000000000000000000000000", "Collected via Feria Nounish on Base!"],
        value: parseEther('0'),
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

  const checkSalesConfig = async () => {
    try {
      addDebugLog("🔍 Checking sales config for token...", "info")
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      console.log("SWEETS TOKEN", tokenId)
      console.log("SWEETS CONTRACT", contractAddress)

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
