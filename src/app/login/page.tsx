"use client";
"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import Link from "next/link";
import LoginLogo from "@/components/LoginLogo";

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <LoginLogo />
        <h1 className="text-xl font-semibold mb-4 text-center">Aldora Dive Gear Management System</h1>
        {/* Scoped style to hide only the sign-up link under the Auth UI */}
        <style>{`
          /* Targets the footer link that switches to sign-up view */
          .supabase-auth-ui_ui-auth .supabase-auth-ui_ui-auth-link[data-s-redirect="signup"],
          .supabase-auth-ui_ui-auth .supabase-auth-ui_ui-auth-link[href="#signup"],
          .sbui-auth-view-footer a[href="#signup"] {
            display: none !important;
          }
        `}</style>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{ theme: ThemeSupa }}
          theme="light"
        />
        <p className="mt-4 text-xs text-center text-muted-foreground">
          Need access? Contact your administrator.
        </p>
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs underline text-muted-foreground">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}