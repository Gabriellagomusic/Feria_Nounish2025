"use server"

import Arweave from "arweave"

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 20000,
  logging: false,
})

export async function uploadToArweave(formData: FormData): Promise<string> {
  try {
    const file = formData.get("file") as File
    if (!file) {
      throw new Error("No file provided")
    }

    const ARWEAVE_KEY = JSON.parse(Buffer.from(process.env.ARWEAVE_KEY as string, "base64").toString())

    const buffer = await file.arrayBuffer()

    const transaction = await arweave.createTransaction(
      {
        data: buffer,
      },
      ARWEAVE_KEY,
    )

    transaction.addTag("Content-Type", file.type)
    await arweave.transactions.sign(transaction, ARWEAVE_KEY)

    const uploader = await arweave.transactions.getUploader(transaction)

    while (!uploader.isComplete) {
      console.log(`${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`)
      await uploader.uploadChunk()
    }

    return `ar://${transaction.id}`
  } catch (error) {
    console.error("Arweave upload error:", error)
    throw new Error("Failed to upload to Arweave")
  }
}
