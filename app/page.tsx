'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Sparkles, Shirt, Trophy } from 'lucide-react';
import { NetworkEnforcer } from './components/NetworkEnforcer';
import { GameCanvas } from './components/GameCanvas';
import { WardrobeShop } from './components/WardrobeShop';
import { Leaderboard } from './components/Leaderboard';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'polish' | 'wardrobe' | 'leaderboard'>('polish');
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#0052FF]/10 rounded-full filter blur-[120px] pointer-events-none select-none z-0" />

      {/* Main viewport-locked app container (Sleek Phone simulator on desktop, full-screen on mobile) */}
      <div className="w-full h-[100dvh] flex flex-col justify-between overflow-hidden bg-zinc-950 font-sans select-none max-w-md md:max-w-lg mx-auto border-x border-zinc-900/60 shadow-2xl relative z-10">
        
        {/* Compact Header */}
        <header className="w-full px-4 py-3 flex justify-between items-center border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#0052FF] to-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(0,82,255,0.3)] border border-white/10 select-none shrink-0">
              <span className="text-sm">✨</span>
            </div>
            <div>
              <h1 className="text-xs font-black tracking-wider text-white uppercase leading-none">
                Polish The Dome
              </h1>
              <p className="text-[7px] tracking-widest font-black uppercase text-zinc-500 mt-0.5">
                Brian Armstrong Edition
              </p>
            </div>
          </div>

          {/* RainbowKit Wallet Connect & Developer Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-900/40 border border-zinc-800 px-2 py-0.5 rounded-lg">
              <span className="text-[8px] tracking-wider font-extrabold uppercase text-zinc-400">
                Dev
              </span>
              <button
                onClick={() => setDevModeEnabled(!devModeEnabled)}
                className={`w-7 h-4.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
                  devModeEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
                aria-label="Toggle Developer Mode"
              >
                <div
                  className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${
                    devModeEnabled ? 'translate-x-3' : 'translate-x-0'
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

        {/* Tab view area */}
        {/* Tab view area */}
        <main className="flex-1 w-full overflow-hidden relative bg-zinc-950 flex flex-col">
          {/* Active Tab View Rendering */}
          <div className="flex-1 min-h-0 relative">
            {activeTab === 'polish' && (
              <div className="w-full h-full overflow-hidden p-0">
                <GameCanvas 
                  devModeEnabled={devModeEnabled}
                  devEquippedHat={devEquippedHat}
                  devEquippedGlasses={devEquippedGlasses}
                  devEquippedWig={devEquippedWig}
                />
              </div>
            )}

            {activeTab === 'wardrobe' && (
              <div className="w-full h-full overflow-y-auto p-4 pb-20">
                <WardrobeShop 
                  devModeEnabled={devModeEnabled}
                  devEquippedHat={devEquippedHat}
                  devEquippedGlasses={devEquippedGlasses}
                  devEquippedWig={devEquippedWig}
                  onDevEquip={handleDevEquip}
                />
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="w-full h-full overflow-y-auto p-4 pb-20">
                <Leaderboard />
              </div>
            )}
          </div>
        </main>

        {/* Bottom Tab Navigation Menu */}
        <nav className="w-full shrink-0 border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-md flex justify-around items-center z-30" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))', paddingTop: '0.75rem' }}>
          <button
            onClick={() => setActiveTab('polish')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'polish' ? 'text-[#0052FF] scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[9px] font-black tracking-widest uppercase">Polish</span>
          </button>

          <button
            onClick={() => setActiveTab('wardrobe')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'wardrobe' ? 'text-[#0052FF] scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Shirt className="w-5 h-5" />
            <span className="text-[9px] font-black tracking-widest uppercase">Wardrobe</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'leaderboard' ? 'text-[#0052FF] scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[9px] font-black tracking-widest uppercase">Leaderboard</span>
          </button>
        </nav>
      </div>
    </NetworkEnforcer>
  );
}
