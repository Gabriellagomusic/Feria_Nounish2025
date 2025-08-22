"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useEffect } from "react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"

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
      <div className="absolute inset-0 z-0">
        <Image src="/images/fondos2.png" alt="Fondo colorido abstracto" fill className="object-cover" priority />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo */}
        <div className="mb-12">
          <Image
            src="/images/feria-logo.png"
            alt="Feria Nounish Logo"
            width={400}
            height={200}
            className="w-auto h-32 md:h-40 lg:h-48"
            priority
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <Button
            size="lg"
            className="bg-white text-black hover:bg-gray-100 font-semibold px-8 py-4 text-lg min-w-[140px] shadow-lg"
          >
            Galería
          </Button>

          <Button
            size="lg"
            className="bg-red-500 text-white hover:bg-red-600 font-semibold px-8 py-4 text-lg min-w-[140px] shadow-lg"
          >
            Crear
          </Button>
        </div>
      </div>
    </div>
  )
}
