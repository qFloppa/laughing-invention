'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { base, baseSepolia, hardhat } from 'wagmi/chains';

interface NetworkEnforcerProps {
  children: React.ReactNode;
}

export function NetworkEnforcer({ children }: NetworkEnforcerProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [isValidChain, setIsValidChain] = useState(true);
  const [targetChain, setTargetChain] = useState<any>(base);

  // Setup dev mode toggle from environment
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  useEffect(() => {
    // If not connected, we don't enforce chain validation (allow them to view page and connect)
    if (!isConnected) {
      setIsValidChain(true);
      return;
    }

    if (isDevMode) {
      // In dev mode, allow Base Sepolia, Base Mainnet, and Hardhat Localhost
      const valid = chainId === baseSepolia.id || chainId === base.id || chainId === hardhat.id;
      setIsValidChain(valid);
      // Default switch target in dev mode
      if (chainId === base.id) {
        setTargetChain(base);
      } else if (chainId === baseSepolia.id) {
        setTargetChain(baseSepolia);
      } else {
        setTargetChain(hardhat);
      }
    } else {
      // In production, strictly enforce Base Mainnet only
      const valid = chainId === base.id;
      setIsValidChain(valid);
      setTargetChain(base);
    }
  }, [isConnected, chainId, isDevMode]);

  const handleSwitchNetwork = async () => {
    try {
      switchChain({ chainId: targetChain.id });
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  if (!isValidChain && isConnected) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        {/* Blurred gameplay snapshot behind */}
        <div className="filter blur-xl opacity-30 select-none pointer-events-none">
          {children}
        </div>

        {/* Real-time Network Enforcement Glassmorphic Overlay */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="w-full max-w-md bg-zinc-900/90 border border-red-500/30 rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-fade-in">
            {/* Warning Icon with pulse effect */}
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-10 h-10 text-red-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-black text-white tracking-wide mb-3">
              UNSUPPORTED ORBIT!
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              You are connected to an unsupported network. To protect your dome polishes and claims, the game requires you to be connected to{' '}
              <span className="text-[#0052FF] font-bold">
                {isDevMode ? 'Base Sepolia or Base Mainnet' : 'Base Mainnet'}
              </span>
              .
            </p>

            <button
              onClick={handleSwitchNetwork}
              disabled={isPending}
              className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white font-extrabold rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {isPending ? 'Switching orbits...' : `Connect to ${targetChain.name}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
