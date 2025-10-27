"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useEffect, useState, useRef } from "react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import { useAccount, useConnect } from "wagmi"
import Link from "next/link"
import { getNounAvatarUrl } from "@/lib/noun-avatar"
import { getFarcasterProfilePic } from "@/lib/farcaster"

export default function Home() {
  const { setFrameReady, isFrameReady } = useMiniKit()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)

  const frameReadyCalledRef = useRef(false)
  const connectAttemptedRef = useRef(false)

  useEffect(() => {
    if (!isFrameReady && !frameReadyCalledRef.current) {
      console.log("[v0] Calling setFrameReady() once")
      frameReadyCalledRef.current = true
      setFrameReady()
    }
  }, [isFrameReady, setFrameReady])

  useEffect(() => {
    if (isFrameReady && !isConnected && !connectAttemptedRef.current && connectors.length > 0) {
      const farcasterConnector = connectors.find((c) => c.name === "Farcaster")
      if (farcasterConnector) {
        console.log("[v0] Auto-connecting to Farcaster connector once")
        connectAttemptedRef.current = true
        connect({ connector: farcasterConnector })
      }
    }
  }, [isFrameReady, isConnected, connectors, connect])

  useEffect(() => {
    const fetchProfilePic = async () => {
      if (!address) {
        setProfilePicUrl(null)
        return
      }

      try {
        console.log("[v0] Landing - Fetching Farcaster profile pic for:", address)
        const picUrl = await getFarcasterProfilePic(address)
        setProfilePicUrl(picUrl)
        console.log("[v0] Landing - Profile pic URL:", picUrl)
      } catch (error) {
        console.error("[v0] Landing - Error fetching profile pic:", error)
        setProfilePicUrl(null)
      }
    }

    fetchProfilePic()
  }, [address])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-fixed-parallax">
        <Image src="/images/fondolanding.png" alt="Background" fill className="object-cover" priority unoptimized />
      </div>

      <div className="absolute top-4 right-4 z-20">
        <Link href="/perfil">
          <button
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all shadow-lg overflow-hidden border-2 border-white/40"
            aria-label="Ver perfil"
          >
            <Image
              src={
                profilePicUrl || (address ? getNounAvatarUrl(address) : getNounAvatarUrl("0x0")) || "/placeholder.svg"
              }
              alt="Profile"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </button>
        </Link>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="mb-12">
          <Image
            src="/images/logolanding.png"
            alt="Feria Nounish Logo"
            width={400}
            height={400}
            className="w-auto h-32 md:h-40 lg:h-48"
            priority
          />
        </div>

        <div className="flex flex-row gap-4 items-center mb-8">
          <Link href="/galeria">
            <Button
              size="default"
              className="bg-white text-black hover:bg-gray-100 font-semibold px-6 py-3 text-base min-w-[120px] shadow-lg"
            >
              GALERÍA
            </Button>
          </Link>

          <Link href="/crear">
            <Button
              size="default"
              className="font-semibold px-6 py-3 text-base min-w-[120px] shadow-lg text-white hover:opacity-90"
              style={{ backgroundColor: "#FF0B00" }}
            >
              CREAR
            </Button>
          </Link>
        </div>

        <p className="text-white text-center text-sm md:text-base max-w-2xl px-4">
          ¡DESCUBRE LA COLECCIÓN OFICIAL DE NFTS DE LOS ARTISTAS DE LA FERIA NOUNISH
          <br />
          2025 EN CALI COLOMBIA!
        </p>
      </div>
    </div>
  )
}
