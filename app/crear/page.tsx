"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useState } from "react"
import { uploadToArweave } from "@/app/actions/upload-to-arweave"
import { uploadJson } from "@/app/actions/upload-json"
import { useAccount } from "wagmi"

export default function CrearPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [arweaveUri, setArweaveUri] = useState<string | null>(null)

  const { address, isConnected } = useAccount()

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateMoment = async () => {
    setIsLoading(true)

    try {
      let imageUri = "https://arweave.net/placeholder123"

      if (selectedFile) {
        console.log("[v0] Uploading image to Arweave...")

        const formData = new FormData()
        formData.append("file", selectedFile)

        imageUri = await uploadToArweave(formData)
        setArweaveUri(imageUri)
        console.log("[v0] Image uploaded to Arweave:", imageUri)
      }

      const metadata = {
        name: "Feria Nounish Moment",
        description: "Un momento especial de la Feria Nounish",
        external_url: "https://feria-nounish.vercel.app",
        image: imageUri,
        animation_url: imageUri,
        content: {
          mime: selectedFile?.type || "image/jpeg",
          uri: imageUri,
        },
      }

      console.log("[v0] Uploading metadata JSON to Arweave...")
      const tokenMetadataURI = await uploadJson(metadata)
      console.log("[v0] Metadata uploaded to Arweave:", tokenMetadataURI)

      const payload = {
        contract: {
          name: "Feria Nounish Moment",
          uri: imageUri,
        },
        token: {
          tokenMetadataURI: tokenMetadataURI,
          createReferral: "0x1234567890123456789012345678901234567890",
          salesConfig: {
            type: "fixedPrice",
            pricePerToken: "100000000000000000", // 0.1 ETH in wei
            saleStart: 1717200000,
            saleEnd: 0,
          },
          mintToCreatorCount: 1,
        },
        account: address || "0x0987654321098765432109876543210987654321",
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
          `¡Momento creado exitosamente!\\nContract: ${data.contractAddress}\\nToken ID: ${data.tokenId}\\nHash: ${data.hash}\\nArweave URI: ${imageUri}\\nMetadata URI: ${tokenMetadataURI}`,
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
        <div className="text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-balance">Crear</h1>

          {isConnected && address && (
            <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-4 mb-4">
              <p className="text-white text-sm">🔗 Wallet conectada:</p>
              <p className="text-white/80 text-xs break-all">{address}</p>
            </div>
          )}

          {!isConnected && (
            <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg p-4 mb-4">
              <p className="text-white text-sm">⚠️ Conecta tu wallet para usar tu dirección como creador</p>
            </div>
          )}

          {/* Image Upload Section */}
          <div className="space-y-6">
            {/* Upload Button */}
            <div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
              <label htmlFor="image-upload">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100 font-semibold px-8 py-4 text-lg shadow-lg cursor-pointer"
                  asChild
                >
                  <span>Subir Imagen</span>
                </Button>
              </label>
            </div>

            {/* Display uploaded image */}
            {uploadedImage && (
              <div className="flex justify-center">
                <div className="relative w-64 h-64 rounded-lg overflow-hidden shadow-lg border-4 border-white">
                  <Image src={uploadedImage || "/placeholder.svg"} alt="Imagen subida" fill className="object-cover" />
                </div>
              </div>
            )}

            {arweaveUri && (
              <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white text-sm">✅ Imagen subida a Arweave:</p>
                <p className="text-white/80 text-xs break-all">{arweaveUri}</p>
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="bg-red-500 text-white hover:bg-red-600 font-semibold px-8 py-4 text-lg min-w-[140px] shadow-lg disabled:opacity-50"
            onClick={handleCreateMoment}
            disabled={isLoading}
          >
            {isLoading ? "Subiendo..." : "Crear"}
          </Button>
        </div>
      </div>
    </div>
  )
}
