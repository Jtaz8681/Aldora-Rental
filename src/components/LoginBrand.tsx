"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";

export default function LoginBrand() {
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

  if (!logoUrl) return null;

  return (
    <div className="mb-4 flex items-center justify-center">
      <img
        src={logoUrl}
        alt="Company Logo"
        className="max-h-24 w-full object-contain"
      />
    </div>
  );
}