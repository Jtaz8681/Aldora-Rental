"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import Link from "next/link";

export default function LoginPage() {
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadLogo = async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("logo_url")
        .order("updated_at", { ascending: false })
        .limit(1);
      setLogoUrl(data?.[0]?.logo_url || null);
    };
    loadLogo();
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        {logoUrl && (
          <div className="mb-4 flex items-center justify-center">
            <img
              src={logoUrl}
              alt="Company Logo"
              className="max-h-24 w-full object-contain"
            />
          </div>
        )}
        <h1 className="text-xl font-semibold mb-4 text-center">Aldora Dive Gear Management System</h1>
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