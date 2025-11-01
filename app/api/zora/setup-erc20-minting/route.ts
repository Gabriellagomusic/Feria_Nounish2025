import { type NextRequest, NextResponse } from "next/server"
import { encodeFunctionData, parseUnits } from "viem"

const ZORA_1155_ABI = [
  {
    name: "callSale",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "salesConfig", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const

const ERC20_MINTER_ABI = [
  {
    name: "setSale",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      {
        name: "salesConfig",
        type: "tuple",
        components: [
          { name: "saleStart", type: "uint64" },
          { name: "saleEnd", type: "uint64" },
          { name: "maxTokensPerAddress", type: "uint64" },
          { name: "pricePerToken", type: "uint96" },
          { name: "fundsRecipient", type: "address" },
          { name: "currency", type: "address" },
        ],
      },
    ],
    outputs: [],
  },
] as const

const ERC20_MINTER_ADDRESS = "0x777777E8850d8D6d98De2B5f64fae401F96eFF31"
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC on Base

export async function POST(request: NextRequest) {
  try {
    const { contractAddress, tokenId, fundsRecipient, priceUSDC } = await request.json()

    if (!contractAddress || !tokenId || !fundsRecipient) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const price = priceUSDC || 1
    const priceInWei = parseUnits(price.toString(), 6) // USDC has 6 decimals

    // Encode the setSale function data for the ERC20 Minter
    const setSaleData = encodeFunctionData({
      abi: ERC20_MINTER_ABI,
      functionName: "setSale",
      args: [
        BigInt(tokenId),
        {
          saleStart: BigInt(0), // Start immediately
          saleEnd: BigInt("18446744073709551615"), // Max uint64 (never ends)
          maxTokensPerAddress: BigInt(0), // No limit
          pricePerToken: priceInWei,
          fundsRecipient: fundsRecipient as `0x${string}`,
          currency: USDC_ADDRESS as `0x${string}`,
        },
      ],
    })

    // Encode the callSale function data for the main contract
    const callSaleData = encodeFunctionData({
      abi: ZORA_1155_ABI,
      functionName: "callSale",
      args: [BigInt(tokenId), ERC20_MINTER_ADDRESS as `0x${string}`, setSaleData],
    })

    return NextResponse.json({
      success: true,
      data: {
        to: contractAddress,
        data: callSaleData,
        value: "0",
        description: `Set up ERC20 minting with ${price} USDC per token`,
      },
    })
  } catch (error) {
    console.error("Error preparing sales config:", error)
    return NextResponse.json(
      { error: "Failed to prepare transaction", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
