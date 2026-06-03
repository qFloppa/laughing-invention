import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polish the Dome | Satirical Base Onchain Clicker",
  description: "Scrub Brian Armstrong's massive bald dome to earn $SHINE points, buy ridiculous custom accessory NFTs, and climb the Bald Leaderboard on Base mainnet!",
  openGraph: {
    title: "Polish the Dome | Satirical Base Onchain Clicker",
    description: "Earn $SHINE by scrubbing Brian's head clean on Base mainnet. Buy accessory NFTs, and climb the rankings!",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-white selection:bg-[#0052FF]/30 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
