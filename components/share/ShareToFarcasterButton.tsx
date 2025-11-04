"use client"

import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { useState } from "react"

interface ShareToFarcasterButtonProps {
  mode: "add" | "collect"
  pieceId: string
  pieceTitle?: string
  contractAddress: string
  tokenId: string
  artistUsername?: string
  onShareComplete?: () => void
}

export function ShareToFarcasterButton({
  mode,
  pieceId,
  pieceTitle,
  contractAddress,
  tokenId,
  artistUsername,
  onShareComplete,
}: ShareToFarcasterButtonProps) {
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)

    try {
      const baseUrl =
        typeof window !== "undefined" && window.location.hostname === "localhost"
          ? "https://ferianounish.vercel.app"
          : window.location.origin

      const pieceUrl = `${baseUrl}/galeria/${contractAddress}/${tokenId}`

      const artistTag = artistUsername ? ` by @${artistUsername}` : ""

      let text = ""
      if (mode === "add") {
        text = pieceTitle
          ? `Mira mi nueva pieza para la Feria Nounish! "${pieceTitle}"${artistTag}`
          : `Mira mi nueva pieza para la Feria Nounish!${artistTag}`
      } else {
        text = pieceTitle
          ? `¡Mira la pieza de la Feria Nounish que acabo de coleccionar! "${pieceTitle}"${artistTag}`
          : `¡Mira la pieza de la Feria Nounish que acabo de coleccionar!${artistTag}`
      }

      const isMiniKitContext =
        (typeof window !== "undefined" && (window as any).ethereum?.isMiniPay) ||
        (window as any).ethereum?.isCoinbaseWallet ||
        window.location.ancestorOrigins?.[0]?.includes("farcaster") ||
        window.location.ancestorOrigins?.[0]?.includes("warpcast")

      if (isMiniKitContext) {
        const farcasterUrl = `farcaster://compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(pieceUrl)}`
        window.location.href = farcasterUrl

        setTimeout(() => {
          openWarpcastComposer(text, pieceUrl)
        }, 1500)

        onShareComplete?.()
      } else {
        openWarpcastComposer(text, pieceUrl)
      }
    } catch (error) {
      console.error("[v0] Error sharing to Farcaster:", error)

      const baseUrl =
        typeof window !== "undefined" && window.location.hostname === "localhost"
          ? "https://ferianounish.vercel.app"
          : window.location.origin

      const pieceUrl = `${baseUrl}/galeria/${contractAddress}/${tokenId}`
      const artistTag = artistUsername ? ` by @${artistUsername}` : ""

      let text = ""
      if (mode === "add") {
        text = pieceTitle
          ? `Mira mi nueva pieza para la Feria Nounish! "${pieceTitle}"${artistTag}`
          : `Mira mi nueva pieza para la Feria Nounish!${artistTag}`
      } else {
        text = pieceTitle
          ? `¡Mira la pieza de la Feria Nounish que acabo de coleccionar! "${pieceTitle}"${artistTag}`
          : `¡Mira la pieza de la Feria Nounish que acabo de coleccionar!${artistTag}`
      }

      openWarpcastComposer(text, pieceUrl)
    } finally {
      setIsSharing(false)
    }
  }

  const openWarpcastComposer = (text: string, embedUrl: string) => {
    const composerUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embedUrl)}`
    window.open(composerUrl, "_blank")
    onShareComplete?.()
  }

  return (
    <Button
      onClick={handleShare}
      disabled={isSharing}
      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
      size="sm"
    >
      <Share2 className="w-4 h-4 mr-2" />
      {isSharing ? "Compartiendo..." : "Compartir en Farcaster"}
    </Button>
  )
}
