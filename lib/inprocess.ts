export interface Moment {
  address: string // Contract address
  tokenId: string
  chainId: number
  id: string // uuid
  uri: string
  admin: string // Artist/creator address
  createdAt: string // timestampz
  username: string // Username of the admin/artist, if available
  hidden?: boolean
}

export interface TimelineResponse {
  status: string
  moments: Moment[]
  pagination: {
    total_count: number
    page: number
    limit: number
    total_pages: number
  }
}

export async function getTimeline(
  page = 1,
  limit = 100,
  latest = true,
  artist?: string,
  chainId = 8453,
  hidden = false,
): Promise<TimelineResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    latest: latest.toString(),
    chainId: chainId.toString(),
  })

  if (artist) params.set("artist", artist)
  if (hidden) params.set("hidden", hidden.toString())

  console.log("[v0] getTimeline - Fetching with params:", params.toString())

  const url = `/api/inprocess/timeline?${params}`
  console.log("[v0] getTimeline - URL:", url)

  const response = await fetch(url)

  console.log("[v0] getTimeline - Response status:", response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] getTimeline - Error response:", errorText)
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  console.log("[v0] getTimeline - Success! Moments count:", data.moments?.length || 0)

  return data
}
