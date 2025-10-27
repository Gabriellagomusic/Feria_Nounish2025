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
        name: "Contract Error",
        description: `Failed to call uri() function: ${contractError instanceof Error ? contractError.message : String(contractError)}`,
        image: "",
        error: `Contract call failed: ${contractError instanceof Error ? contractError.message : String(contractError)}`,
      }
    }

    if (!metadataUri || metadataUri.trim() === "") {
      console.error("[v0] Metadata - Empty URI returned from contract")
      return {
        name: "Empty URI",
        description: "Contract returned an empty metadata URI",
        image: "",
        error: "Empty URI from contract",
      }
    }

    // Convert IPFS/Arweave URIs to gateway URLs
    const gatewayUrl = convertToGatewayUrl(metadataUri)
    console.log("[v0] Metadata - Gateway URL:", gatewayUrl)

    // Fetch the metadata JSON
    let response: Response
    try {
      response = await fetch(gatewayUrl)
      console.log("[v0] Metadata - Fetch response status:", response.status)
      console.log("[v0] Metadata - Response headers:")
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`)
      })
    } catch (fetchError) {
      console.error("[v0] Metadata - Fetch failed:", fetchError)
      return {
        name: "Fetch Error",
        description: `Failed to fetch metadata: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        image: "",
        error: `Fetch failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
      }
    }

    if (!response.ok) {
      console.error("[v0] Metadata - Bad response:", response.status, response.statusText)
      return {
        name: "HTTP Error",
        description: `HTTP ${response.status}: ${response.statusText}`,
        image: "",
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const contentType = response.headers.get("content-type")
    console.log("[v0] Metadata - Content-Type:", contentType)

    // Try to parse as JSON regardless of content-type
    let metadata: any
    try {
      const text = await response.text()
      console.log("[v0] Metadata - Full response text:", text)
      console.log("[v0] Metadata - Response length:", text.length)
      console.log("[v0] Metadata - First character code:", text.charCodeAt(0))

      metadata = JSON.parse(text)
      console.log("[v0] Metadata - Parsed successfully:", metadata)
    } catch (parseError) {
      console.error("[v0] Metadata - JSON parse failed:", parseError)
      const text = await response.clone().text()
      return {
        name: "Parse Error",
        description: `Failed to parse metadata JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        image: "",
        error: `JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}. Response was: ${text.substring(0, 500)}`,
      }
    }

    return {
      name: metadata.name || "Untitled",
      description: metadata.description || "",
      image: convertToGatewayUrl(metadata.image || ""),
    }
  } catch (error) {
    console.error("[v0] Metadata - Unexpected error:", error)
    return {
      name: "Unknown Error",
      description: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      image: "",
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
