"use client"

import { AutoConnect } from "@coinbase/onchainkit/minikit"
import type React from "react"

export function AutoConnectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AutoConnect />
      {children}
    </>
  )
}
