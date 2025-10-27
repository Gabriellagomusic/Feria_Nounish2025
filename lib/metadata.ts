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

    let tokenURI: string
    try {
      tokenURI = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ERC1155_ABI,
        functionName: "uri",
        args: [BigInt(tokenId)],
      })) as string
      console.log("[v0] Metadata - Token URI from contract:", tokenURI)
    } catch (contractError) {
      console.error("[v0] Metadata - Contract call failed:", contractError)
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

    const metadataResponse = await fetch(metadataUrl)
    console.log("[v0] Metadata - Fetch response status:", metadataResponse.status)

    if (!metadataResponse.ok) {
      console.error("[v0] Metadata - Bad response:", metadataResponse.status, metadataResponse.statusText)
      return {
        name: `Token #${tokenId}`,
        description: `HTTP ${metadataResponse.status}: ${metadataResponse.statusText}`,
        image: "",
        error: `HTTP ${metadataResponse.status}: ${metadataResponse.statusText}`,
      }
    }

    const metadata = await metadataResponse.json()
    console.log("[v0] Metadata - Parsed metadata:", metadata)

    let imageUrl = metadata.image
    if (imageUrl?.startsWith("ipfs://")) {
      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
    } else if (imageUrl?.startsWith("ar://")) {
      imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
    }

    return {
      name: metadata.name || `Token #${tokenId}`,
      description: metadata.description || "NFT from Feria Nounish",
      image: imageUrl || "/placeholder.svg",
    }
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
