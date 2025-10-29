export async function fetchJsonWithRetries(urls: string[], init?: RequestInit, timeoutMs = 15000) {
  console.log("[v0] fetchJsonWithRetries: Trying", urls.length, "URLs")

  for (const url of urls) {
    console.log("[v0] Attempting to fetch from:", url)

    // Create a new AbortController for each request
    const controller = new AbortController()
    const timer = setTimeout(() => {
      console.log("[v0] Request timed out after", timeoutMs, "ms:", url)
      controller.abort()
    }, timeoutMs)

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", ...(init?.headers || {}) },
        signal: controller.signal,
        ...init,
      })

      console.log("[v0] Response status:", res.status, "from", url)

      if (!res.ok) {
        console.log("[v0] Response not OK, trying next gateway")
        clearTimeout(timer)
        continue
      }

      const ct = res.headers.get("content-type")?.toLowerCase() || ""
      console.log("[v0] Content-Type:", ct)

      if (ct.includes("json")) {
        const json = await res.json()
        clearTimeout(timer)
        console.log("[v0] Successfully fetched JSON from:", url)
        return { ok: true, json, usedUrl: url }
      }

      const text = await res.text()
      const first = text.trimStart()[0] ?? ""
      console.log("[v0] First character of response:", first)

      if (first === "{" || first === "[") {
        const json = JSON.parse(text)
        clearTimeout(timer)
        console.log("[v0] Successfully parsed JSON from:", url)
        return { ok: true, json, usedUrl: url }
      }

      console.log("[v0] Response is not JSON, trying next gateway")
      clearTimeout(timer)
    } catch (err: any) {
      clearTimeout(timer)
      console.log("[v0] Error fetching from", url, ":", err.message)
      /* try next gateway */
    }
  }

  console.log("[v0] All gateways failed")
  return { ok: false, error: "All gateways failed" }
}
