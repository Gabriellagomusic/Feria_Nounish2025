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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ferianounish.vercel.app"
  const tokenUrl = `${baseUrl}/galeria/${contractAddress}/${tokenId}`

  let imageUrl = `${baseUrl}/placeholder.svg`
  let tokenName = `Obra de Arte #${tokenId}`
  let tokenDescription = "Obra de arte digital única de la Feria Nounish"

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
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch(metadataUrl, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (response.ok) {
          const metadata = await response.json()

          if (metadata.name) tokenName = metadata.name
          if (metadata.description) tokenDescription = metadata.description

          if (metadata.image) {
            imageUrl = metadata.image
            if (imageUrl.startsWith("ipfs://")) {
              imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
            } else if (imageUrl.startsWith("ar://")) {
              imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
            }
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

  return {
    title: `${tokenName} | Feria Nounish`,
    description: tokenDescription,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: tokenName,
      description: tokenDescription,
      url: tokenUrl,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 1200,
          alt: tokenName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: tokenName,
      description: tokenDescription,
      images: [imageUrl],
    },
    alternates: {
      canonical: tokenUrl,
    },
    other: {
      "fc:frame": "vNext",
      "fc:frame:image": imageUrl,
      "fc:frame:image:aspect_ratio": "1:1",
      "fc:frame:button:1": "Ver Token",
      "fc:frame:button:1:action": "link",
      "fc:frame:button:1:target": tokenUrl,
      "fc:frame:button:2": "Coleccionar",
      "fc:frame:button:2:action": "link",
      "fc:frame:button:2:target": tokenUrl,
      "fc:frame:post_url": `${baseUrl}/api/frame`,

      // Open Frames metadata for broader compatibility
      "of:version": "vNext",
      "of:accepts:farcaster": "vNext",
      "of:image": imageUrl,
      "of:image:aspect_ratio": "1:1",
      "of:button:1": "Ver Token",
      "of:button:1:action": "link",
      "of:button:1:target": tokenUrl,
      "of:button:2": "Coleccionar",
      "of:button:2:action": "link",
      "of:button:2:target": tokenUrl,
    },
  }
}

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children
}
