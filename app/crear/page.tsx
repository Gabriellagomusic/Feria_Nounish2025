"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useState } from "react"

export default function CrearPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateMoment = async () => {
    setIsLoading(true)

    try {
      const payload = {
        contract: {
          name: "Feria Nounish Moment",
          uri: "https://arweave.net/placeholder123",
        },
        token: {
          tokenMetadataURI: "https://arweave.net/placeholder456",
          createReferral: "0x1234567890123456789012345678901234567890",
          salesConfig: {
            type: "fixedPrice",
            pricePerToken: "100000000000000000", // 0.1 ETH in wei
            saleStart: 1717200000,
            saleEnd: 18446744073709551615,
          },
          mintToCreatorCount: 1,
        },
        account: "0x0987654321098765432109876543210987654321",
      }

      console.log("[v0] Calling API with payload:", payload)

      const response = await fetch("https://inprocess.fun/api/moment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      console.log("[v0] API Response:", data)

      if (response.ok) {
        alert(
          `¡Momento creado exitosamente!\nContract: ${data.contractAddress}\nToken ID: ${data.tokenId}\nHash: ${data.hash}`,
        )
      } else {
        alert(`Error al crear momento: ${data.message || "Error desconocido"}`)
      }
    } catch (error) {
      console.error("[v0] Error calling API:", error)
      alert(`Error de conexión: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

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
            className="bg-red-500 text-white hover:bg-red-600 font-semibold px-8 py-4 text-lg min-w-[140px] shadow-lg disabled:opacity-50"
            onClick={handleCreateMoment}
            disabled={isLoading}
          >
            {isLoading ? "Creando..." : "Crear"}
          </Button>
        </div>
      </div>
    </div>
  )
}
