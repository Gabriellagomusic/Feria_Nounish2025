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
  onShareComplete?: () => void
}

export function ShareToFarcasterButton({
  mode,
  pieceId,
  pieceTitle,
  contractAddress,
  tokenId,
  onShareComplete,
}: ShareToFarcasterButtonProps) {
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)

    try {
      const pieceUrl = `${window.location.origin}/galeria/${contractAddress}/${tokenId}`

      let text = ""
      if (mode === "add") {
        text = pieceTitle
          ? `Mira mi nueva pieza para la Feria Nounish! "${pieceTitle}" ${pieceUrl}`
          : `Mira mi nueva pieza para la Feria Nounish! ${pieceUrl}`
      } else {
        text = pieceTitle
          ? `¡Mira la pieza de la Feria Nounish que acabo de coleccionar! "${pieceTitle}" ${pieceUrl}`
          : `¡Mira la pieza de la Feria Nounish que acabo de coleccionar! ${pieceUrl}`
      }

      const isMiniKitContext =
        (typeof window !== "undefined" && (window as any).ethereum?.isMiniPay) ||
        (window as any).ethereum?.isCoinbaseWallet ||
        window.location.ancestorOrigins?.[0]?.includes("farcaster") ||
        window.location.ancestorOrigins?.[0]?.includes("warpcast")

      if (isMiniKitContext) {
        // Try programmatic posting via API
        const response = await fetch("/api/farcaster/cast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            embeds: [pieceUrl],
          }),
        })

        const data = await response.json()

        if (data.ok) {
          alert("¡Publicado en Farcaster exitosamente!")
          onShareComplete?.()
          return
        }
      }

      if (isMiniKitContext) {
        const farcasterUrl = `farcaster://compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(pieceUrl)}`
        window.location.href = farcasterUrl
        onShareComplete?.()
      } else {
        // Fallback to Warpcast composer for web browsers
        openWarpcastComposer(text, pieceUrl)
      }
    } catch (error) {
      console.error("[v0] Error sharing to Farcaster:", error)

      const pieceUrl = `${window.location.origin}/galeria/${contractAddress}/${tokenId}`
      let text = ""
      if (mode === "add") {
        text = pieceTitle
          ? `Mira mi nueva pieza para la Feria Nounish! "${pieceTitle}"`
          : `Mira mi nueva pieza para la Feria Nounish!`
      } else {
        text = pieceTitle
          ? `¡Mira la pieza de la Feria Nounish que acabo de coleccionar! "${pieceTitle}"`
          : `¡Mira la pieza de la Feria Nounish que acabo de coleccionar!`
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
