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
    console.log("[v0] Fetching metadata for token:", tokenId, "from contract:", contractAddress)

    // Call the contract's uri() function to get the metadata URI
    const metadataUri = (await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: ERC1155_ABI,
      functionName: "uri",
      args: [BigInt(tokenId)],
    })) as string

    console.log("[v0] Metadata URI from contract:", metadataUri)

    // Convert IPFS/Arweave URIs to gateway URLs
    const gatewayUrl = convertToGatewayUrl(metadataUri)
    console.log("[v0] Gateway URL:", gatewayUrl)

    // Fetch the metadata JSON
    const response = await fetch(gatewayUrl)

    if (!response.ok) {
      console.error("[v0] Metadata fetch failed:", response.status, response.statusText)
      return null
    }

    const contentType = response.headers.get("content-type")
    console.log("[v0] Metadata response content-type:", contentType)

    // Check if the response is JSON
    if (!contentType?.includes("application/json")) {
      console.error("[v0] Metadata response is not JSON, content-type:", contentType)
      return null
    }

    const metadata = (await response.json()) as TokenMetadata
    console.log("[v0] Metadata fetched successfully:", metadata.name)

    return {
      name: metadata.name || "Untitled",
      description: metadata.description || "",
      image: convertToGatewayUrl(metadata.image),
    }
  } catch (error) {
    console.error("[v0] Error fetching token metadata:", error)
    return null
  }
}
