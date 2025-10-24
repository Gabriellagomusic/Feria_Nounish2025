"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import { useAccount, useConnect } from "wagmi"
import Link from "next/link"
import { getNounAvatarUrl } from "@/lib/noun-avatar"
import { getFarcasterProfilePic } from "@/lib/farcaster"

export default function Home() {
  const { setFrameReady, isFrameReady } = useMiniKit()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const [isWhitelisted, setIsWhitelisted] = useState(false)
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [isCheckingWhitelist, setIsCheckingWhitelist] = useState(true)

  useEffect(() => {
    console.log("[v0] Initializing MiniApp...")
    console.log("[v0] isFrameReady:", isFrameReady)
    console.log("[v0] Wallet connected:", isConnected)
    console.log("[v0] Wallet address:", address)

    if (!isFrameReady) {
      console.log("[v0] Calling setFrameReady()")
      setFrameReady()
      console.log("[v0] MiniApp frame ready called successfully")
    }

    // Auto-connect to Farcaster connector when frame is ready and wallet is not connected
    if (isFrameReady && !isConnected && connectors.length > 0) {
      const farcasterConnector = connectors[0] // Farcaster connector should be the first one
      console.log("[v0] Auto-connecting to Farcaster connector...")
      console.log(
        "[v0] Available connectors:",
        connectors.map((c) => c.name),
      )
      connect({ connector: farcasterConnector })
    }
  }, [isFrameReady, setFrameReady, isConnected, address, connect, connectors])

  useEffect(() => {
    const checkWhitelist = async () => {
      if (!address) {
        console.log("[v0] Landing - No address, skipping whitelist check")
        setIsWhitelisted(false)
        setIsCheckingWhitelist(false)
        return
      }

      try {
        console.log("[v0] Landing - Checking whitelist for:", address)
        const response = await fetch(`/api/whitelist/check?address=${address}`)

        if (!response.ok) {
          console.error("[v0] Landing - Whitelist API error:", response.status, response.statusText)
          setIsWhitelisted(false)
          setIsCheckingWhitelist(false)
          return
        }

        const data = await response.json()
        console.log("[v0] Landing - Whitelist API response:", data)
        setIsWhitelisted(data.isWhitelisted)
        console.log("[v0] Landing - Whitelist status:", data.isWhitelisted)
      } catch (error) {
        console.error("[v0] Landing - Error checking whitelist:", error)
        setIsWhitelisted(false)
      } finally {
        setIsCheckingWhitelist(false)
      }
    }

    checkWhitelist()
  }, [address])

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
      {/* Background Image */}
      <Image src="/images/fondolanding.png" alt="Background" fill className="object-cover" priority unoptimized />

      {isWhitelisted && (
        <div className="absolute top-4 right-4 z-20">
          <Link href="/perfil">
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all shadow-lg overflow-hidden border-2 border-white/40"
              aria-label="Ver perfil"
            >
              <Image
                src={profilePicUrl || getNounAvatarUrl(address) || "/placeholder.svg"}
                alt="Profile"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </button>
          </Link>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Updated Logo */}
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

        {isCheckingWhitelist ? (
          <div className="flex justify-center items-center mb-8">
            <p className="text-white text-sm">Cargando...</p>
          </div>
        ) : isWhitelisted ? (
          // Whitelisted: Show both buttons side by side
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
        ) : (
          // Not whitelisted: Show only Galería button centered
          <div className="flex justify-center items-center mb-8">
            <Link href="/galeria">
              <Button
                size="default"
                className="bg-white text-black hover:bg-gray-100 font-semibold px-6 py-3 text-base min-w-[120px] shadow-lg"
              >
                GALERÍA
              </Button>
            </Link>
          </div>
        )}

        <p className="text-white text-center text-sm md:text-base max-w-2xl px-4">
          ¡DESCUBRE LA COLECCIÓN OFICIAL DE NFTS DE LOS ARTISTAS DE LA FERIA NOUNISH
          <br />
          2025 EN CALI COLOMBIA!
        </p>
      </div>
    </div>
  )
}
