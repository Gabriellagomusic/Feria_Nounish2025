"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"
import { ArrowLeft, Search } from "lucide-react"

interface TokenMetadata {
  name: string
  description: string
  image: string
  artist: string
  contractAddress: string
  tokenId: string
}

interface DebugLog {
  timestamp: string
  message: string
  data?: any
}

const ERC1155_ABI = [
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "uri",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function formatAddress(address: string): string {
  return address.slice(0, 6) + "..." + address.slice(-4)
}

async function fetchContractOwner(contractAddress: string, publicClient: any): Promise<string> {
  try {
    const owner = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: ERC1155_ABI,
      functionName: "owner",
    })

    return (owner as string).toLowerCase()
  } catch (error) {
    const fallbackCreator = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
    return fallbackCreator.toLowerCase()
  }
}

async function fetchWithRetry<T>(fetchFn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Failed after retries")
}

export default function GaleriaPage() {
  const router = useRouter()
  const [tokens, setTokens] = useState<TokenMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        const galleryData = await fetchWithRetry(async () => {
          const response = await fetch("/api/gallery/list")
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return await response.json()
        })

        if (!galleryData.tokens || galleryData.tokens.length === 0) {
          setTokens([])
          setIsLoading(false)
          return
        }

        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const BATCH_SIZE = 10
        const tokenData: TokenMetadata[] = []

        for (let i = 0; i < galleryData.tokens.length; i += BATCH_SIZE) {
          const batch = galleryData.tokens.slice(i, i + BATCH_SIZE)

          const batchResults = await Promise.all(
            batch.map(async (config: { contractAddress: string; tokenId: string }) => {
              try {
                const [artistAddress, tokenURI] = await Promise.all([
                  fetchContractOwner(config.contractAddress, publicClient),
                  fetchWithRetry(async () => {
                    return await publicClient.readContract({
                      address: config.contractAddress as `0x${string}`,
                      abi: ERC1155_ABI,
                      functionName: "uri",
                      args: [BigInt(1)],
                    })
                  }),
                ])

                if (tokenURI) {
                  let metadataUrl = tokenURI.replace("{id}", "1")
                  if (metadataUrl.startsWith("ar://")) {
                    metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
                  }

                  try {
                    const metadata = await fetchWithRetry(async () => {
                      const response = await fetch(metadataUrl)
                      if (!response.ok) throw new Error(`HTTP ${response.status}`)
                      return await response.json()
                    })

                    let imageUrl = metadata.image
                    if (imageUrl?.startsWith("ipfs://")) {
                      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
                    } else if (imageUrl?.startsWith("ar://")) {
                      imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
                    }

                    return {
                      name: metadata.name || `Obra de Arte #${config.tokenId}`,
                      description: metadata.description || "Obra de arte digital única",
                      image: imageUrl || "/placeholder.svg",
                      artist: artistAddress,
                      contractAddress: config.contractAddress,
                      tokenId: config.tokenId,
                    }
                  } catch (fetchError) {
                    // Silent error handling
                  }
                }

                return {
                  name: `Obra de Arte #${config.tokenId}`,
                  description: "Obra de arte digital única de la colección oficial",
                  image: "/placeholder.svg",
                  artist: artistAddress,
                  contractAddress: config.contractAddress,
                  tokenId: config.tokenId,
                }
              } catch (error) {
                const fallbackArtist = "0x697C7720dc08F1eb1fde54420432eFC6aD594244"
                return {
                  name: `Obra de Arte #${config.tokenId}`,
                  description: "Obra de arte digital única de la colección oficial",
                  image: "/placeholder.svg",
                  artist: fallbackArtist.toLowerCase(),
                  contractAddress: config.contractAddress,
                  tokenId: config.tokenId,
                }
              }
            }),
          )

          tokenData.push(...batchResults)
          setTokens(shuffleArray([...tokenData]))
        }
      } catch (error) {
        setTokens([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokenMetadata()
  }, [])

  const filteredTokens = useMemo(() => {
    let filtered = tokens

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (token) =>
          token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.artist.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    return filtered
  }, [tokens, searchQuery])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-fixed-parallax"
        style={{
          backgroundImage: "url(/images/fondo-galeria.png)",
        }}
      />

      <div className="relative z-10">
        <header className="p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>

          <div className="mt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all flex-shrink-0"
                aria-label="Buscar"
                aria-expanded={isSearchOpen}
              >
                <Search className="w-5 h-5 text-white" />
              </button>
            </div>

            {isSearchOpen && (
              <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                <input
                  type="text"
                  placeholder="BUSCAR POR TÍTULO O ARTISTA"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 px-4 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 text-white placeholder-white/60 focus:border-white/60 focus:outline-none"
                  autoFocus
                />
              </div>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto mb-8"></div>

          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-white text-lg">Cargando...</p>
              </div>
            </div>
          ) : filteredTokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token, index) => (
                <Link
                  key={`${token.contractAddress}-${token.tokenId}-${index}`}
                  href={`/galeria/${token.contractAddress}/${token.tokenId}`}
                  className="group block"
                >
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                    <CardContent className="p-0">
                      <div className="relative aspect-square overflow-hidden bg-white">
                        <Image
                          src={token.image || "/placeholder.svg"}
                          alt={token.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-6 bg-white">
                        <h3 className="font-extrabold text-xl text-gray-800 mb-2">{token.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{token.description}</p>
                        <p className="text-xs text-gray-400 font-mono">{formatAddress(token.artist)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-white text-lg">No hay obras en la galería todavía</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
