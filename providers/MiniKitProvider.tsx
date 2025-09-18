"use client"
import { MiniKitProvider } from "@coinbase/onchainkit/minikit"
import type { ReactNode } from "react"
import { base } from "wagmi/chains"

export function MiniKitContextProvider({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider chain={base}>
      {children}
    </MiniKitProvider>
  )
}
