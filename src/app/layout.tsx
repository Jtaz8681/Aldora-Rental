import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import SessionProvider from "@/integrations/supabase/SessionProvider";
import ThemeProvider from "@/integrations/theme/ThemeProvider";
import AppShell from "@/components/AppShell";

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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <SessionProvider>
            <AppShell>{children}</AppShell>
            <Toaster richColors />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}