export async function fetchJsonWithRetries(urls: string[], init?: RequestInit, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json", ...(init?.headers || {}) },
          signal: controller.signal,
          ...init,
        })

        if (!res.ok) continue

        const ct = res.headers.get("content-type")?.toLowerCase() || ""
        if (ct.includes("json")) {
          const json = await res.json()
          return { ok: true, json, usedUrl: url }
        }

        const text = await res.text()
        const first = text.trimStart()[0] ?? ""
        if (first === "{" || first === "[") {
          const json = JSON.parse(text)
          return { ok: true, json, usedUrl: url }
        }
      } catch {
        /* try next gateway */
      }
    }
    return { ok: false, error: "All gateways failed" }
  } finally {
    clearTimeout(timer)
  }
}
