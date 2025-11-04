"use client"

import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { useState } from "react"

interface ShareToBaseappButtonProps {
  mode: "add" | "collect"
  pieceId: string
  pieceTitle?: string
  contractAddress: string
  tokenId: string
  artistUsername?: string
  onShareComplete?: () => void
}

export function ShareToBaseappButton({
  mode,
  pieceId,
  pieceTitle,
  contractAddress,
  tokenId,
  artistUsername,
  onShareComplete,
}: ShareToBaseappButtonProps) {
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

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      if (isMobile) {
        const baseappUrl = `baseapp://share?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pieceUrl)}`
        window.location.href = baseappUrl

        setTimeout(() => {
          openWebShare(text, pieceUrl)
        }, 1500)
      } else {
        openWebShare(text, pieceUrl)
      }

      onShareComplete?.()
    } catch (error) {
      console.error("[v0] Error sharing to Baseapp:", error)

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

      openWebShare(text, pieceUrl)
    } finally {
      setIsSharing(false)
    }
  }

  const openWebShare = async (text: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Feria Nounish",
          text: text,
          url: url,
        })
        return
      } catch (error) {
        // User cancelled or share failed, continue to fallback
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n\n${url}`)
      alert("¡Enlace copiado! Compártelo en Baseapp")
    } catch (error) {
      window.open(url, "_blank")
    }
  }

  return (
    <Button
      onClick={handleShare}
      disabled={isSharing}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
      size="sm"
    >
      <Share2 className="w-4 h-4 mr-2" />
      {isSharing ? "Compartiendo..." : "Compartir en Baseapp"}
    </Button>
  )
}
