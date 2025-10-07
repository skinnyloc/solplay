import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SolPlay - Decentralized Gaming on Solana",
  description: "Play classic games with real SOL wagering on the Solana blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <WalletContextProvider>
          <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-[#1a1f3a] to-slate-900">
            <Header />
            <main className="flex-1 pt-20 pb-8">
              {children}
            </main>
            <Footer />
          </div>
        </WalletContextProvider>
      </body>
    </html>
  );
}
