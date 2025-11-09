"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  children: React.ReactNode;
};

export default function SessionProvider({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub: { unsubscribe: () => void } | null = null;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isAuthPage = pathname?.startsWith("/login");
      const isRootPage = pathname === "/";

      if (!session && !isAuthPage) {
        router.replace("/login");
      } else if (session && (isAuthPage || isRootPage)) {
        router.replace("/dashboard");
      }
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === "SIGNED_IN" && (pathname?.startsWith("/login") || pathname === "/")) {
          router.replace("/dashboard");
        } else if (event === "SIGNED_OUT") {
          router.replace("/login");
        }
      });
      unsub = subscription;
      setReady(true);
    };

    init();

    return () => {
      if (unsub) {
        unsub.unsubscribe();
      }
    };
  }, [pathname, router]);

  if (!ready) {
    return <div className="flex items-center justify-center min-h-dvh text-sm text-muted-foreground">Loading…</div>;
  }

  return <>{children}</>;
}