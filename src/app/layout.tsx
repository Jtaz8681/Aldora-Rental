import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import SessionProvider from "@/integrations/supabase/SessionProvider";
import Sidebar from "@/components/Sidebar";
import ThemeProvider from "@/integrations/theme/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400"], // Regular
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
  const [sidebarHidden, setSidebarHidden] = React.useState(false);
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <SessionProvider>
            <div className="flex min-h-screen">
              <Sidebar hidden={sidebarHidden} />
              <div className="flex-1 flex flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur p-2 sm:p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setSidebarHidden((v) => !v)} aria-label={sidebarHidden ? "Show menu" : "Hide menu"}>
                      <Menu className="h-5 w-5" />
                    </Button>
                    <h1 className="text-sm sm:text-base font-semibold">Aldora Dive Gear</h1>
                  </div>
                </header>
                <main className="flex-1 mx-auto w-full max-w-screen-xl px-3 sm:px-4 md:px-6 py-4 md:py-6">
                  {children}
                </main>
              </div>
            </div>
            <Toaster richColors />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}