import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import SessionProvider from "@/integrations/supabase/SessionProvider";
import Sidebar from "@/components/Sidebar"; // Import the new Sidebar component

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
        suppressHydrationWarning // Added to suppress hydration warnings on the body tag
      >
        <SessionProvider>
          <div className="flex min-h-screen">
            <Sidebar /> {/* Integrate the Sidebar */}
            <div className="flex-1 flex flex-col">
              <header className="lg:hidden sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur p-4">
                {/* Mobile header content if needed, but the SheetTrigger for sidebar is fixed */}
                <h1 className="text-lg font-semibold text-center">Aldora Dive Gear</h1>
              </header>
              <main className="flex-1 mx-auto w-full max-w-screen-xl px-3 sm:px-4 md:px-6 py-4 md:py-6">
                {children}
              </main>
            </div>
          </div>
          <Toaster richColors />
        </SessionProvider>
      </body>
    </html>
  );
}