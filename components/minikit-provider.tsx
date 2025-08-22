"use client"

import { OnchainKitProvider } from "@coinbase/onchainkit"
import { base } from "viem/chains"
import type { ReactNode } from "react"

interface MiniKitProviderProps {
  children: ReactNode
}

export function MiniKitProvider({ children }: MiniKitProviderProps) {
  return (
    <OnchainKitProvider apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY} chain={base}>
      {children}
    </OnchainKitProvider>
  )
}
