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
  params: Promise<{ contractAddress: string; tokenId: string }>
}): Promise<Metadata> {
  const { contractAddress, tokenId } = await params

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

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      try {
        const response = await fetch(metadataUrl, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (response.ok) {
          const metadata = await response.json()

          let imageUrl = metadata.image
          if (imageUrl?.startsWith("ipfs://")) {
            imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
          } else if (imageUrl?.startsWith("ar://")) {
            imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
          }

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ferianounish.vercel.app"
          const canonicalUrl = `${baseUrl}/galeria/${contractAddress}/${tokenId}`

          return {
            title: `${metadata.name || `Obra de Arte #${tokenId}`} | Feria Nounish`,
            description: metadata.description || "Obra de arte digital única de la Feria Nounish",
            metadataBase: new URL(baseUrl),
            openGraph: {
              title: metadata.name || `Obra de Arte #${tokenId}`,
              description: metadata.description || "Obra de arte digital única de la Feria Nounish",
              url: canonicalUrl,
              type: "website",
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
            alternates: {
              canonical: canonicalUrl,
            },
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.error("Error fetching metadata:", fetchError)
      }
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ferianounish.vercel.app"
  const fallbackUrl = `${baseUrl}/galeria/${contractAddress}/${tokenId}`

  return {
    title: `Obra de Arte #${tokenId} | Feria Nounish`,
    description: "Obra de arte digital única de la Feria Nounish",
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: `Obra de Arte #${tokenId}`,
      description: "Obra de arte digital única de la Feria Nounish",
      url: fallbackUrl,
      type: "website",
      images: ["/placeholder.svg"],
    },
    alternates: {
      canonical: fallbackUrl,
    },
  }
}

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children
}
