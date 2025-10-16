"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { uploadToArweave } from "@/app/actions/upload-to-arweave"
import { uploadJson } from "@/app/actions/upload-json"
import { useAccount } from "wagmi"
import { ArrowLeft, Wallet, Check } from "lucide-react"

export default function CrearPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tokenName, setTokenName] = useState("")
  const [tokenDescription, setTokenDescription] = useState("")

  const { address, isConnected } = useAccount()

  const isFormValid = () => {
    return tokenName.trim() !== "" && tokenDescription.trim() !== "" && selectedFile !== null && isConnected
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
      const maxSize = 10 * 1024 * 1024 // 10MB

      if (!validTypes.includes(file.type)) {
        alert("Tipo de archivo no válido. Por favor sube una imagen (JPEG, PNG, GIF, WEBP)")
        return
      }

      if (file.size > maxSize) {
        alert("El archivo es demasiado grande. Tamaño máximo: 10MB")
        return
      }

      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateMoment = async () => {
    if (!isFormValid()) {
      return
    }

    setIsLoading(true)

    try {
      let imageUri = "https://arweave.net/placeholder123"

      if (selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)
        imageUri = await uploadToArweave(formData)
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
        alert(`Momento creado exitosamente!\nContract: ${data.contractAddress}\nToken ID: ${data.tokenId}`)
        router.push("/galeria")
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
        <Image src="/images/fondos5.png" alt="Fondo" fill className="object-cover" priority />
      </div>

      <header className="relative z-20 p-4">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all"
          aria-label="Volver"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
      </header>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-4">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
            <label htmlFor="image-upload">
              <div className="cursor-pointer border-4 border-dashed border-white/50 rounded-2xl p-12 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all text-center">
                {uploadedImage ? (
                  <div className="relative w-full aspect-square max-w-md mx-auto rounded-xl overflow-hidden">
                    <Image src={uploadedImage || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <svg
                      className="w-16 h-16 mx-auto text-white opacity-60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-white text-xl font-bold">SUBIR ARCHIVO</p>
                    <p className="text-white/70 text-sm">CLICK PARA SELECCIONAR IMAGEN</p>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div>
            <label className="block text-white font-bold text-lg mb-2">Nombre</label>
            <input
              type="text"
              placeholder="Nombre de la obra"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="w-full px-5 py-4 rounded-xl bg-white/25 backdrop-blur-md text-white placeholder-white/60 border-2 border-white/30 focus:border-white/60 focus:outline-none text-lg font-normal"
            />
          </div>

          <div>
            <label className="block text-white font-bold text-lg mb-2">Descripción</label>
            <textarea
              placeholder="Describe tu obra"
              value={tokenDescription}
              onChange={(e) => setTokenDescription(e.target.value)}
              rows={4}
              className="w-full px-5 py-4 rounded-xl bg-white/25 backdrop-blur-md text-white placeholder-white/60 border-2 border-white/30 focus:border-white/60 focus:outline-none resize-none text-lg font-normal"
            />
          </div>

          <div
            className="flex items-center gap-3 p-4 rounded-xl bg-white/20 backdrop-blur-md border-2 border-white/30"
            aria-live="polite"
            aria-label={isConnected ? "Wallet conectada" : "Wallet desconectada"}
          >
            <div className="relative">
              <Wallet className="w-6 h-6 text-white" />
              {isConnected && (
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <span className="text-white text-sm font-normal">
              {isConnected ? "Wallet conectada" : "Conecta tu wallet"}
            </span>
          </div>

          <div className="text-center pt-4">
            <Button
              size="lg"
              className={`font-bold px-12 py-6 text-xl min-w-[200px] transition-all ${
                isFormValid()
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-neutral-300 text-neutral-500 opacity-60 cursor-not-allowed"
              }`}
              onClick={handleCreateMoment}
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? "Creando..." : "Crear obra"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
