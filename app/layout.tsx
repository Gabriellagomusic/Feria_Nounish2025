import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { MiniKitContextProvider } from "@/providers/MiniKitProvider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const URL = "https://ferianounish2025.vercel.app";
  return {
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
            splashImageUrl:
              "https://ferianounish2025.vercel.app/images/feria-logo.png",
            splashBackgroundColor:
              process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <MiniKitContextProvider>{children}</MiniKitContextProvider>
      </body>
    </html>
  );
}
