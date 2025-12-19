"use client"
import { OnchainKitProvider } from "@coinbase/onchainkit"
import type { ReactNode } from "react"
import { base } from "wagmi/chains"

export function MiniKitContextProvider({ children, apiKey }: { children: ReactNode; apiKey?: string }) {
  if (!apiKey) {
    console.warn("[v0] NEXT_PUBLIC_ONCHAINKIT_API_KEY is not set")
  }

  return (
    <OnchainKitProvider
      apiKey={apiKey}
      chain={base}
      miniKit={{
        enabled: true,
      }}
    >
      {children}
    </OnchainKitProvider>
  )
}
