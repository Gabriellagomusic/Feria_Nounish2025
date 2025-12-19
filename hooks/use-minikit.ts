"use client"

import { useState, useCallback, useRef } from "react"
import sdk from "@farcaster/miniapp-sdk"

export function useMiniKit() {
  const [isFrameReady, setIsFrameReady] = useState(false)
  const readyCalledRef = useRef(false)

  const setFrameReady = useCallback(() => {
    if (readyCalledRef.current) return
    readyCalledRef.current = true

    try {
      sdk.actions.ready()
      setIsFrameReady(true)
      console.log("[v0] Frame ready called successfully")
    } catch (error) {
      console.error("[v0] Error calling frame ready:", error)
      // Still mark as ready to prevent blocking the app
      setIsFrameReady(true)
    }
  }, [])

  return {
    isFrameReady,
    setFrameReady,
  }
}
