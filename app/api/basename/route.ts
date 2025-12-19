import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://resolver.base.org/v1/name/${address.toLowerCase()}`)

    if (!response.ok) {
      return NextResponse.json({ name: null }, { status: 200 })
    }

    const data = await response.json()
    return NextResponse.json({ name: data.name || null })
  } catch (error) {
    console.error("[v0] Error fetching Basename:", error)
    return NextResponse.json({ name: null }, { status: 200 })
  }
}
