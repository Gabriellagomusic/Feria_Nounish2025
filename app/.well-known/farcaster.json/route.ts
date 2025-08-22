function withValidProperties(properties: Record<string, undefined | string | string[]>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value)),
  )
}

export async function GET() {
  const URL = "https://ferianounish2025.vercel.app"
  return Response.json({
  "accountAssociation": {
    "header": "eyJmaWQiOjYzNzEzOSwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEM2NDY1NDdjOTFBQTU4YTEyZDkwNjVFRDIwZDI3NmJmRTg4MTYzNjMifQ",
    "payload": "eyJkb21haW4iOiJmZXJpYW5vdW5pc2gyMDI1LnZlcmNlbC5hcHAifQ",
    "signature": "MHhmYzI4YTJlMjY5ZmMwNzljZjY3MWViYjc1YjFiNzYzMDBjYzA4Nzk0NzM0N2YyNmEzMDlmZmM3OGExMTdjZGE0NGI2MjMzOWFhMzA1YjVjZDRkMjhmMDZkMmQyZjQyZjNiMzRhYTU1ZTA1OGUxMDMzNzAwZDg5Y2JmNjZiODQ1ZTFi"
  }, 
    frame: withValidProperties({
      version: "1",
      name: "Feria Nounish 2025",
      subtitle: "Feria Nounish 2025",
      description: "Colección oficial de la Feria Gráfica Nousnish 2025 en Cali, Colombia",
      screenshotUrls: [],
      iconUrl: "https://ferianounish2025.vercel.app/images/feria-logo.png",
      splashImageUrl: "https://ferianounish2025.vercel.app/images/feria-logo.png",
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY,
      tags: ["feria", "grafica", "nounish", "cali", "colombia",],
      heroImageUrl: "https://ferianounish2025.vercel.app/images/feria-logo.png",
      tagline: "Feria Nousnish",
      ogTitle:  "Feria Nounish 2025",
      ogDescription: "Colección oficial de la Feria Gráfica Nousnish 2025 en Cali, Colombia",
      ogImageUrl: "https://ferianounish2025.vercel.app/images/feria-logo.png",
      // use only while testing
      noindex: true,
    }),
      "baseBuilder": {
    "allowedAddresses": ["0x4E2981B6442805B62B9f491135226ECeC0Fda49F"]
  }
  })
}
