"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  children: React.ReactNode;
};

export default function SessionProvider({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsub: { unsubscribe: () => void } | null = null;

    const handleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isAuthPage = pathname?.startsWith("/login");
      const isRootPage = pathname === "/";

      if (!session && !isAuthPage) {
        router.replace("/login");
      } else if (session && (isAuthPage || isRootPage)) {
        router.replace("/dashboard");
      }
    };

    handleAuth(); // Run once on client mount

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_IN" && (pathname?.startsWith("/login") || pathname === "/")) {
        router.replace("/dashboard");
      } else if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });
    unsub = subscription;

    return () => {
      if (unsub) {
        unsub.unsubscribe();
      }
    };
  }, [pathname, router]);

  // Always render children. Client-side useEffect handles redirects.
  return <>{children}</>;
}