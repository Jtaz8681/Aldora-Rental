"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import FullscreenToggleButton from "@/components/FullscreenToggleButton";

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  const [sidebarHidden, setSidebarHidden] = React.useState(false);
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/login");

  if (isLogin) {
    // On the login page, render content without any menu or header
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar hidden={sidebarHidden} />
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur p-2 sm:p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSidebarHidden((v) => !v)}
              aria-label={sidebarHidden ? "Show menu" : "Hide menu"}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-sm sm:text-base font-semibold">Aldora Dive Gear</h1>
          </div>
          <div className="flex items-center">
            <FullscreenToggleButton />
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-screen-xl px-3 sm:px-4 md:px-6 py-4 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}