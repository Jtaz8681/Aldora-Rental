import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import SessionProvider from "@/integrations/supabase/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aldora Dive Gear Management System",
  description: "Manage dive gear, rentals, and returns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              <Link href="/gear" className="font-semibold">Aldora Dive Gear</Link>
              <nav className="flex gap-2">
                <Link href="/gear" className="text-sm px-3 py-2 rounded hover:bg-muted">Gear</Link>
                <Link href="/customers" className="text-sm px-3 py-2 rounded hover:bg-muted">Customers</Link>
                <Link href="/rentals/new" className="text-sm px-3 py-2 rounded hover:bg-muted">New Rental</Link>
                <Link href="/returns" className="text-sm px-3 py-2 rounded hover:bg-muted">Returns</Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">
            {children}
          </main>
          <Toaster richColors />
        </SessionProvider>
      </body>
    </html>
  );
}