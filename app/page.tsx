"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import { useAccount } from "wagmi"
import Link from "next/link"
import { getNounAvatarUrl } from "@/lib/noun-avatar"

export default function Home() {
  const { setFrameReady, isFrameReady } = useMiniKit()
  const { address, isConnected } = useAccount()
  const [isWhitelisted, setIsWhitelisted] = useState(false)
  const [isCheckingWhitelist, setIsCheckingWhitelist] = useState(true)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)

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
  }, [isFrameReady, setFrameReady, isConnected, address])

  useEffect(() => {
    const checkWhitelist = async () => {
      if (!address) {
        setIsWhitelisted(false)
        setIsCheckingWhitelist(false)
        return
      }

      try {
        console.log("[v0] Checking whitelist for address:", address)
        const response = await fetch(`/api/whitelist/check?address=${address}`)
        const data = await response.json()

        console.log("[v0] Whitelist response:", data)
        setIsWhitelisted(data.isWhitelisted || false)
      } catch (error) {
        console.error("[v0] Error checking whitelist:", error)
        setIsWhitelisted(false)
      } finally {
        setIsCheckingWhitelist(false)
      }
    }

    checkWhitelist()
  }, [address])

  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!address) {
        setProfilePicture(null)
        return
      }

      try {
        console.log("[v0] Fetching Farcaster profile picture for:", address)
        const response = await fetch(`/api/farcaster/pfp?address=${address}`)
        const data = await response.json()

        if (data.pfpUrl) {
          console.log("[v0] Farcaster pfp found:", data.pfpUrl)
          setProfilePicture(data.pfpUrl)
        } else {
          console.log("[v0] No Farcaster pfp found, using Noun avatar")
          setProfilePicture(getNounAvatarUrl(address))
        }
      } catch (error) {
        console.error("[v0] Error fetching profile picture:", error)
        setProfilePicture(getNounAvatarUrl(address))
      }
    }

    fetchProfilePicture()
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
                src={profilePicture || getNounAvatarUrl(address) || "/placeholder.svg"}
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

        {!isCheckingWhitelist && (
          <div className={`flex flex-row gap-4 items-center mb-8 ${!isWhitelisted ? "justify-center" : ""}`}>
            <Link href="/galeria">
              <Button
                size="default"
                className="bg-white text-black hover:bg-gray-100 font-semibold px-6 py-3 text-base min-w-[120px] shadow-lg"
              >
                GALERÍA
              </Button>
            </Link>

            {isWhitelisted && (
              <Link href="/crear">
                <Button
                  size="default"
                  className="font-semibold px-6 py-3 text-base min-w-[120px] shadow-lg text-white hover:opacity-90"
                  style={{ backgroundColor: "#FF0B00" }}
                >
                  CREAR
                </Button>
              </Link>
            )}
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
