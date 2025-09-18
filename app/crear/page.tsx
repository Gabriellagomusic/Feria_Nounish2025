"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function CrearPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image src="/images/fondos2.png" alt="Fondo colorido abstracto" fill className="object-cover" priority />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-balance">Crear</h1>

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
