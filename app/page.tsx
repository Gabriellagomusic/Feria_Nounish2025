"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useEffect } from "react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import Link from "next/link"

export default function Home() {
  const { setFrameReady, isFrameReady } = useMiniKit()

  useEffect(() => {
    console.log("[v0] Initializing MiniApp...")
    console.log("[v0] isFrameReady:", isFrameReady)

    if (!isFrameReady) {
      console.log("[v0] Calling setFrameReady()")
      setFrameReady()
      console.log("[v0] MiniApp frame ready called successfully")
    }
  }, [isFrameReady, setFrameReady])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <Image src="/images/fondolanding.png" alt="Background" fill className="object-cover" priority />

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
