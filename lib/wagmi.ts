import { createConfig, http } from "wagmi"
import { base } from "wagmi/chains"
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector"
import { injected } from "wagmi/connectors"

export const config = createConfig({
  chains: [base],
  connectors: [farcasterMiniApp(), injected()],
  transports: {
    [base.id]: http(),
  },
})
