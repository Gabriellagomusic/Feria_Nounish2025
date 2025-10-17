"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import Link from "next/link"
import { User } from "lucide-react"
import { isWhitelisted } from "@/lib/whitelist"

export default function Home() {
  const { setFrameReady, isFrameReady, address } = useMiniKit()
  const [isUserWhitelisted, setIsUserWhitelisted] = useState(false)

  useEffect(() => {
    console.log("[v0] Initializing MiniApp...")
    console.log("[v0] isFrameReady:", isFrameReady)

    if (!isFrameReady) {
      console.log("[v0] Calling setFrameReady()")
      setFrameReady()
      console.log("[v0] MiniApp frame ready called successfully")
    }
  }, [isFrameReady, setFrameReady])

  useEffect(() => {
    console.log("[v0] Landing - Wallet address:", address)
    console.log("[v0] Landing - Address lowercase:", address?.toLowerCase())
    const whitelisted = isWhitelisted(address)
    console.log("[v0] Landing - Is whitelisted:", whitelisted)
    setIsUserWhitelisted(whitelisted)
  }, [address])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <Image src="/images/fondolanding.png" alt="Background" fill className="object-cover" priority />

      {isUserWhitelisted && (
        <div className="absolute top-4 right-4 z-20">
          <Link href="/perfil">
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all shadow-lg"
              aria-label="Ver perfil"
            >
              <User className="w-6 h-6 text-white" />
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

        {/* Smaller Buttons Side by Side */}
        <div className="flex flex-row gap-4 items-center mb-8">
          <Link href="/galeria">
            <Button
              size="default"
              className="bg-white text-black hover:bg-gray-100 font-semibold px-6 py-3 text-base min-w-[120px] shadow-lg"
            >
              GALERÍA
            </Button>
          </Link>

          {isUserWhitelisted && (
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

        <p className="text-white text-center text-sm md:text-base max-w-2xl px-4">
          ¡DESCUBRE LA COLECCIÓN OFICIAL DE NFTS DE LOS ARTISTAS DE LA FERIA NOUNISH
          <br />
          2025 EN CALI COLOMBIA!
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md z-50">
            <p className="font-bold mb-2">Debug Info:</p>
            <p>Address: {address || "No conectada"}</p>
            <p>Whitelisted: {isUserWhitelisted ? "Sí" : "No"}</p>
            <p>Frame Ready: {isFrameReady ? "Sí" : "No"}</p>
          </div>
        )}
      </div>
    </div>
  )
}
