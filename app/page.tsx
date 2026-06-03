'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NetworkEnforcer } from './components/NetworkEnforcer';
import { GameCanvas } from './components/GameCanvas';
import { WardrobeShop } from './components/WardrobeShop';
import { Leaderboard } from './components/Leaderboard';

export default function Home() {
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const [devEquippedHat, setDevEquippedHat] = useState(0);
  const [devEquippedGlasses, setDevEquippedGlasses] = useState(0);
  const [devEquippedWig, setDevEquippedWig] = useState(0);

  const handleDevEquip = (category: 'hat' | 'glasses' | 'wig', id: number) => {
    if (category === 'hat') {
      setDevEquippedHat((prev) => (prev === id ? 0 : id));
    } else if (category === 'glasses') {
      setDevEquippedGlasses((prev) => (prev === id ? 0 : id));
    } else if (category === 'wig') {
      setDevEquippedWig((prev) => (prev === id ? 0 : id));
    }
  };

  return (
    <NetworkEnforcer>
      {/* Sleek Ambient Backing Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0052FF]/10 rounded-full filter blur-[100px] pointer-events-none select-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-yellow-500/5 rounded-full filter blur-[120px] pointer-events-none select-none" />

      <div className="min-h-screen flex flex-col font-sans select-none pb-12">
        {/* Navigation / Header */}
        <header className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-zinc-900 mb-8">
          <div className="flex items-center gap-3">
            {/* Satirical Shiny Dome Logo */}
            <div className="w-12 h-12 bg-gradient-to-tr from-[#0052FF] to-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,82,255,0.4)] border border-white/10 select-none">
              <span className="text-2xl filter drop-shadow-md">✨</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-wider text-white">
                POLISH THE DOME
              </h1>
              <p className="text-[10px] tracking-widest font-black uppercase text-zinc-500">
                Brian Armstrong Edition
              </p>
            </div>
          </div>

          {/* RainbowKit Wallet Connect & Developer Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-xl shadow-md backdrop-blur-sm">
              <span className="text-[10px] tracking-wider font-extrabold uppercase text-zinc-400">
                Dev Mode
              </span>
              <button
                onClick={() => setDevModeEnabled(!devModeEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                  devModeEnabled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-zinc-700'
                }`}
                aria-label="Toggle Developer Mode"
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                    devModeEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </header>

        {/* Dashboard Responsive Grid */}
        <main className="w-full max-w-7xl mx-auto px-6 flex-grow">
          {/* Sarcastic Header Tagline */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            {devModeEnabled ? (
              <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 animate-pulse">
                Developer Mode Active (Sandbox Testing)
              </span>
            ) : (
              <span className="inline-block px-3 py-1 bg-[#0052FF]/10 border border-[#0052FF]/30 text-[#0052FF] text-[10px] font-black uppercase tracking-widest rounded-full mb-3">
                Now Live on Base Mainnet
              </span>
            )}
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-none">
              POLISH BRIAN'S HEAD FOR <span className="text-yellow-400 underline decoration-wavy decoration-yellow-400">SUPREME GLITZ</span>!
            </h2>
            <p className="text-zinc-400 text-sm md:text-base mt-3 leading-relaxed">
              Taps generate massive glitz. Accumulate session scores, secure ECDSA signatures, and sync onchain to mint ERC20 <span className="text-yellow-400 font-bold">$SHINE</span>. Spend it on ridiculous NFT hats, glasses, and wigs to custom-style Brian's dome!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* COLUMN 1: Canvas clicker (5 cols) & Leaderboard (5 cols equivalent in vertical stack) */}
            <div className="lg:col-span-5 flex flex-col gap-8 w-full">
              {/* HTML5 Canvas Clicker Game */}
              <section aria-label="Game Canvas">
                <GameCanvas 
                  devModeEnabled={devModeEnabled}
                  devEquippedHat={devEquippedHat}
                  devEquippedGlasses={devEquippedGlasses}
                  devEquippedWig={devEquippedWig}
                />
              </section>

              {/* Onchain Bald Leaderboard */}
              <section aria-label="Leaderboard">
                <Leaderboard />
              </section>
            </div>

            {/* COLUMN 2: Wardrobe NFT Shop (7 cols) */}
            <div className="lg:col-span-7 w-full">
              <section aria-label="Wardrobe and Shop">
                <WardrobeShop 
                  devModeEnabled={devModeEnabled}
                  devEquippedHat={devEquippedHat}
                  devEquippedGlasses={devEquippedGlasses}
                  devEquippedWig={devEquippedWig}
                  onDevEquip={handleDevEquip}
                />
              </section>
            </div>
          </div>
        </main>

        {/* Satirical SEO Footer */}
        <footer className="w-full max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-zinc-900 text-center text-zinc-600 text-xs">
          <p className="leading-relaxed">
            Disclaimer: This game is 100% satirical. No actual domes were harmed or forced to wear funny wigs in the making of this onchain experience. <br />
            $SHINE is a meme-based game score currency and carries zero financial obligations or expectations. Polish at your own risk. <br />
            Built exclusively for <span className="text-[#0052FF] font-semibold">Base Mainnet</span>. Attributed under ERC-8021 Base Builder Codes.
          </p>
        </footer>
      </div>
    </NetworkEnforcer>
  );
}
