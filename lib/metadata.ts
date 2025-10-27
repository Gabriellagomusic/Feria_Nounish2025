import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const ERC1155_ABI = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
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

function convertToGatewayUrl(uri: string): string {
  if (uri.startsWith("ar://")) {
    return uri.replace("ar://", "https://arweave.net/")
  } else if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/")
  }
  return uri
}

function isImageUrl(url: string): boolean {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]
  const lowerUrl = url.toLowerCase()
  return imageExtensions.some((ext) => lowerUrl.includes(ext))
}

export async function fetchTokenMetadata(contractAddress: string, tokenId: string): Promise<TokenMetadata | null> {
  try {
    console.log("[v0] Metadata - Starting fetch for token:", tokenId, "contract:", contractAddress)

    // Call the contract's uri() function to get the metadata URI
    let metadataUri: string
    try {
      metadataUri = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ERC1155_ABI,
        functionName: "uri",
        args: [BigInt(tokenId)],
      })) as string
      console.log("[v0] Metadata - URI from contract:", metadataUri)
    } catch (contractError) {
      console.error("[v0] Metadata - Contract call failed:", contractError)
      return {
        name: `Moment #${tokenId}`,
        description: "Inprocess Moment",
        image: "",
        error: `Contract call failed: ${contractError instanceof Error ? contractError.message : String(contractError)}`,
      }
    }

    if (!metadataUri || metadataUri.trim() === "") {
      console.error("[v0] Metadata - Empty URI returned from contract")
      return {
        name: `Moment #${tokenId}`,
        description: "Inprocess Moment",
        image: "",
        error: "Empty URI from contract",
      }
    }

    // Convert IPFS/Arweave URIs to gateway URLs
    const gatewayUrl = convertToGatewayUrl(metadataUri)
    console.log("[v0] Metadata - Gateway URL:", gatewayUrl)

    if (isImageUrl(gatewayUrl)) {
      console.log("[v0] Metadata - URI points to image file, using directly")
      return {
        name: `Moment #${tokenId}`,
        description: "Inprocess Moment",
        image: gatewayUrl,
      }
    }

    // Fetch the metadata JSON
    let response: Response
    try {
      response = await fetch(gatewayUrl)
      console.log("[v0] Metadata - Fetch response status:", response.status)
    } catch (fetchError) {
      console.error("[v0] Metadata - Fetch failed:", fetchError)
      return {
        name: `Moment #${tokenId}`,
        description: "Inprocess Moment",
        image: gatewayUrl, // Use the URI as image fallback
        error: `Fetch failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
      }
    }

    if (!response.ok) {
      console.error("[v0] Metadata - Bad response:", response.status, response.statusText)
      return {
        name: `Moment #${tokenId}`,
        description: "Inprocess Moment",
        image: gatewayUrl, // Use the URI as image fallback
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const contentType = response.headers.get("content-type")
    console.log("[v0] Metadata - Content-Type:", contentType)

    if (contentType && contentType.startsWith("image/")) {
      console.log("[v0] Metadata - Content is an image, using URL directly")
      return {
        name: `Moment #${tokenId}`,
        description: "Inprocess Moment",
        image: gatewayUrl,
      }
    }

    // Try to parse as JSON
    let metadata: any
    try {
      const text = await response.text()
      console.log("[v0] Metadata - Response text (first 200 chars):", text.substring(0, 200))
      metadata = JSON.parse(text)
      console.log("[v0] Metadata - Parsed successfully:", metadata)
    } catch (parseError) {
      console.error("[v0] Metadata - JSON parse failed, assuming URI is image")
      return {
        name: `Moment #${tokenId}`,
        description: "Inprocess Moment",
        image: gatewayUrl,
      }
    }

    return {
      name: metadata.name || `Moment #${tokenId}`,
      description: metadata.description || "Inprocess Moment",
      image: convertToGatewayUrl(metadata.image || gatewayUrl),
    }
  } catch (error) {
    console.error("[v0] Metadata - Unexpected error:", error)
    return {
      name: `Moment #${tokenId}`,
      description: "Inprocess Moment",
      image: "",
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
