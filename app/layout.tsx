import type { Metadata } from "next";
import { Inter, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stellar Pulse — The Intelligence Layer of the Stellar Economy",
  description:
    "Track DeFi, RWAs, Stablecoins, Soroban activity and capital flows across the Stellar ecosystem in real time.",
  metadataBase: new URL("https://stellarpulse.xyz"),
  openGraph: {
    title: "Stellar Pulse",
    description: "The Intelligence Layer of the Stellar Economy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${serif.variable} ${mono.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
