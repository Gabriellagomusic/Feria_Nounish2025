"use client"
import { OnchainKitProvider } from '@coinbase/onchainkit';
import type { ReactNode } from "react"
import { base } from "wagmi/chains"

export function MiniKitContextProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY

  if (!apiKey) {
    console.warn("[v0] NEXT_PUBLIC_CDP_CLIENT_API_KEY is not set")
  }

  return (
    <OnchainKitProvider apiKey={apiKey} chain={base} miniKit={{
        enabled: true
      }}> 
      {children}
    </OnchainKitProvider>
  )
}
