'use client';

import React, { useEffect } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';

const GAME_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GAME_CONTRACT || '0x0000000000000000000000000000000000000000') as `0x${string}`;

const GAME_ABI = [
  {
    inputs: [],
    name: 'getLeaderboard',
    outputs: [
      {
        components: [
          { name: 'player', type: 'address' },
          { name: 'score', type: 'uint256' },
        ],
        name: '',
        type: 'tuple[10]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'equippedAccessories',
    outputs: [
      { name: 'hatId', type: 'uint256' },
      { name: 'glassesId', type: 'uint256' },
      { name: 'wigId', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Emojis for equipped items representation on leaderboard
const HAT_EMOJIS: Record<number, string> = { 1: '🎩', 2: '🛸', 3: '🏴‍☠️' };
const GLASSES_EMOJIS: Record<number, string> = { 4: '😎', 5: '🔴' };
const WIG_EMOJIS: Record<number, string> = { 6: '🧪', 7: '🌱', 8: '🤡', 9: '😈', 10: '😇' };

export function Leaderboard() {
  // 1. Read top 10 leaderboard entries from the smart contract
  const { data: leaderboard, isLoading: isLeaderboardLoading, refetch } = useReadContract({
    address: GAME_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' ? GAME_CONTRACT_ADDRESS : undefined,
    abi: GAME_ABI,
    functionName: 'getLeaderboard',
  });

  // Filter out empty leaderboard slots (address 0x0)
  const playersList = (leaderboard || [])
    .map((entry, idx) => ({
      rank: idx + 1,
      player: entry.player,
      score: Number(entry.score),
    }))
    .filter((entry) => entry.player !== '0x0000000000000000000000000000000000000000');

  // 2. Batch query equipped items for all active players on the leaderboard
  const equippedQueries = playersList.map((entry) => ({
    address: GAME_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' ? GAME_CONTRACT_ADDRESS : undefined,
    abi: GAME_ABI,
    functionName: 'equippedAccessories' as const,
    args: [entry.player] as const,
  }));

  const { data: activeEquipped, refetch: refetchEquipped } = useReadContracts({
    contracts: equippedQueries as any,
  });

  // Automatically poll the leaderboard every 10 seconds to keep scores fresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      refetchEquipped();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetch, refetchEquipped]);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="w-full bg-zinc-950/30 border border-zinc-900/80 rounded-2xl p-4 md:p-6 backdrop-blur-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">
            THE BALD LEADERBOARD
          </h2>
          <p className="text-zinc-400 text-xs mt-0.5">
            Real-time onchain rankings of the top 10 dome-polishers.
          </p>
        </div>
        <button
          onClick={() => {
            refetch();
            refetchEquipped();
          }}
          className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Refresh rankings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      </div>

      {isLeaderboardLoading ? (
        <div className="py-8 text-center text-zinc-400 text-sm font-semibold">
          Loading leaderboard entries...
        </div>
      ) : playersList.length === 0 ? (
        <div className="py-12 bg-zinc-900/30 border border-zinc-900/50 rounded-xl text-center text-zinc-500 text-xs leading-relaxed">
          The dome is currently unpolished! <br />
          Be the first to secure your shine and seize Rank #1!
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800/80">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 text-[10px] tracking-wider font-extrabold text-zinc-500 uppercase border-b border-zinc-800">
                <th className="py-3.5 px-4 text-center w-12">Rank</th>
                <th className="py-3.5 px-4">Polisher</th>
                <th className="py-3.5 px-4 text-center">Gear</th>
                <th className="py-3.5 px-4 text-right">Polishes</th>
              </tr>
            </thead>
            <tbody>
              {playersList.map((entry, index) => {
                // Fetch equipped accessories
                const gearData = activeEquipped?.[index];
                const equippedItems =
                  gearData && gearData.status === 'success'
                    ? (gearData.result as [bigint, bigint, bigint])
                    : [0n, 0n, 0n];

                const hatId = Number(equippedItems[0]);
                const glassesId = Number(equippedItems[1]);
                const wigId = Number(equippedItems[2]);

                const hatEmoji = HAT_EMOJIS[hatId] || '';
                const glassesEmoji = GLASSES_EMOJIS[glassesId] || '';
                const wigEmoji = WIG_EMOJIS[wigId] || '';

                // Stylized rank badge colors
                const rankBadgeClass =
                  entry.rank === 1
                    ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(234,179,8,0.35)]'
                    : entry.rank === 2
                    ? 'bg-zinc-300 text-black'
                    : entry.rank === 3
                    ? 'bg-amber-700 text-white'
                    : 'bg-zinc-800 text-zinc-400';

                return (
                  <tr
                    key={entry.player}
                    className="border-b border-zinc-900 hover:bg-zinc-900/25 transition-colors"
                  >
                    <td className="py-4 px-4 text-center">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs mx-auto ${rankBadgeClass}`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-white">
                      {truncateAddress(entry.player)}
                    </td>
                    <td className="py-4 px-4 text-center select-none text-base">
                      {hatEmoji || glassesEmoji || wigEmoji ? (
                        <div className="flex justify-center gap-0.5" title="Equipped Gear">
                          {hatEmoji && <span>{hatEmoji}</span>}
                          {glassesEmoji && <span>{glassesEmoji}</span>}
                          {wigEmoji && <span>{wigEmoji}</span>}
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-black text-white text-sm tracking-wide">
                      {entry.score.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
