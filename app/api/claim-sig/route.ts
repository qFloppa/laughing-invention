import { NextResponse } from 'next/server';
import { createPublicClient, http, keccak256, encodePacked } from 'viem';
import { base, baseSepolia, hardhat } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Default Hardhat Account #1 private key for seamless out-of-the-box local development
const DEV_SIGNER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const DEV_SIGNER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// Read contract configurations from environment (placeholder addresses for development)
// In production, these should be updated to actual deployed contracts
const rawContractAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT || process.env.GAME_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
const SHINE_GAME_ADDRESS = rawContractAddress.replace(/['"]/g, '').trim() as `0x${string}`;

const ABI = [
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'highScores',
    outputs: [{ name: '', type: 'uint256' }],
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

export async function POST(req: Request) {
  try {
    const { playerAddress, polishes, nonce, startTime, endTime, chainId } = await req.json();

    if (!playerAddress || typeof polishes !== 'number' || !nonce || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Biological Limits Tapping Velocity Anti-Cheat Check
    const durationMs = endTime - startTime;
    const durationSeconds = durationMs / 1000;
    
    // Minimum session length to prevent instant hacking
    if (durationSeconds < 1.0) {
      return NextResponse.json({ error: 'Tapping session too short! Suspicious speed.' }, { status: 400 });
    }

    const tapsPerSecond = polishes / durationSeconds;
    // Taps per second threshold (15 clicks/sec is standard human physical limits)
    if (tapsPerSecond > 15) {
      return NextResponse.json(
        { error: `Tapping speed of ${tapsPerSecond.toFixed(1)} clicks/sec exceeds biological limits! Nice try, bot.` },
        { status: 400 }
      );
    }

    // 2. Setup RPC Client based on Environment & Chain ID
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
    let chain: any = base;
    let rpcUrl = 'https://mainnet.base.org';

    if (isDevMode) {
      if (chainId === 31337) {
        chain = hardhat;
        rpcUrl = 'http://127.0.0.1:8545';
      } else {
        chain = baseSepolia;
        rpcUrl = 'https://sepolia.base.org';
      }
    }

    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // 3. Fetch current score and accessories from blockchain to calculate multiplier
    let currentScore = 0n;
    let multiplierPercent = 100; // base 100%

    // If game contract is deployed, query active parameters
    if (SHINE_GAME_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      try {
        currentScore = await client.readContract({
          address: SHINE_GAME_ADDRESS,
          abi: ABI,
          functionName: 'highScores',
          args: [playerAddress as `0x${string}`],
        });

        const [hatId, glassesId, wigId] = await client.readContract({
          address: SHINE_GAME_ADDRESS,
          abi: ABI,
          functionName: 'equippedAccessories',
          args: [playerAddress as `0x${string}`],
        });

        // Hats multipliers
        if (hatId === 1n) multiplierPercent += 20; // Elegant Top Hat: +20%
        if (hatId === 2n) multiplierPercent += 30; // Propeller Beanie: +30%
        if (hatId === 3n) multiplierPercent += 50; // Pirate Hat: +50%

        // Glasses multipliers
        if (glassesId === 4n) multiplierPercent += 10;  // Deal With It Shades: +10%
        if (glassesId === 5n) multiplierPercent += 100; // Cyber Laser Eyes: +100% (Double!)

        // Wigs/Accessories multipliers
        if (wigId === 8n) multiplierPercent += 40;  // Clown Wig: +40%
        if (wigId === 9n) multiplierPercent += 150; // Cursed Demon Horns: +150%
        if (wigId === 10n) multiplierPercent += 200; // Radiant Angel Halo: +200%
      } catch (err) {
        console.warn('Could not read contract state, falling back to basic/local calculation:', err);
      }
    }

    // 4. Calculate final values with multipliers
    const baseReward = BigInt(polishes);
    const claimAmount = (baseReward * BigInt(multiplierPercent)) / 100n;
    const newTotalScore = currentScore + BigInt(polishes); // Score tracks raw clicks!

    // 5. Sign the payload using private key
    let rawKey = process.env.SIGNER_PRIVATE_KEY || DEV_SIGNER_KEY;
    // Clean up quotes and trim whitespace
    rawKey = rawKey.replace(/['"]/g, '').trim();
    if (!rawKey.startsWith('0x')) {
      rawKey = `0x${rawKey}`;
    }
    const privateKey = rawKey as `0x${string}`;
    const account = privateKeyToAccount(privateKey);

    console.log("Signing claim payload for player:", playerAddress);
    console.log("Signer Public Address:", account.address);
    console.log("Using Game Contract Address:", SHINE_GAME_ADDRESS);

    // Hash values exactly matching the contract claimShine abi.encodePacked
    const messageHash = keccak256(
      encodePacked(
        ['address', 'uint256', 'uint256', 'uint256'],
        [playerAddress as `0x${string}`, claimAmount, newTotalScore, BigInt(nonce)]
      )
    );

    // Sign hash as an ethereum signed message
    const signature = await account.signMessage({
      message: { raw: messageHash },
    });

    return NextResponse.json({
      claimAmount: claimAmount.toString(),
      newTotalScore: newTotalScore.toString(),
      nonce: nonce.toString(),
      signature,
      multiplier: multiplierPercent,
      signerAddress: account.address, // Return the public address of the signer for frontend validation
    });
  } catch (error: any) {
    console.error('Signature Generation Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
