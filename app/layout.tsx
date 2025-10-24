import type React from "react"
import { Barlow_Condensed } from "next/font/google"
import { MiniKitContextProvider } from "@/providers/MiniKitProvider"
import { WagmiContextProvider } from "@/providers/WagmiProvider"
import { AutoConnectWrapper } from "@/components/AutoConnectWrapper"
import "./globals.css"

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "900"],
  variable: "--font-barlow",
  display: "swap",
})

const URL = "https://ferianounish2025.vercel.app"
export const metadata = {
  title: "Feria Nounish 2025",
  description: "Feria Nousnish",
  openGraph: {
    title: "Feria Nounish 2025",
    description: "Feria Nousnish",
    images: "https://ferianounish2025.vercel.app/images/feria-logo.png",
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://ferianounish2025.vercel.app/images/feria-logo.png",
      button: {
        title: "Entrar a Feria Nounish 2025",
        action: {
          type: "launch_frame",
          name: "Feria Nounish 2025",
          url: URL,
          splashImageUrl: "https://ferianounish2025.vercel.app/images/feria-logo.png",
          splashBackgroundColor: "#FFD700",
        },
      },
    }),
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={barlowCondensed.variable}>
      <body>
        <WagmiContextProvider>
          <MiniKitContextProvider>
            <AutoConnectWrapper>{children}</AutoConnectWrapper>
          </MiniKitContextProvider>
        </WagmiContextProvider>
      </body>
    </html>
  )
}
