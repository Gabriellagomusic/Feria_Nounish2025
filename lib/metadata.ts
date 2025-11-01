import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const ERC1155_ABI = [
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "uri",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const

export interface TokenMetadata {
  name: string
  description: string
  image: string
  error?: string
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
        console.log(`[v0] Metadata - Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Failed after retries")
}

const metadataCache = new Map<string, { data: TokenMetadata; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCachedMetadata(key: string): TokenMetadata | null {
  const cached = metadataCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("[v0] Metadata - Using cached data for:", key)
    return cached.data
  }
  return null
}

function setCachedMetadata(key: string, data: TokenMetadata): void {
  metadataCache.set(key, { data, timestamp: Date.now() })
}

function convertToGatewayUrl(uri: string): string {
  if (uri.startsWith("ar://")) {
    return uri.replace("ar://", "https://arweave.net/")
  } else if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/")
  }
  return uri
}

export async function fetchTokenMetadata(contractAddress: string, tokenId: string): Promise<TokenMetadata | null> {
  const cacheKey = `${contractAddress}-${tokenId}`
  const cached = getCachedMetadata(cacheKey)
  if (cached) {
    return cached
  }

  try {
    console.log("[v0] Metadata - Starting fetch for token:", tokenId, "contract:", contractAddress)

    let tokenURI: string
    try {
      tokenURI = await fetchWithRetry(async () => {
        return (await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ERC1155_ABI,
          functionName: "uri",
          args: [BigInt(tokenId)],
        })) as string
      })
      console.log("[v0] Metadata - Token URI from contract:", tokenURI)
    } catch (contractError) {
      console.error("[v0] Metadata - Contract call failed after retries:", contractError)
      return {
        name: `Token #${tokenId}`,
        description: "Failed to fetch metadata from contract",
        image: "",
        error: `Contract call failed: ${contractError instanceof Error ? contractError.message : String(contractError)}`,
      }
    }

    if (!tokenURI || tokenURI.trim() === "") {
      console.error("[v0] Metadata - Empty URI returned from contract")
      return {
        name: `Token #${tokenId}`,
        description: "Contract returned an empty metadata URI",
        image: "",
        error: "Empty URI from contract",
      }
    }

    let metadataUrl = tokenURI.replace("{id}", tokenId)

    if (metadataUrl.startsWith("ar://")) {
      metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
    } else if (metadataUrl.startsWith("ipfs://")) {
      metadataUrl = metadataUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
    }

    console.log("[v0] Metadata - Final metadata URL:", metadataUrl)

    const metadataResponse = await fetchWithRetry(async () => {
      const response = await fetch(metadataUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return response
    })

    console.log("[v0] Metadata - Fetch response status:", metadataResponse.status)

    const contentType = metadataResponse.headers.get("content-type") || ""
    console.log("[v0] Metadata - Content-Type:", contentType)

    if (contentType.startsWith("image/")) {
      console.log("[v0] Metadata - Response is an image, using URL as image source")
      const result = {
        name: `Token #${tokenId}`,
        description: "NFT from Feria Nounish",
        image: metadataUrl,
        error: "Metadata URI points to image instead of JSON",
      }
      setCachedMetadata(cacheKey, result)
      return result
    }

    const responseText = await metadataResponse.text()
    console.log("[v0] Metadata - Response text (first 500 chars):", responseText.substring(0, 500))

    let metadata
    try {
      metadata = JSON.parse(responseText)
      console.log("[v0] Metadata - Parsed metadata:", metadata)
    } catch (parseError) {
      console.error("[v0] Metadata - JSON parse failed:", parseError)

      if (
        responseText.charCodeAt(0) === 0xff ||
        responseText.charCodeAt(0) === 0x89 ||
        responseText.startsWith("\uFFFD")
      ) {
        console.log("[v0] Metadata - Response appears to be binary image data")
        const result = {
          name: `Token #${tokenId}`,
          description: "NFT from Feria Nounish",
          image: metadataUrl,
          error: `Failed to parse metadata JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        }
        setCachedMetadata(cacheKey, result)
        return result
      }

      return {
        name: `Token #${tokenId}`,
        description: "Failed to parse metadata JSON",
        image: "",
        error: `JSON.parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      }
    }

    let imageUrl = metadata.image
    if (imageUrl?.startsWith("ipfs://")) {
      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
    } else if (imageUrl?.startsWith("ar://")) {
      imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
    }

    const result = {
      name: metadata.name || `Token #${tokenId}`,
      description: metadata.description || "NFT from Feria Nounish",
      image: imageUrl || "/placeholder.svg",
    }

    setCachedMetadata(cacheKey, result)
    return result
  } catch (error) {
    console.error("[v0] Metadata - Unexpected error:", error)
    return {
      name: `Token #${tokenId}`,
      description: "Failed to fetch metadata",
      image: "",
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
