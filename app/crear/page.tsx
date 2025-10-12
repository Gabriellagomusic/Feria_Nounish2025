"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { uploadToArweave } from "@/app/actions/upload-to-arweave"
import { uploadJson } from "@/app/actions/upload-json"
import { useAccount } from "wagmi"

export default function CrearPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [arweaveUri, setArweaveUri] = useState<string | null>(null)
  const [tokenName, setTokenName] = useState("")
  const [tokenDescription, setTokenDescription] = useState("")

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
    if (!tokenName.trim()) {
      alert("Por favor ingresa el nombre del token")
      return
    }
    if (!tokenDescription.trim()) {
      alert("Por favor ingresa la descripción del token")
      return
    }

    setIsLoading(true)

    try {
      let imageUri = "https://arweave.net/placeholder123"

      if (selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)

        imageUri = await uploadToArweave(formData)
        setArweaveUri(imageUri)
      }

      const metadata = {
        name: tokenName,
        description: tokenDescription,
        external_url: "https://feria-nounish.vercel.app",
        image: imageUri,
        animation_url: imageUri,
        content: {
          mime: selectedFile?.type || "image/jpeg",
          uri: imageUri,
        },
      }

      const tokenMetadataURI = await uploadJson(metadata)

      const payload = {
        contract: {
          name: tokenName,
          uri: imageUri,
        },
        token: {
          tokenMetadataURI: tokenMetadataURI,
          createReferral: "0x1234567890123456789012345678901234567890",
          salesConfig: {
            type: "erc20Mint",
            pricePerToken: "1000000",
            saleStart: 1717200000,
            saleEnd: 1790198804,
            currency: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          },
          mintToCreatorCount: 1,
        },
        account: address || "0x0987654321098765432109876543210987654321",
      }

      const response = await fetch("https://inprocess.fun/api/moment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        alert(
          `¡Momento creado exitosamente!\nContract: ${data.contractAddress}\nToken ID: ${data.tokenId}\nHash: ${data.hash}\nArweave URI: ${imageUri}\nMetadata URI: ${tokenMetadataURI}`,
        )
      } else {
        alert(`Error al crear momento: ${data.message || "Error desconocido"}`)
      }
    } catch (error) {
      console.error("Error calling API:", error)
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

      <header className="relative z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/images/feria-logo.png"
              alt="Feria Nounish Logo"
              width={150}
              height={75}
              className="h-12 w-auto"
            />
          </Link>
          <h1 className="font-bold text-2xl md:text-3xl text-gray-800">Crear Obra</h1>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="w-full max-w-2xl space-y-6">
          {isConnected && address && (
            <div className="bg-green-500/30 backdrop-blur-md rounded-xl p-5 border border-green-400/50 shadow-lg">
              <p className="text-white font-semibold text-base mb-2">🔗 Wallet Conectada</p>
              <p className="text-white/90 text-sm break-all font-mono bg-black/20 rounded-lg p-3">{address}</p>
            </div>
          )}

          {!isConnected && (
            <div className="bg-yellow-500/30 backdrop-blur-md rounded-xl p-5 border border-yellow-400/50 shadow-lg">
              <p className="text-white font-semibold text-base">⚠️ Conecta tu wallet</p>
              <p className="text-white/90 text-sm mt-1">Para usar tu dirección como creador</p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-white font-semibold text-lg mb-2 drop-shadow-lg">Nombre del Token</label>
              <input
                type="text"
                placeholder="Ingresa el nombre de tu obra"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-white/25 backdrop-blur-md text-white placeholder-white/60 border-2 border-white/30 focus:border-white/60 focus:outline-none text-lg font-medium shadow-lg transition-all"
              />
            </div>
            <div>
              <label className="block text-white font-semibold text-lg mb-2 drop-shadow-lg">Descripción</label>
              <textarea
                placeholder="Describe tu obra de arte"
                value={tokenDescription}
                onChange={(e) => setTokenDescription(e.target.value)}
                rows={4}
                className="w-full px-5 py-4 rounded-xl bg-white/25 backdrop-blur-md text-white placeholder-white/60 border-2 border-white/30 focus:border-white/60 focus:outline-none resize-none text-lg font-medium shadow-lg transition-all"
              />
            </div>
            <div className="bg-blue-500/30 backdrop-blur-md rounded-xl p-5 border border-blue-400/50 shadow-lg">
              <p className="text-white font-semibold text-lg">
                💰 Precio: <span className="font-bold text-xl">1 USDC</span>
              </p>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-6">
            <div className="text-center">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
              <label htmlFor="image-upload">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100 font-bold px-10 py-6 text-xl shadow-xl cursor-pointer transition-all hover:scale-105"
                  asChild
                >
                  <span>📸 Subir Imagen</span>
                </Button>
              </label>
            </div>

            {uploadedImage && (
              <div className="flex justify-center">
                <div className="relative w-80 h-80 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50 backdrop-blur-sm">
                  <Image src={uploadedImage || "/placeholder.svg"} alt="Imagen subida" fill className="object-cover" />
                </div>
              </div>
            )}

            {arweaveUri && (
              <div className="bg-green-500/30 backdrop-blur-md rounded-xl p-5 border border-green-400/50 shadow-lg">
                <p className="text-white font-semibold text-base mb-2">✅ Imagen Subida a Arweave</p>
                <p className="text-white/90 text-sm break-all font-mono bg-black/20 rounded-lg p-3">{arweaveUri}</p>
              </div>
            )}
          </div>

          <div className="text-center pt-4">
            <Button
              size="lg"
              className="bg-red-500 text-white hover:bg-red-600 font-bold px-12 py-6 text-xl min-w-[200px] shadow-xl disabled:opacity-50 transition-all hover:scale-105"
              onClick={handleCreateMoment}
              disabled={isLoading}
            >
              {isLoading ? "⏳ Creando..." : "🎨 Crear Obra"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
