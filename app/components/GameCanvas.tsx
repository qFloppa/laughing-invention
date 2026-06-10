'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { parseEther } from 'viem';
import confetti from 'canvas-confetti';

const GAME_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GAME_CONTRACT || '0x0000000000000000000000000000000000000000') as `0x${string}`;

const GAME_ABI = [
  {
    inputs: [
      { name: 'claimAmount', type: 'uint256' },
      { name: 'newTotalScore', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'claimShine',
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
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'highScores',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'trustedSigner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Interface for particles
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  type: 'sparkle' | 'shine-text' | 'base-logo';
  text?: string;
}

interface GameCanvasProps {
  devModeEnabled?: boolean;
  devEquippedHat?: number;
  devEquippedGlasses?: number;
  devEquippedWig?: number;
}

export function GameCanvas({
  devModeEnabled = false,
  devEquippedHat = 0,
  devEquippedGlasses = 0,
  devEquippedWig = 0,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Active session scores
  const [sessionPolishes, setSessionPolishes] = useState(0);
  const [pendingShine, setPendingShine] = useState(0);
  const [glossFactor, setGlossFactor] = useState(20); // starts at 20% gloss
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState(100);
  const [isOuch, setIsOuch] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  // Animation assets references
  const particlesRef = useRef<Particle[]>([]);
  const propellerAngleRef = useRef(0);
  const pulseRef = useRef(0);
  const baseLogoRef = useRef<HTMLImageElement | null>(null);

  const [wrongClicksCount, setWrongClicksCount] = useState(0);
  const ouchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const brianDefaultRef = useRef<HTMLImageElement | null>(null);
  const brianOuchRef = useRef<HTMLImageElement | null>(null);
  const brianSuperOuchRef = useRef<HTMLImageElement | null>(null);

  // Load Base logo and Brian images on mount
  useEffect(() => {
    const img = new Image();
    img.src = '/base.webp';
    img.onload = () => {
      baseLogoRef.current = img;
    };

    const img1 = new Image();
    img1.src = '/brian.png';
    img1.onload = () => {
      brianDefaultRef.current = img1;
    };

    const img2 = new Image();
    img2.src = '/brian2.png';
    img2.onload = () => {
      brianOuchRef.current = img2;
    };

    const img3 = new Image();
    img3.src = '/brian3.png';
    img3.onload = () => {
      brianSuperOuchRef.current = img3;
    };
  }, []);

  // 1. Read equipped accessories on-chain
  const { data: equipped, refetch: refetchEquipped } = useReadContract({
    address: GAME_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' ? GAME_CONTRACT_ADDRESS : undefined,
    abi: GAME_ABI,
    functionName: 'equippedAccessories',
    args: address ? [address] : undefined,
  });

  const hatId = devModeEnabled ? devEquippedHat : (equipped ? Number(equipped[0]) : 0);
  const glassesId = devModeEnabled ? devEquippedGlasses : (equipped ? Number(equipped[1]) : 0);
  const wigId = devModeEnabled ? devEquippedWig : (equipped ? Number(equipped[2]) : 0);

  // 2. Read high score on-chain
  const { data: onchainScore, refetch: refetchScore } = useReadContract({
    address: GAME_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' ? GAME_CONTRACT_ADDRESS : undefined,
    abi: GAME_ABI,
    functionName: 'highScores',
    args: address ? [address] : undefined,
  });

  // Read contract's trusted signer address
  const { data: contractTrustedSigner } = useReadContract({
    address: GAME_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' ? GAME_CONTRACT_ADDRESS : undefined,
    abi: GAME_ABI,
    functionName: 'trustedSigner',
  });

  // 3. Setup write transaction for claim
  const { data: txHash, isPending: isTxPending, writeContract } = useWriteContract();

  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Calculate multiplier whenever accessories change
  useEffect(() => {
    let mult = 100;
    if (hatId === 1) mult += 20;  // Top Hat: +20%
    if (hatId === 2) mult += 30;  // Beanie: +30%
    if (hatId === 3) mult += 50;  // Pirate Hat: +50%
    if (glassesId === 4) mult += 10;  // Shades: +10%
    if (glassesId === 5) mult += 100; // Laser Eyes: +100%
    if (wigId === 8) mult += 40;  // Clown Wig: +40%
    if (wigId === 9) mult += 150; // Demon Horns: +150%
    if (wigId === 10) mult += 200; // Angel Halo: +200%
    setMultiplier(mult);
  }, [hatId, glassesId, wigId]);

  // Clean session upon successful transaction confirmation
  useEffect(() => {
    if (isTxSuccess) {
      refetchScore();
      refetchEquipped();
      setSessionPolishes(0);
      setPendingShine(0);
      setSessionStartTime(null);
      setSyncStatusMsg('Onchain Sync Successful! Leaderboard Updated!');
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(''), 4000);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [isTxSuccess, refetchScore, refetchEquipped]);

  // Procedural squeak synthesizer sound
  const playSqueakSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Squeak sound structure: sweep frequency exponentially upwards
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      console.warn('AudioContext not allowed or not supported:', e);
    }
  };

  // Gameloop canvas renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Increment rotation/pulse angles
      propellerAngleRef.current += 0.08;
      pulseRef.current += 0.05;

      const scale = 1.0;
      const headX = canvas.width / 2;
      const headY = canvas.height / 2 + 30;
      const headRadius = 75;

      // Choose Brian's face image based on ouch state and click counts
      let brianImg = brianDefaultRef.current;
      if (isOuch) {
        if (wrongClicksCount >= 4) {
          brianImg = brianSuperOuchRef.current || brianOuchRef.current || brianDefaultRef.current;
        } else {
          brianImg = brianOuchRef.current || brianDefaultRef.current;
        }
      }

      // Accessories Offset & Scaling Constants for custom PNG images
      const hasImg = brianImg !== null;
      const hatOffsetY = hasImg ? 16 : 0;
      const hatScale = hasImg ? 0.88 : 1.0;
      
      const eyeXOffset = hasImg ? 32 : 35;
      const eyeYOffset = hasImg ? -14 : 0;
      
      const glassesOffsetY = hasImg ? -14 : 0;
      const glassesScale = hasImg ? 0.85 : 1.0;

      const wigOffsetY = hasImg ? 16 : 0;
      const wigScale = hasImg ? 0.85 : 1.0;

      // 1. Draw Neck
      ctx.fillStyle = '#f8c291'; // Skin tone
      ctx.beginPath();
      ctx.moveTo(headX - 35, headY + 30);
      ctx.lineTo(headX - 35, headY + 110);
      ctx.lineTo(headX + 35, headY + 110);
      ctx.lineTo(headX + 35, headY + 30);
      ctx.closePath();
      ctx.fill();

      // 2. Draw Shoulders / Collar (Satirical grey t-shirt)
      ctx.fillStyle = '#4b5563';
      ctx.beginPath();
      ctx.moveTo(headX - 100, headY + 110);
      ctx.bezierCurveTo(headX - 60, headY + 95, headX + 60, headY + 95, headX + 100, headY + 110);
      ctx.lineTo(headX + 110, canvas.height);
      ctx.lineTo(headX - 110, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Collar line
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(headX - 35, headY + 110);
      ctx.bezierCurveTo(headX - 15, headY + 120, headX + 15, headY + 120, headX + 35, headY + 110);
      ctx.stroke();

      // Draw Base Logo on Brian's T-shirt
      if (baseLogoRef.current) {
        ctx.drawImage(
          baseLogoRef.current,
          headX - 18,
          headY + 124,
          36,
          36
        );
      }

      // 3. Draw Brian's Face Image or Fallback Shape
      if (brianImg) {
        // Draw custom loaded PNG image
        ctx.drawImage(
          brianImg,
          headX - 90,
          headY - 95,
          180,
          180
        );
      } else {
        // Fallback to basic procedural head shape if images haven't loaded yet
        ctx.fillStyle = '#fad390'; // Lighter skin tone
        ctx.beginPath();
        ctx.arc(headX, headY + 20, 68, 0, Math.PI); // Chin
        ctx.fill();

        // Head Dome (Massive Bald sphere)
        ctx.beginPath();
        ctx.arc(headX, headY - 10, headRadius, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#fad390';
        ctx.beginPath();
        ctx.arc(headX - 70, headY + 10, 16, 0, Math.PI * 2); // Left ear
        ctx.arc(headX + 70, headY + 10, 16, 0, Math.PI * 2); // Right ear
        ctx.fill();
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.arc(headX - 70, headY + 10, 8, 0, Math.PI * 2);
        ctx.arc(headX + 70, headY + 10, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Draw Procedural Accessories: WIGS / HORNS (Drawn behind the face overlay)
      if (wigId === 8) {
        // Rainbow Clown Wig
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
        colors.forEach((col, index) => {
          ctx.fillStyle = col;
          const spacing = hasImg ? 22 : 28;
          const mainRadius = hasImg ? 26 : 35;
          const subRadius = hasImg ? 22 : 30;
          const wigOffset = (index - 2) * spacing;
          
          ctx.beginPath();
          ctx.arc(headX + wigOffset, headY - headRadius - 10 + wigOffsetY, mainRadius, 0, Math.PI * 2);
          ctx.arc(headX + wigOffset - (hasImg ? 10 : 15), headY - headRadius + 10 + wigOffsetY, subRadius, 0, Math.PI * 2);
          ctx.arc(headX + wigOffset + (hasImg ? 10 : 15), headY - headRadius + 10 + wigOffsetY, subRadius, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (wigId === 9) {
        // Cursed Demon Horns
        ctx.fillStyle = '#ef4444';
        
        // Left Horn
        ctx.beginPath();
        ctx.moveTo(headX - (hasImg ? 38 : 45), headY - 60 + wigOffsetY);
        ctx.bezierCurveTo(
          headX - (hasImg ? 65 : 75), headY - 110 + wigOffsetY,
          headX - (hasImg ? 75 : 85), headY - 100 + wigOffsetY,
          headX - (hasImg ? 70 : 80), headY - 130 + wigOffsetY
        );
        ctx.bezierCurveTo(
          headX - (hasImg ? 58 : 65), headY - 115 + wigOffsetY,
          headX - (hasImg ? 45 : 50), headY - 95 + wigOffsetY,
          headX - (hasImg ? 25 : 30), headY - 70 + wigOffsetY
        );
        ctx.closePath();
        ctx.fill();

        // Right Horn
        ctx.beginPath();
        ctx.moveTo(headX + (hasImg ? 38 : 45), headY - 60 + wigOffsetY);
        ctx.bezierCurveTo(
          headX + (hasImg ? 65 : 75), headY - 110 + wigOffsetY,
          headX + (hasImg ? 75 : 85), headY - 100 + wigOffsetY,
          headX + (hasImg ? 70 : 80), headY - 130 + wigOffsetY
        );
        ctx.bezierCurveTo(
          headX + (hasImg ? 58 : 65), headY - 115 + wigOffsetY,
          headX + (hasImg ? 45 : 50), headY - 95 + wigOffsetY,
          headX + (hasImg ? 25 : 30), headY - 70 + wigOffsetY
        );
        ctx.closePath();
        ctx.fill();
      }

      // Medical treatments: Rogaine cream
      if (wigId === 6) {
        ctx.fillStyle = '#ffffff'; // shaving-cream/rogaine foam blobs
        ctx.beginPath();
        ctx.arc(headX - (hasImg ? 20 : 25), headY - headRadius + 15 + wigOffsetY, hasImg ? 12 : 14, 0, Math.PI * 2);
        ctx.arc(headX + (hasImg ? 15 : 20), headY - headRadius + 22 + wigOffsetY, hasImg ? 13 : 16, 0, Math.PI * 2);
        ctx.arc(headX + 3, headY - headRadius + 10 + wigOffsetY, hasImg ? 12 : 15, 0, Math.PI * 2);
        ctx.fill();

        // Little green hair sprouts
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(headX - (hasImg ? 20 : 25), headY - headRadius + 10 + wigOffsetY);
        ctx.quadraticCurveTo(headX - 25, headY - headRadius - 5 + wigOffsetY, headX - 15, headY - headRadius - 10 + wigOffsetY);
        ctx.moveTo(headX + (hasImg ? 15 : 20), headY - headRadius + 15 + wigOffsetY);
        ctx.quadraticCurveTo(headX + 12, headY - headRadius - 2 + wigOffsetY, headX + 20, headY - headRadius - 6 + wigOffsetY);
        ctx.stroke();
      } else if (wigId === 7) {
        // Majestic Hair Transplant
        ctx.fillStyle = '#000000';
        const range = hasImg ? 40 : 50;
        const spacing = hasImg ? 12 : 15;
        // Tiny dots of hair plugs
        for (let i = -range; i <= range; i += spacing) {
          ctx.beginPath();
          ctx.arc(headX + i, headY - headRadius + 12 + wigOffsetY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Long weird strands
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(headX - 8, headY - headRadius + 10 + wigOffsetY);
        ctx.quadraticCurveTo(headX - 16, headY - headRadius - 20 + wigOffsetY, headX - 25, headY - headRadius - 30 + wigOffsetY);
        ctx.moveTo(headX + 12, headY - headRadius + 10 + wigOffsetY);
        ctx.quadraticCurveTo(headX + 20, headY - headRadius - 25 + wigOffsetY, headX + 8, headY - headRadius - 38 + wigOffsetY);
        ctx.stroke();
      }

      // 5. Draw Face details: Eyes, Eyebrows, Nose, Mouth (Only if fallback shape is active)
      if (!brianImg) {
        // Eyebrows
        ctx.strokeStyle = '#5c3d24';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (isOuch) {
          // Worried eyebrows angled down-inwards: / \
          ctx.moveTo(headX - 48, headY - 6);
          ctx.lineTo(headX - 22, headY - 16);
          ctx.moveTo(headX + 22, headY - 16);
          ctx.lineTo(headX + 48, headY - 6);
        } else {
          // Left high-arched eyebrow (satirical)
          ctx.moveTo(headX - 50, headY - 12);
          ctx.quadraticCurveTo(headX - 35, headY - 25, headX - 20, headY - 15);
          // Right flat eyebrow
          ctx.moveTo(headX + 20, headY - 15);
          ctx.quadraticCurveTo(headX + 35, headY - 18, headX + 50, headY - 12);
        }
        ctx.stroke();

        // Eyes
        if (isOuch) {
          ctx.strokeStyle = '#5c3d24';
          ctx.lineWidth = 4.5;
          ctx.lineCap = 'round';
          // Draw crossed X eyes
          // Left eye
          ctx.beginPath();
          ctx.moveTo(headX - 45, headY - 8);
          ctx.lineTo(headX - 25, headY + 8);
          ctx.moveTo(headX - 25, headY - 8);
          ctx.lineTo(headX - 45, headY + 8);
          // Right eye
          ctx.moveTo(headX + 25, headY - 8);
          ctx.lineTo(headX + 45, headY + 8);
          ctx.moveTo(headX + 45, headY - 8);
          ctx.lineTo(headX + 25, headY + 8);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(headX - 35, headY, 10, 0, Math.PI * 2);
          ctx.arc(headX + 35, headY, 10, 0, Math.PI * 2);
          ctx.fill();

          // Pupils (looking up, plotting)
          ctx.fillStyle = '#3e2723';
          ctx.beginPath();
          ctx.arc(headX - 35, headY - 3, 5, 0, Math.PI * 2);
          ctx.arc(headX + 35, headY - 3, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Cute nose
        ctx.strokeStyle = '#d35400';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(headX, headY + 5);
        ctx.lineTo(headX - 4, headY + 22);
        ctx.lineTo(headX + 4, headY + 22);
        ctx.stroke();

        // Mouth
        if (isOuch) {
          // Shocked open mouth (circle)
          ctx.fillStyle = '#5c3d24';
          ctx.beginPath();
          ctx.arc(headX, headY + 52, 14, 0, Math.PI * 2);
          ctx.fill();
          // Inner red
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(headX, headY + 54, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#5c3d24';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(headX - 30, headY + 45);
          // Smyly smirk with dynamic size on clicks
          const mouthDip = sessionPolishes > 0 ? 15 + Math.sin(pulseRef.current * 2) * 3 : 15;
          ctx.quadraticCurveTo(headX, headY + 45 + mouthDip, headX + 30, headY + 45);
          ctx.stroke();
        }
      }

      // 6. Draw Accessories: GLASSES
      if (glassesId === 4) {
        // "Deal with it" Shades
        ctx.fillStyle = '#000000';
        const w = 116 * glassesScale;
        const h = 20 * glassesScale;
        ctx.fillRect(headX - w/2, headY - 12 + glassesOffsetY, w, h); // lens bar
        ctx.fillRect(headX - w/2, headY - 12 + h + glassesOffsetY, 45 * glassesScale, 10 * glassesScale);
        ctx.fillRect(headX + w/2 - 45 * glassesScale, headY - 12 + h + glassesOffsetY, 45 * glassesScale, 10 * glassesScale);
        // White specular squares
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(headX - w/2 + 8 * glassesScale, headY - 12 + h/2 + glassesOffsetY, 8 * glassesScale, 8 * glassesScale);
        ctx.fillRect(headX + w/2 - 37 * glassesScale, headY - 12 + h/2 + glassesOffsetY, 8 * glassesScale, 8 * glassesScale);
      } else if (glassesId === 5) {
        // Cyber Laser Eyes (Blue Base Laser Eyes)
        ctx.fillStyle = '#0052FF';
        ctx.strokeStyle = '#0052FF';
        ctx.shadowColor = '#0052FF';
        ctx.shadowBlur = 20;

        const lX = headX - eyeXOffset;
        const rX = headX + eyeXOffset;
        const lY = headY + eyeYOffset;

        // Draw glowing laser lenses
        ctx.beginPath();
        ctx.arc(lX, lY, hasImg ? 10 : 12, 0, Math.PI * 2);
        ctx.arc(rX, lY, hasImg ? 10 : 12, 0, Math.PI * 2);
        ctx.fill();

        // Laser beams shooting down!
        ctx.lineWidth = hasImg ? 6 : 8;
        ctx.strokeStyle = '#0052FF';
        ctx.beginPath();
        ctx.moveTo(lX, lY);
        ctx.lineTo(lX - 25, canvas.height);
        ctx.moveTo(rX, lY);
        ctx.lineTo(rX + 25, canvas.height);
        ctx.stroke();

        ctx.shadowBlur = 0; // reset glow
      }

      // 7. Draw Accessories: HATS
      if (hatId === 1) {
        // Elegant Top Hat
        ctx.fillStyle = '#1e1b4b'; // deep dark navy
        const brimW = 130 * hatScale;
        const brimH = 12 * hatScale;
        const crownW = 90 * hatScale;
        const crownH = 70 * hatScale;

        // Brim
        ctx.fillRect(headX - brimW / 2, headY - headRadius - 10 + hatOffsetY, brimW, brimH);
        // Crown
        ctx.fillRect(headX - crownW / 2, headY - headRadius - 10 - crownH + hatOffsetY, crownW, crownH);

        // Blue band
        ctx.fillStyle = '#0052FF';
        ctx.fillRect(headX - crownW / 2, headY - headRadius - 10 - 10 + hatOffsetY, crownW, 10 * hatScale);

        // Draw Base Logo on Top Hat
        if (baseLogoRef.current) {
          ctx.drawImage(
            baseLogoRef.current,
            headX - 18 * hatScale,
            headY - headRadius - 10 - crownH + 10 + hatOffsetY,
            36 * hatScale,
            36 * hatScale
          );
        }
      } else if (hatId === 2) {
        // Propeller Beanie
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(headX, headY - headRadius + 12 + hatOffsetY, 50 * hatScale, Math.PI, 0); // Cap dome
        ctx.fill();

        // Brim (yellow)
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 8 * hatScale;
        ctx.beginPath();
        ctx.moveTo(headX - 52 * hatScale, headY - headRadius + 12 + hatOffsetY);
        ctx.lineTo(headX + 52 * hatScale, headY - headRadius + 12 + hatOffsetY);
        ctx.stroke();

        // Spinny metal rod
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 4 * hatScale;
        ctx.beginPath();
        ctx.moveTo(headX, headY - headRadius - 15 + hatOffsetY);
        ctx.lineTo(headX, headY - headRadius - 35 + hatOffsetY);
        ctx.stroke();

        // Spinning propeller blade (using sinus animation)
        ctx.fillStyle = '#3b82f6';
        ctx.save();
        ctx.translate(headX, headY - headRadius - 35 + hatOffsetY);
        ctx.rotate(propellerAngleRef.current);
        ctx.fillRect(-28 * hatScale, -4 * hatScale, 56 * hatScale, 8 * hatScale);
        ctx.beginPath();
        ctx.arc(0, 0, 5 * hatScale, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      } else if (hatId === 3) {
        // Pirate Hat
        ctx.fillStyle = '#171717';
        ctx.beginPath();
        ctx.moveTo(headX - 75 * hatScale, headY - headRadius + 15 + hatOffsetY);
        ctx.quadraticCurveTo(headX - 50 * hatScale, headY - headRadius - 30 + hatOffsetY, headX, headY - headRadius - 35 + hatOffsetY);
        ctx.quadraticCurveTo(headX + 50 * hatScale, headY - headRadius - 30 + hatOffsetY, headX + 75 * hatScale, headY - headRadius + 15 + hatOffsetY);
        ctx.quadraticCurveTo(headX, headY - headRadius + 5 + hatOffsetY, headX - 75 * hatScale, headY - headRadius + 15 + hatOffsetY);
        ctx.fill();

        // Skull print
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(headX, headY - headRadius - 12 + hatOffsetY, 7 * hatScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(headX - 4 * hatScale, headY - headRadius - 7 + hatOffsetY, 8 * hatScale, 6 * hatScale);
      }

      // Cursed Angel Halo (Floating accessory)
      if (wigId === 10) {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 8;
        ctx.save();
        // Floating pulse position (shifted down relative to head top if image loaded)
        const haloY = headY - headRadius - 40 + Math.sin(pulseRef.current * 1.5) * 5 + (hasImg ? 14 : 0);
        ctx.beginPath();
        ctx.ellipse(headX, haloY, 50 * (hasImg ? 0.9 : 1.0), 15 * (hasImg ? 0.9 : 1.0), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0; // reset glow

        // Draw Base Logo above Angel Halo
        if (baseLogoRef.current) {
          ctx.drawImage(
            baseLogoRef.current,
            headX - 12,
            haloY - 32,
            24,
            24
          );
        }
      }

      // 8. Draw GLOSS Radial Shader Highlight (Polishing effect)
      if (glossFactor > 0) {
        const glossRadius = 55;
        // Radial center moves towards the top-right dome
        const glossX = headX + 28;
        const glossY = headY - 45;

        const grad = ctx.createRadialGradient(
          glossX,
          glossY,
          2,
          glossX,
          glossY,
          glossRadius
        );

        // Blinding white shine that scales with glossFactor
        const opacity = Math.min((glossFactor / 100) * 0.75, 0.75);
        grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        grad.addColorStop(0.3, `rgba(255, 255, 255, ${opacity * 0.3})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(headX, headY - 10, headRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 9. Render Particles (Sparkles & Floating text)
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;

        if (p.type === 'sparkle') {
          // Draw standard shiny sparkles
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          p.rotation += p.rotSpeed;

          // Drawing 4-point sparkle star
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.quadraticCurveTo(0, 0, p.size, 0);
          ctx.quadraticCurveTo(0, 0, 0, p.size);
          ctx.quadraticCurveTo(0, 0, -p.size, 0);
          ctx.quadraticCurveTo(0, 0, 0, -p.size);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'shine-text' && p.text) {
          ctx.save();
          ctx.fillStyle = `rgba(147, 197, 253, ${p.alpha})`; // glowing light blue text
          ctx.font = 'black 22px system-ui, sans-serif';
          ctx.shadowColor = '#0052FF';
          ctx.shadowBlur = 5;
          ctx.fillText(p.text, p.x, p.y);
          ctx.restore();
        } else if (p.type === 'base-logo' && baseLogoRef.current) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          p.rotation += p.rotSpeed;
          ctx.drawImage(
            baseLogoRef.current,
            -p.size / 2,
            -p.size / 2,
            p.size,
            p.size
          );
          ctx.restore();
        }
      });

      // Filter out dead particles
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [sessionPolishes, glossFactor, hatId, glassesId, wigId, isOuch, wrongClicksCount]);

  // Slowly decay gloss factor over time to incentivize rapid click loops
  useEffect(() => {
    const interval = setInterval(() => {
      setGlossFactor((prev) => Math.max(20, prev - 1.5));
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // Synthesize Ouch Sound (low pitched buzzer)
  const playOuchSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(70, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    } catch (e) {
      console.warn('AudioContext not allowed or not supported:', e);
    }
  };

  // Handle clicking / polishing action
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Strict validation: disconnect clicks if wallet not connected
    if (!isConnected) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const headX = canvas.width / 2;
    const headY = canvas.height / 2 + 30; // Matches render loop Y
    const headRadius = 75; // Dome radius

    // Distance to bald dome center (headX, headY - 10)
    const dx = x - headX;
    const dy = y - (headY - 10);
    const distDome = Math.sqrt(dx * dx + dy * dy);

    // Check if bald head clicked (above eyes/eyebrows, inside dome)
    const isBaldHead = distDome <= headRadius && y <= headY - 5;

    // Check if clicked other parts of the face
    const isChin = y >= headY + 20 && Math.sqrt((x - headX)**2 + (y - (headY + 20))**2) <= 68;
    const isEarL = Math.sqrt((x - (headX - 70))**2 + (y - (headY + 10))**2) <= 20;
    const isEarR = Math.sqrt((x - (headX + 70))**2 + (y - (headY + 10))**2) <= 20;
    const isFaceLower = distDome <= headRadius && y > headY - 5;
    const isFace = isFaceLower || isChin || isEarL || isEarR;

    if (isBaldHead) {
      // 1. Play synthesize squeak sound in browser
      playSqueakSound();
      setWrongClicksCount(0);

      // 2. Increment stats
      const now = Date.now();
      if (sessionStartTime === null) {
        setSessionStartTime(now);
      }

      const activePolishes = sessionPolishes + 1;
      setSessionPolishes(activePolishes);

      // Reward points calculated with multiplier
      const earned = (1 * multiplier) / 100;
      setPendingShine((prev) => prev + earned);

      // Increase glossiness
      setGlossFactor((prev) => {
        const next = Math.min(100, prev + 4.5);
        if (next >= 100 && prev < 100) {
          // Trigger confetti upon hitting 100% gloss!
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
          });
        }
        return next;
      });

      // 3. Spawn Physics Sparkle Particles
      const clickColor = '#3b82f6'; // Base Blue sparkles
      for (let i = 0; i < 4; i++) {
        // 35% chance to spawn floating Base logo particles!
        if (Math.random() < 0.35 && baseLogoRef.current) {
          particlesRef.current.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 2.5,
            alpha: 1.0,
            size: Math.random() * 8 + 12, // 12-20px
            color: '',
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.05,
            type: 'base-logo',
          });
        } else {
          particlesRef.current.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 2,
            alpha: 1.0,
            size: Math.random() * 8 + 4,
            color: i % 2 === 0 ? '#93c5fd' : clickColor, // alternate light blue & base blue sparkles
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.1,
            type: 'sparkle',
          });
        }
      }

      // Floating score increment text
      particlesRef.current.push({
        x: x - 25,
        y: y - 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -1.5,
        alpha: 1.0,
        size: 20,
        color: '#93c5fd', // Light blue point floaters
        rotation: 0,
        rotSpeed: 0,
        type: 'shine-text',
        text: `+${earned.toFixed(1)} $SHINE`,
      });
    } else if (isFace) {
      // 1. Play synthesize warning sound
      playOuchSound();

      // 2. Set ouch face mode
      setIsOuch(true);
      setWrongClicksCount((prev) => prev + 1);

      if (ouchTimeoutRef.current) {
        clearTimeout(ouchTimeoutRef.current);
      }

      ouchTimeoutRef.current = setTimeout(() => {
        setIsOuch(false);
        setWrongClicksCount(0);
      }, 700);

      // 3. Spawn red OUCH particles
      particlesRef.current.push({
        x: x - 30,
        y: y - 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -1.8,
        alpha: 1.0,
        size: 22,
        color: '#ef4444', // Red warning color
        rotation: 0,
        rotSpeed: 0,
        type: 'shine-text',
        text: 'OUCH! 💢',
      });
    }
  };

  // Submit session polishes to blockchain
  const handleSyncOnchain = async () => {
    if (devModeEnabled) {
      setSyncStatusMsg('Developer Mode is active. Turn off Dev Mode to sync scores on-chain!');
      setTimeout(() => setSyncStatusMsg(''), 4000);
      return;
    }
    if (!address || sessionPolishes === 0 || !sessionStartTime) return;
    setIsSyncing(true);
    setSyncStatusMsg('Securing cryptographic verification signature...');

    try {
      const now = Date.now();
      const nonce = Math.floor(Math.random() * 100000000);

      // 1. Call API to verify tapping velocity and get cryptographic signature
      const res = await fetch('/api/claim-sig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: address,
          polishes: sessionPolishes,
          nonce,
          startTime: sessionStartTime,
          endTime: now,
          chainId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Validation failed');
      }

      const { claimAmount, newTotalScore, signature, signerAddress } = data;

      // Validate signer mismatch before prompting transaction to prevent gas wastage and guide the user
      if (contractTrustedSigner && signerAddress && String(contractTrustedSigner).toLowerCase() !== String(signerAddress).toLowerCase()) {
        throw new Error(
          `Trusted Signer Mismatch!\n` +
          `Contract expects signature from: ${contractTrustedSigner}\n` +
          `Backend signs with: ${signerAddress}\n\n` +
          `Please configure SIGNER_PRIVATE_KEY on Netlify or update the contract's trustedSigner.`
        );
      }

      setSyncStatusMsg('Tapping signature verified! Prompting wallet transaction...');

      // 2. Write to smart contract to mint $SHINE and update high score
      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_ABI,
        functionName: 'claimShine',
        args: [BigInt(claimAmount), BigInt(newTotalScore), BigInt(nonce), signature as `0x${string}`],
      });
    } catch (err: any) {
      console.error(err);
      setSyncStatusMsg(`Error: ${err?.message || 'Sync failed.'}`);
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(''), 6000);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Dynamic Game Rendering Panel */}
      <div className="relative w-full max-w-lg bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md">
        {/* Shiny Stats Banner */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-xs tracking-wider font-semibold text-zinc-500 uppercase px-2">
          <div>
            Gloss:{' '}
            <span
              className={`font-black ${
                glossFactor > 80
                  ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)] animate-pulse'
                  : 'text-white'
              }`}
            >
              {glossFactor.toFixed(0)}%
            </span>
          </div>
          <div>
            Multiplier:{' '}
            <span className="text-[#0052FF] font-black">{multiplier}%</span>
          </div>
        </div>

        {/* The HTML5 Canvas Drawing Loop */}
        <canvas
          ref={canvasRef}
          width={400}
          height={380}
          onClick={handleCanvasClick}
          className={`mx-auto ${
            isConnected ? 'cursor-pointer active:scale-[0.98]' : 'cursor-not-allowed opacity-60'
          } transition-transform duration-100 select-none`}
        />

        {/* Polishes counter */}
        {isConnected ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-zinc-400 tracking-wide uppercase">
              Current Session Polishes
            </h3>
            <h2 className="text-5xl font-black text-white my-1 tracking-tight drop-shadow-[0_2px_15px_rgba(255,255,255,0.15)] animate-scale-up">
              {sessionPolishes}
            </h2>
            <p className="text-xs text-blue-400 font-bold tracking-wide">
              +{pendingShine.toFixed(1)} PENDING $SHINE
            </p>
          </div>
        ) : (
          <div className="mt-6 py-4 bg-zinc-900/50 border border-zinc-800 rounded-xl max-w-sm mx-auto">
            <p className="text-zinc-400 text-sm font-semibold px-4">
              Connect your wallet above to start polishing the dome!
            </p>
          </div>
        )}
      </div>

      {/* Tapping action buttons */}
      {isConnected && sessionPolishes > 0 && (
        <div className="w-full max-w-md animate-fade-in text-center px-4">
          <button
            onClick={handleSyncOnchain}
            disabled={isSyncing || isTxPending || isTxConfirming}
            className="w-full py-4 bg-gradient-to-r from-[#0052FF] to-blue-600 hover:from-blue-500 hover:to-blue-600 disabled:from-zinc-800 disabled:to-zinc-800 text-white disabled:text-zinc-500 font-extrabold rounded-xl transition-all shadow-[0_0_20px_rgba(0,82,255,0.2)] hover:shadow-[0_0_30px_rgba(0,82,255,0.4)] cursor-pointer tracking-wider"
          >
            {isSyncing
              ? 'SYNCING SCORE...'
              : isTxPending
              ? 'CONFIRM IN WALLET...'
              : isTxConfirming
              ? 'CONFIRMING ON BASE...'
              : 'SECURE ONCHAIN $SHINE'}
          </button>

          {/* Social X Share Integration */}
          <div className="mt-4">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `I just polished Brian Armstrong's shiny dome ${sessionPolishes} times and earned ${pendingShine.toFixed(
                  0
                )} $SHINE points! Join me in the ultimate polishing race on @base. Let's make his head blind the orbit! ✨ https://dashboard.base.org/leaderboard`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase text-zinc-400 hover:text-white transition-all bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-lg shadow-sm hover:border-zinc-700 active:scale-[0.97]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
                className="w-4.5 h-4.5"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share polishes on X
            </a>
          </div>
        </div>
      )}

      {/* Real-time Status Overlay Message */}
      {syncStatusMsg && (
        <div className="fixed bottom-6 z-40 bg-zinc-900 border border-[#0052FF]/30 text-white font-bold text-sm px-6 py-4 rounded-xl shadow-[0_4px_30px_rgba(0,82,255,0.2)] animate-bounce leading-relaxed text-center max-w-sm mx-4">
          <p>{syncStatusMsg}</p>
        </div>
      )}
    </div>
  );
}
