"use server"

import Arweave from "arweave"

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 20000,
  logging: false,
})

export async function uploadJson(json: object): Promise<string> {
  try {
    const ARWEAVE_KEY = JSON.parse(Buffer.from(process.env.ARWEAVE_KEY as string, "base64").toString())

    const jsonString = JSON.stringify(json)
    const buffer = Buffer.from(jsonString, "utf-8")

    const transaction = await arweave.createTransaction(
      {
        data: buffer,
      },
      ARWEAVE_KEY,
    )

    transaction.addTag("Content-Type", "application/json")
    await arweave.transactions.sign(transaction, ARWEAVE_KEY)

    const uploader = await arweave.transactions.getUploader(transaction)

    while (!uploader.isComplete) {
      console.log(`${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`)
      await uploader.uploadChunk()
    }

    return `ar://${transaction.id}`
  } catch (error) {
    console.error("Arweave JSON upload error:", error)
    throw new Error("Failed to upload JSON to Arweave")
  }
}
