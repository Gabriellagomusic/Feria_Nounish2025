import type React from "react"
import type { Metadata } from "next"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

const ERC1155_ABI = [
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "uri",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const

export async function generateMetadata({
  params,
}: {
  params: { contractAddress: string; tokenId: string }
}): Promise<Metadata> {
  const { contractAddress, tokenId } = params

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    })

    const tokenURI = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: ERC1155_ABI,
      functionName: "uri",
      args: [BigInt(tokenId)],
    })

    if (tokenURI) {
      let metadataUrl = tokenURI.replace("{id}", tokenId)
      if (metadataUrl.startsWith("ar://")) {
        metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
      }

      const response = await fetch(metadataUrl)
      if (response.ok) {
        const metadata = await response.json()

        let imageUrl = metadata.image
        if (imageUrl?.startsWith("ipfs://")) {
          imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
        } else if (imageUrl?.startsWith("ar://")) {
          imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
        }

        return {
          title: `${metadata.name || `Obra de Arte #${tokenId}`} | Feria Nounish`,
          description: metadata.description || "Obra de arte digital única de la Feria Nounish",
          openGraph: {
            title: metadata.name || `Obra de Arte #${tokenId}`,
            description: metadata.description || "Obra de arte digital única de la Feria Nounish",
            images: [
              {
                url: imageUrl || "/placeholder.svg",
                width: 1200,
                height: 1200,
                alt: metadata.name || `Obra de Arte #${tokenId}`,
              },
            ],
          },
          twitter: {
            card: "summary_large_image",
            title: metadata.name || `Obra de Arte #${tokenId}`,
            description: metadata.description || "Obra de arte digital única de la Feria Nounish",
            images: [imageUrl || "/placeholder.svg"],
          },
        }
      }
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
  }

  return {
    title: `Obra de Arte #${tokenId} | Feria Nounish`,
    description: "Obra de arte digital única de la Feria Nounish",
    openGraph: {
      title: `Obra de Arte #${tokenId}`,
      description: "Obra de arte digital única de la Feria Nounish",
      images: ["/placeholder.svg"],
    },
  }
}

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children
}
