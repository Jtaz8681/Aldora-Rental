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
        return;
      } else if (session && (isAuthPage || isRootPage)) {
        // Before routing to dashboard, enforce password change or profile setup
        const mustChange = !!(session.user?.user_metadata as any)?.must_change_password;
        if (mustChange && pathname !== "/account/change-password") {
          router.replace("/account/change-password");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", session.user.id)
          .limit(1)
          .maybeSingle();

        const hasNames = !!(profile?.first_name && profile?.last_name);
        if (!hasNames && pathname !== "/user/settings") {
          router.replace("/user/settings");
          return;
        }

        router.replace("/dashboard");
        return;
      }

      if (session) {
        // Enforce checks anywhere else too
        const mustChange = !!(session.user?.user_metadata as any)?.must_change_password;
        if (mustChange && pathname !== "/account/change-password") {
          router.replace("/account/change-password");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", session.user.id)
          .limit(1)
          .maybeSingle();

        const hasNames = !!(profile?.first_name && profile?.last_name);
        if (!hasNames && pathname !== "/user/settings") {
          router.replace("/user/settings");
          return;
        }
      }
    };

    handleAuth(); // Run once on client mount

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_IN") {
        const mustChange = !!(newSession?.user?.user_metadata as any)?.must_change_password;
        if (mustChange) {
          router.replace("/account/change-password");
          return;
        }
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