'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';

const GAME_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GAME_CONTRACT || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const SHINE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_SHINE_TOKEN || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const DOME_ACCESSORIES_ADDRESS = (process.env.NEXT_PUBLIC_DOME_ACCESSORIES || '0x0000000000000000000000000000000000000000') as `0x${string}`;

const ERC20_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const ACCESSORIES_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const GAME_ABI = [
  {
    inputs: [{ name: 'accessoryId', type: 'uint256' }],
    name: 'buyAccessory',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'hatId', type: 'uint256' },
      { name: 'glassesId', type: 'uint256' },
      { name: 'wigId', type: 'uint256' },
    ],
    name: 'equipAccessory',
    outputs: [],
    stateMutability: 'nonpayable',
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

interface Accessory {
  id: number;
  name: string;
  category: 'hat' | 'glasses' | 'wig';
  cost: number;
  boost: number;
  description: string;
  emoji: string;
}

const ACCESSORY_LIST: Accessory[] = [
  {
    id: 1,
    name: 'Elegant Top Hat',
    category: 'hat',
    cost: 100,
    boost: 20,
    description: 'Polishing with style. Increases glossiness prestige.',
    emoji: '🎩',
  },
  {
    id: 2,
    name: 'Propeller Beanie',
    category: 'hat',
    cost: 200,
    boost: 30,
    description: 'A spinning propeller to scatter shiny sparkles!',
    emoji: '🛸',
  },
  {
    id: 3,
    name: 'Pirate Tricorn',
    category: 'hat',
    cost: 300,
    boost: 50,
    description: 'Declare yourself the pirate captain of the leaderboard.',
    emoji: '🏴‍☠️',
  },
  {
    id: 4,
    name: 'Deal With It Shades',
    category: 'glasses',
    cost: 150,
    boost: 10,
    description: 'Sleek 8-bit black shades. Pure cool.',
    emoji: '😎',
  },
  {
    id: 5,
    name: 'Cyber Laser Eyes',
    category: 'glasses',
    cost: 400,
    boost: 100,
    description: 'Double your earning! Shoot laser beams directly from your orbits.',
    emoji: '🔴',
  },
  {
    id: 6,
    name: 'Rogaine Treatment',
    category: 'wig',
    cost: 500,
    boost: 50,
    description: 'Medical cream blobs to sprout green baby hair.',
    emoji: '🧪',
  },
  {
    id: 7,
    name: 'Hair Plugs Transplant',
    category: 'wig',
    cost: 800,
    boost: 80,
    description: 'Funny standing black hairs. A majestic solution.',
    emoji: '🌱',
  },
  {
    id: 8,
    name: 'Rainbow Clown Wig',
    category: 'wig',
    cost: 600,
    boost: 40,
    description: 'For when you long-squeeze meme coins. Fluffy and colorful.',
    emoji: '🤡',
  },
  {
    id: 9,
    name: 'Cursed Demon Horns',
    category: 'wig',
    cost: 1000,
    boost: 150,
    description: 'Tap with cursed demonic fury. Blazing speed boosts.',
    emoji: '😈',
  },
  {
    id: 10,
    name: 'Radiant Angel Halo',
    category: 'wig',
    cost: 1200,
    boost: 200,
    description: 'Angelic grace floats over the dome. Maximum polish multipliers.',
    emoji: '😇',
  },
];

interface WardrobeShopProps {
  devModeEnabled?: boolean;
  devEquippedHat?: number;
  devEquippedGlasses?: number;
  devEquippedWig?: number;
  onDevEquip?: (category: 'hat' | 'glasses' | 'wig', id: number) => void;
}

export function WardrobeShop({
  devModeEnabled = false,
  devEquippedHat = 0,
  devEquippedGlasses = 0,
  devEquippedWig = 0,
  onDevEquip,
}: WardrobeShopProps) {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'all' | 'hat' | 'glasses' | 'wig'>('all');
  const [statusMsg, setStatusMsg] = useState('');

  // 1. Fetch player's $SHINE balance
  const { data: rawShineBalance, refetch: refetchShine } = useReadContract({
    address: SHINE_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000' ? SHINE_TOKEN_ADDRESS : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const shineBalance = rawShineBalance ? parseFloat(formatEther(rawShineBalance)) : 0;

  // 2. Fetch allowance of $SHINE spent by DomePolisher
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: SHINE_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000' ? SHINE_TOKEN_ADDRESS : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && GAME_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' ? [address, GAME_CONTRACT_ADDRESS] : undefined,
  });

  // 3. Fetch equipped items
  const { data: equipped, refetch: refetchEquipped } = useReadContract({
    address: GAME_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' ? GAME_CONTRACT_ADDRESS : undefined,
    abi: GAME_ABI,
    functionName: 'equippedAccessories',
    args: address ? [address] : undefined,
  });

  const equippedHat = equipped ? Number(equipped[0]) : 0;
  const equippedGlasses = equipped ? Number(equipped[1]) : 0;
  const equippedWig = equipped ? Number(equipped[2]) : 0;

  // 4. Batch query NFT balances for all 10 accessories using multicall
  const nftContractsQueries = ACCESSORY_LIST.map((acc) => ({
    address: DOME_ACCESSORIES_ADDRESS !== '0x0000000000000000000000000000000000000000' ? DOME_ACCESSORIES_ADDRESS : undefined,
    abi: ACCESSORIES_ABI,
    functionName: 'balanceOf' as const,
    args: address ? [address, BigInt(acc.id)] as const : undefined,
  }));

  const { data: nftBalances, refetch: refetchNFTs } = useReadContracts({
    contracts: nftContractsQueries as any,
  });

  // Write contract states
  const { data: txHash, isPending: isTxPending, writeContract } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Update states on tx confirmation
  useEffect(() => {
    if (isTxSuccess) {
      refetchShine();
      refetchAllowance();
      refetchEquipped();
      refetchNFTs();
      setStatusMsg('Onchain action confirmed! Wardrobe updated!');
      setTimeout(() => setStatusMsg(''), 4000);
    }
  }, [isTxSuccess, refetchShine, refetchAllowance, refetchEquipped, refetchNFTs]);

  const handleUnlock = async (acc: Accessory) => {
    if (devModeEnabled) return;
    if (!address || GAME_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    setStatusMsg(`Unlocking ${acc.name}...`);

    try {
      const requiredCost = parseEther(acc.cost.toString());
      const currentAllowance = allowance || 0n;

      if (currentAllowance < requiredCost) {
        // Step A: Approve spending of $SHINE
        setStatusMsg('Approving $SHINE tokens for shop purchase...');
        writeContract({
          address: SHINE_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [GAME_CONTRACT_ADDRESS, requiredCost * 2n], // approve double for safety
        });
      } else {
        // Step B: Direct purchase
        setStatusMsg(`Minting ${acc.name} NFT...`);
        writeContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_ABI,
          functionName: 'buyAccessory',
          args: [BigInt(acc.id)],
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Purchase failed: ${err.message}`);
    }
  };

  const handleEquip = async (acc: Accessory) => {
    if (devModeEnabled) {
      onDevEquip?.(acc.category, acc.id);
      return;
    }
    if (!address || GAME_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    setStatusMsg(`Equipping ${acc.name} on Brian's head...`);

    try {
      // Formulate equipped IDs (keep others active, just swap the selected category)
      let newHat = BigInt(equippedHat);
      let newGlasses = BigInt(equippedGlasses);
      let newWig = BigInt(equippedWig);

      if (acc.category === 'hat') {
        newHat = BigInt(equippedHat === acc.id ? 0 : acc.id); // toggle off if already equipped
      } else if (acc.category === 'glasses') {
        newGlasses = BigInt(equippedGlasses === acc.id ? 0 : acc.id);
      } else if (acc.category === 'wig') {
        newWig = BigInt(equippedWig === acc.id ? 0 : acc.id);
      }

      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_ABI,
        functionName: 'equipAccessory',
        args: [newHat, newGlasses, newWig],
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Equipment failed: ${err.message}`);
    }
  };

  const filteredAccessories = ACCESSORY_LIST.filter(
    (acc) => activeTab === 'all' || acc.category === activeTab
  );

  return (
    <div className="w-full max-w-4xl bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md">
      {/* Wardrobe Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-white tracking-wide">
            BRIAN'S WARDROBE
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Spend earned $SHINE to equip NFTs and multiply your dome-polishing potential!
          </p>
        </div>

        {/* Shine Balance Card */}
        {isConnected && (
          <div className="bg-zinc-900/80 border border-zinc-800 px-6 py-3 rounded-xl flex items-center gap-3">
            <div>
              <div className="text-[10px] tracking-wider font-bold text-zinc-500 uppercase">
                Your Balance
              </div>
              <div className="text-xl font-black text-blue-400 tracking-wide">
                {shineBalance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                <span className="text-xs text-white uppercase">$SHINE</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4 mb-6">
        {(['all', 'hat', 'glasses', 'wig'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg border transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-[#0052FF]/20 border-[#0052FF] text-white shadow-[0_0_15px_rgba(0,82,255,0.25)]'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            {tab === 'all' ? 'All Items' : tab === 'hat' ? 'Hats' : tab === 'glasses' ? 'Glasses' : 'Wigs & Cures'}
          </button>
        ))}
      </div>

      {/* Grid of Accessories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAccessories.map((acc, index) => {
          // Resolve NFT balance from batch queries
          const balanceData = nftBalances?.[index];
          // Developer mode bypasses ownership completely
          const ownsNFT = devModeEnabled ? true : (balanceData && balanceData.status === 'success' ? Number(balanceData.result) > 0 : false);

          // Check if equipped
          const isEquipped = devModeEnabled
            ? (acc.category === 'hat' && devEquippedHat === acc.id) ||
              (acc.category === 'glasses' && devEquippedGlasses === acc.id) ||
              (acc.category === 'wig' && devEquippedWig === acc.id)
            : (acc.category === 'hat' && equippedHat === acc.id) ||
              (acc.category === 'glasses' && equippedGlasses === acc.id) ||
              (acc.category === 'wig' && equippedWig === acc.id);

          return (
            <div
              key={acc.id}
              className={`relative bg-zinc-950/60 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:translate-y-[-2px] group ${
                isEquipped
                  ? 'border-[#0052FF] shadow-[0_0_20px_rgba(0,82,255,0.15)] bg-zinc-900/20'
                  : ownsNFT
                  ? 'border-zinc-700 bg-zinc-950/80'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Accessory Header Info */}
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-4xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)] select-none">
                    {acc.emoji}
                  </span>
                  <span className="px-2.5 py-1 bg-[#0052FF]/10 border border-[#0052FF]/20 text-blue-400 text-[10px] font-black uppercase rounded-md tracking-wider">
                    +{acc.boost}% Boost
                  </span>
                </div>

                <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors leading-tight">
                  {acc.name}
                </h3>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 mt-0.5">
                  {acc.category === 'hat' ? 'Headwear' : acc.category === 'glasses' ? 'Eye Gear' : 'Baldness Remedy'}
                </span>
                <p className="text-zinc-400 text-xs leading-relaxed mb-6">
                  {acc.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t border-zinc-900">
                {ownsNFT ? (
                  <button
                    onClick={() => handleEquip(acc)}
                    disabled={isTxPending || isTxConfirming}
                    className={`w-full py-2.5 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                      isEquipped
                        ? 'bg-[#0052FF] hover:bg-blue-600 text-white shadow-[0_0_15px_rgba(0,82,255,0.3)]'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    {isEquipped ? '✓ Equipped' : 'Equip Gear'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnlock(acc)}
                    disabled={
                      !isConnected ||
                      shineBalance < acc.cost ||
                      isTxPending ||
                      isTxConfirming ||
                      GAME_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000'
                    }
                    className={`w-full py-2.5 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex justify-center items-center gap-1.5 ${
                      !isConnected
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-900'
                        : shineBalance < acc.cost
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#0052FF] to-blue-600 hover:from-blue-500 hover:to-blue-600 text-white shadow-[0_0_15px_rgba(0,82,255,0.2)]'
                    }`}
                  >
                    {!isConnected
                      ? 'Connect wallet'
                      : shineBalance < acc.cost
                      ? `Locked (${acc.cost} SHINE)`
                      : `Unlock - ${acc.cost} SHINE`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Msg Overlay Toast */}
      {statusMsg && (
        <div className="fixed bottom-6 z-40 bg-zinc-900 border border-[#0052FF]/30 text-white font-bold text-sm px-6 py-4 rounded-xl shadow-[0_4px_30px_rgba(0,82,255,0.2)] animate-bounce leading-relaxed text-center max-w-sm mx-4">
          <p>{statusMsg}</p>
        </div>
      )}
    </div>
  );
}
