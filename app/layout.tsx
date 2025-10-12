import type React from "react"
import localFont from "next/font/local"
import { MiniKitContextProvider } from "@/providers/MiniKitProvider"
import { WagmiContextProvider } from "@/providers/WagmiProvider"
import "./globals.css"

const barlowCondensed = localFont({
  src: "../public/fonts/BarlowCondensed-ExtraBold.ttf",
  variable: "--font-barlow",
  display: "swap",
})

const plusJakarta = localFont({
  src: "../public/fonts/PlusJakartaSans-VariableFont_wght.ttf",
  variable: "--font-jakarta",
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
    <html lang="en" className={`${barlowCondensed.variable} ${plusJakarta.variable}`}>
      <body>
        <WagmiContextProvider>
          <MiniKitContextProvider>{children}</MiniKitContextProvider>
        </WagmiContextProvider>
      </body>
    </html>
  )
}
