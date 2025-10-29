"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useEffect, useState, useRef } from "react"
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import { useAccount, useConnect } from "wagmi"
import Link from "next/link"
import { getNounAvatarUrl } from "@/lib/noun-avatar"
import { getFarcasterProfilePic } from "@/lib/farcaster"

type DebugLog = {
  timestamp: string
  message: string
  data?: any
}

export default function Home() {
  const { setFrameReady, isFrameReady } = useMiniKit()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [isWhitelisted, setIsWhitelisted] = useState<boolean>(false)
  const [isCheckingWhitelist, setIsCheckingWhitelist] = useState<boolean>(true)
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [apiResponse, setApiResponse] = useState<any>(null)

  const frameReadyCalledRef = useRef(false)
  const connectAttemptedRef = useRef(false)

  const addDebugLog = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs((prev) => [...prev, { timestamp, message, data }])
    console.log(`[v0] ${message}`, data || "")
  }

  useEffect(() => {
    if (!isFrameReady && !frameReadyCalledRef.current) {
      console.log("[v0] Calling setFrameReady() once")
      frameReadyCalledRef.current = true
      setFrameReady()
    }
  }, [isFrameReady, setFrameReady])

  useEffect(() => {
    if (isFrameReady && !isConnected && !connectAttemptedRef.current && connectors.length > 0) {
      const farcasterConnector = connectors.find((c) => c.name === "Farcaster")
      if (farcasterConnector) {
        console.log("[v0] Auto-connecting to Farcaster connector once")
        connectAttemptedRef.current = true
        connect({ connector: farcasterConnector })
      }
    }
  }, [isFrameReady, isConnected, connectors, connect])

  useEffect(() => {
    const checkWhitelist = async () => {
      setDebugLogs([])

      if (!address) {
        addDebugLog("No wallet address connected")
        setIsWhitelisted(false)
        setIsCheckingWhitelist(false)
        return
      }

      try {
        addDebugLog("Starting whitelist check", { address })
        addDebugLog("Normalized address", { normalized: address.toLowerCase() })

        const apiUrl = `/api/whitelist/check?address=${address}`
        addDebugLog("Calling API", { url: apiUrl })

        const response = await fetch(apiUrl)
        addDebugLog("API response received", {
          status: response.status,
          statusText: response.statusText,
        })

        const data = await response.json()
        setApiResponse(data)
        addDebugLog("API response data", data)

        const whitelisted = data.isWhitelisted || false
        setIsWhitelisted(whitelisted)
        addDebugLog("Whitelist status determined", { isWhitelisted: whitelisted })
      } catch (error) {
        addDebugLog("Error checking whitelist", { error: String(error) })
        console.error("[v0] Error checking whitelist:", error)
        setIsWhitelisted(false)
      } finally {
        setIsCheckingWhitelist(false)
        addDebugLog("Whitelist check complete")
      }
    }

    checkWhitelist()
  }, [address])

  useEffect(() => {
    const fetchProfilePic = async () => {
      if (!address) {
        setProfilePicUrl(null)
        return
      }

      try {
        console.log("[v0] Landing - Fetching Farcaster profile pic for:", address)
        const picUrl = await getFarcasterProfilePic(address)
        setProfilePicUrl(picUrl)
        console.log("[v0] Landing - Profile pic URL:", picUrl)
      } catch (error) {
        console.error("[v0] Landing - Error fetching profile pic:", error)
        setProfilePicUrl(null)
      }
    }

    fetchProfilePic()
  }, [address])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 bg-fixed-parallax"
        style={{
          backgroundImage: "url(/images/fondolanding.png)",
        }}
      />

      <div className="absolute top-4 left-4 z-30 max-w-md bg-black/80 backdrop-blur-md text-white p-4 rounded-lg text-xs font-mono max-h-[80vh] overflow-y-auto">
        <h3 className="font-bold mb-2 text-sm">🔍 WHITELIST DEBUG PANEL</h3>

        <div className="mb-3 pb-3 border-b border-white/20">
          <p className="text-yellow-300 font-semibold">Connection Status:</p>
          <p>Connected: {isConnected ? "✅ Yes" : "❌ No"}</p>
          <p>Address: {address || "Not connected"}</p>
          <p>Normalized: {address ? address.toLowerCase() : "N/A"}</p>
        </div>

        <div className="mb-3 pb-3 border-b border-white/20">
          <p className="text-yellow-300 font-semibold">Whitelist Status:</p>
          <p>Checking: {isCheckingWhitelist ? "⏳ Yes" : "✅ Done"}</p>
          <p>Is Whitelisted: {isWhitelisted ? "✅ YES" : "❌ NO"}</p>
        </div>

        {apiResponse && (
          <>
            <div className="mb-3 pb-3 border-b border-white/20">
              <p className="text-yellow-300 font-semibold">API Response:</p>
              <pre className="text-xs overflow-x-auto">{JSON.stringify(apiResponse, null, 2)}</pre>
            </div>

            {apiResponse.debug && (
              <div className="mb-3 pb-3 border-b border-white/20">
                <p className="text-yellow-300 font-semibold">Database Contents:</p>
                <p className="text-gray-300">Total rows: {apiResponse.debug.totalRows}</p>
                <p className="text-gray-300 mt-2">Addresses in table:</p>
                {apiResponse.debug.allAddressesInTable && apiResponse.debug.allAddressesInTable.length > 0 ? (
                  <ul className="ml-4 mt-1 space-y-1">
                    {apiResponse.debug.allAddressesInTable.map((addr: string, idx: number) => (
                      <li key={idx} className="text-blue-300">
                        {addr}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-red-300 ml-4">⚠️ No addresses found in table!</p>
                )}
                <p className="text-gray-300 mt-2">Searched for:</p>
                <p className="text-purple-300 ml-4">{apiResponse.debug.searchedAddress}</p>
              </div>
            )}
          </>
        )}

        <div>
          <p className="text-yellow-300 font-semibold mb-2">Debug Logs:</p>
          {debugLogs.length === 0 ? (
            <p className="text-gray-400">No logs yet...</p>
          ) : (
            <div className="space-y-1">
              {debugLogs.map((log, index) => (
                <div key={index} className="text-xs">
                  <span className="text-gray-400">[{log.timestamp}]</span>{" "}
                  <span className="text-green-300">{log.message}</span>
                  {log.data && (
                    <pre className="ml-4 text-xs overflow-x-auto text-blue-300">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isWhitelisted && (
        <div className="absolute top-4 right-4 z-20">
          <Link href="/perfil">
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all shadow-lg overflow-hidden border-2 border-white/40"
              aria-label="Ver perfil"
            >
              <Image
                src={
                  profilePicUrl || (address ? getNounAvatarUrl(address) : getNounAvatarUrl("0x0")) || "/placeholder.svg"
                }
                alt="Profile"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </button>
          </Link>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="mb-12">
          <Image
            src="/images/logolanding.png"
            alt="Feria Nounish Logo"
            width={400}
            height={400}
            className="w-auto h-32 md:h-40 lg:h-48"
            priority
          />
        </div>

        {isCheckingWhitelist ? (
          <div className="flex items-center justify-center mb-8">
            <p className="text-white text-sm">Verificando acceso...</p>
          </div>
        ) : isWhitelisted ? (
          <div className="flex flex-row gap-4 items-center mb-8">
            <Link href="/galeria">
              <Button
                size="default"
                className="bg-white text-black hover:bg-gray-100 font-semibold px-6 py-3 text-base min-w-[120px] shadow-lg"
              >
                GALERÍA
              </Button>
            </Link>

            <Link href="/crear">
              <Button
                size="default"
                className="font-semibold px-6 py-3 text-base min-w-[120px] shadow-lg text-white hover:opacity-90"
                style={{ backgroundColor: "#FF0B00" }}
              >
                CREAR
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-center mb-8">
            <Link href="/galeria">
              <Button
                size="default"
                className="bg-white text-black hover:bg-gray-100 font-semibold px-6 py-3 text-base min-w-[120px] shadow-lg"
              >
                GALERÍA
              </Button>
            </Link>
          </div>
        )}

        <p className="text-white text-center text-sm md:text-base max-w-2xl px-4">
          ¡DESCUBRE LA COLECCIÓN OFICIAL DE NFTS DE LOS ARTISTAS DE LA FERIA NOUNISH
          <br />
          2025 EN CALI COLOMBIA!
        </p>
      </div>
    </div>
  )
}
