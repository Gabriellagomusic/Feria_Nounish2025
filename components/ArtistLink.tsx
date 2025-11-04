"use client"

import Link from "next/link"

interface ArtistLinkProps {
  artistName: string
  artistAddress: string
  className?: string
}

export function ArtistLink({ artistName, artistAddress, className = "" }: ArtistLinkProps) {
  // Don't make it a link if it's the fallback
  if (artistName === "Artista Desconocido" || !artistAddress) {
    return <span className={className}>{artistName}</span>
  }

  // Create Farcaster profile URL
  const farcasterUrl = `https://warpcast.com/${artistName.startsWith("@") ? artistName.slice(1) : artistName}`

  return (
    <Link
      href={farcasterUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} hover:underline hover:text-purple-600 transition-colors`}
      onClick={(e) => e.stopPropagation()}
    >
      {artistName}
    </Link>
  )
}
