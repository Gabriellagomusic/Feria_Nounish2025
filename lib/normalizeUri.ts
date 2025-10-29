export function normalizeUri(u: string): { kind: "http" | "data" | "invalid"; urls: string[]; dataJson?: any } {
  if (!u) return { kind: "invalid", urls: [] }

  if (u.startsWith("data:")) {
    if (u.startsWith("data:application/json;base64,")) {
      const b64 = u.split("base64,")[1] ?? ""
      const jsonStr = Buffer.from(b64, "base64").toString("utf-8")
      return { kind: "data", urls: [], dataJson: JSON.parse(jsonStr) }
    }
    return { kind: "invalid", urls: [] }
  }

  if (u.startsWith("ar://")) {
    const id = u.replace("ar://", "")
    return {
      kind: "http",
      urls: [`https://arweave.net/${id}`, `https://ar-io.net/${id}`, `https://gateway.irys.xyz/${id}`],
    }
  }

  if (u.startsWith("ipfs://")) {
    const cid = u.replace("ipfs://", "")
    return {
      kind: "http",
      urls: [
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://gateway.pinata.cloud/ipfs/${cid}`,
      ],
    }
  }

  if (u.startsWith("http://") || u.startsWith("https://")) {
    return { kind: "http", urls: [u] }
  }

  return { kind: "invalid", urls: [] }
}

export function normalizeAnyNestedUri(u?: string) {
  if (!u) return u
  if (u.startsWith("ar://")) return `https://arweave.net/${u.replace("ar://", "")}`
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.replace("ipfs://", "")}`
  return u
}
