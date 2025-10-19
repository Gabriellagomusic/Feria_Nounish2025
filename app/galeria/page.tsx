"use client"

import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"
import { ArrowLeft, Search } from "lucide-react"
import { getDisplayName } from "@/lib/farcaster"

interface TokenMetadata {
  name: string
  description: string
  image: string
  artist: string
  artistDisplay: string
  contractAddress: string
  tokenId: string
}

const ERC1155_ABI = [
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "uri",
    outputs: [{ name: "", type: "string" }],
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

export default function GaleriaPage() {
  const router = useRouter()
  const [tokens, setTokens] = useState<TokenMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedArtist, setSelectedArtist] = useState<string>("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        })

        const tokenURI = await publicClient.readContract({
          address: "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5",
          abi: ERC1155_ABI,
          functionName: "uri",
          args: [BigInt(1)],
        })

        if (tokenURI) {
          let metadataUrl = tokenURI.replace("{id}", "1")
          if (metadataUrl.startsWith("ar://")) {
            metadataUrl = metadataUrl.replace("ar://", "https://arweave.net/")
          }

          const metadataResponse = await fetch(metadataUrl)
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json()

            let imageUrl = metadata.image
            if (imageUrl?.startsWith("ipfs://")) {
              imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
            } else if (imageUrl?.startsWith("ar://")) {
              imageUrl = imageUrl.replace("ar://", "https://arweave.net/")
            }

            const creatorAddress = metadata.creator || "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5"
            const artistDisplay = await getDisplayName(creatorAddress)

            const tokenData: TokenMetadata[] = [
              {
                name: metadata.name || "Obra de Arte #1",
                description: metadata.description || "Obra de arte digital única",
                image: imageUrl || "/abstract-digital-composition.png",
                artist: creatorAddress,
                artistDisplay: artistDisplay,
                contractAddress: "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5",
                tokenId: "1",
              },
            ]

            setTokens(shuffleArray(tokenData))
            setIsLoading(false)
            return
          }
        }

        const fallbackArtist = "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5"
        const fallbackArtistDisplay = await getDisplayName(fallbackArtist)

        const fallbackData: TokenMetadata[] = [
          {
            name: "Obra de Arte #1",
            description: "Obra de arte digital única de la colección oficial",
            image: "/abstract-digital-composition.png",
            artist: fallbackArtist,
            artistDisplay: fallbackArtistDisplay,
            contractAddress: "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5",
            tokenId: "1",
          },
        ]
        setTokens(shuffleArray(fallbackData))
      } catch (error) {
        console.error("Error fetching token metadata:", error)
        const fallbackArtist = "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5"
        const fallbackArtistDisplay = await getDisplayName(fallbackArtist)

        const fallbackData: TokenMetadata[] = [
          {
            name: "Obra de Arte #1",
            description: "Obra de arte digital única de la colección oficial",
            image: "/abstract-digital-composition.png",
            artist: fallbackArtist,
            artistDisplay: fallbackArtistDisplay,
            contractAddress: "0xff55cdf0d7f7fe5491593afa43493a6de79ec0f5",
            tokenId: "1",
          },
        ]
        setTokens(shuffleArray(fallbackData))
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
          token.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.artistDisplay.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (selectedArtist) {
      filtered = filtered.filter((token) => token.artist === selectedArtist)
    }

    return filtered
  }, [tokens, searchQuery, selectedArtist])

  const artists = useMemo(() => {
    return Array.from(new Set(tokens.map((token) => token.artist)))
  }, [tokens])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src="/images/fondo-galeria.png" alt="Fondo" fill className="object-cover" priority />
      </div>

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
              {/* Search Icon Button */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all flex-shrink-0"
                aria-label="Buscar"
                aria-expanded={isSearchOpen}
              >
                <Search className="w-5 h-5 text-white" />
              </button>

              {/* Artist Dropdown - smaller and same height */}
              <select
                value={selectedArtist}
                onChange={(e) => setSelectedArtist(e.target.value)}
                className="h-12 px-4 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 text-white text-sm focus:border-white/60 focus:outline-none flex-shrink-0"
                aria-label="Filtrar por artista"
              >
                <option value="" className="bg-gray-800">
                  TODOS LOS ARTISTAS
                </option>
                {artists.map((artist) => (
                  <option key={artist} value={artist} className="bg-gray-800">
                    {artist}
                  </option>
                ))}
              </select>
            </div>

            {/* Collapsible Search Input */}
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
              <p className="text-white text-lg">Cargando...</p>
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
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
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
                        <p className="text-xs text-gray-500">Por: {token.artistDisplay}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-white text-lg">No se encontraron obras</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
