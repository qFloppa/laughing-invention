import { createConfig, http } from 'wagmi';
import { base, baseSepolia, hardhat } from 'wagmi/chains';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  walletConnectWallet,
  coinbaseWallet,
  metaMaskWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { Attribution } from 'ox/erc8021';

// Setup RainbowKit connectors manually to retain standard config options
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [coinbaseWallet, rainbowWallet, metaMaskWallet, walletConnectWallet],
    },
  ],
  {
    appName: 'Polish the Dome',
    projectId: '4c7be5c0d575463f60f607d72851cf57', // Shared public WalletConnect projectId for demo purposes
  }
);

// Get Builder Code suffix to attribute transactions to Base leaderboard growth
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ['bc_b7k3p9da'], // Mock builder code for game activity attribution
});

export const config = createConfig({
  connectors,
  chains: [base, baseSepolia, hardhat],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [hardhat.id]: http(),
  },
  dataSuffix: DATA_SUFFIX,
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
