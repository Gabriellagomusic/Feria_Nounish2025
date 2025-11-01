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

export async function getMomentByAddress(address: string, tokenId = 1, chainId = 8453): Promise<Moment | null> {
  try {
    console.log("[v0] getMomentByAddress - Fetching moment:", { address, tokenId, chainId })

    const response = await fetch(`/api/inprocess/moment?address=${address}&tokenId=${tokenId}&chainId=${chainId}`)

    console.log("[v0] getMomentByAddress - Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] getMomentByAddress - Error response:", errorText)
      return null
    }

    const data = await response.json()
    console.log("[v0] getMomentByAddress - Success! Moment admin:", data.moment?.admin)

    return data.moment
  } catch (error) {
    console.error("[v0] getMomentByAddress - Error:", error)
    return null
  }
}

export async function getAllMoments(chainId = 8453): Promise<Moment[]> {
  try {
    console.log("[v0] getAllMoments - Starting to fetch all timeline pages")

    // Fetch first page to get total count
    const firstPage = await getTimeline(1, 100, true, undefined, chainId, false)
    const allMoments = [...firstPage.moments]

    console.log("[v0] getAllMoments - First page fetched:", {
      momentsCount: firstPage.moments.length,
      totalPages: firstPage.pagination.total_pages,
      totalCount: firstPage.pagination.total_count,
    })

    // Fetch remaining pages if there are any
    if (firstPage.pagination.total_pages > 1) {
      const pagePromises = []
      for (let page = 2; page <= firstPage.pagination.total_pages; page++) {
        pagePromises.push(getTimeline(page, 100, true, undefined, chainId, false))
      }

      const remainingPages = await Promise.all(pagePromises)
      for (const pageData of remainingPages) {
        allMoments.push(...pageData.moments)
      }

      console.log("[v0] getAllMoments - All pages fetched:", {
        totalMoments: allMoments.length,
        pagesProcessed: firstPage.pagination.total_pages,
      })
    }

    return allMoments
  } catch (error) {
    console.error("[v0] getAllMoments - Error:", error)
    return []
  }
}

export function buildMomentLookupMap(moments: Moment[]): Map<string, Moment> {
  const map = new Map<string, Moment>()

  for (const moment of moments) {
    // Use lowercase address as key for case-insensitive lookup
    const key = moment.address.toLowerCase()
    map.set(key, moment)
  }

  console.log("[v0] buildMomentLookupMap - Built lookup map with", map.size, "entries")

  return map
}
