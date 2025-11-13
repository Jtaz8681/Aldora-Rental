"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type CompanySettings = {
  id: string;
  name: string | null;
  logo_url: string | null;
};

export default function CompanyBrand() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      // Try latest settings
      const { data: latest } = await supabase
        .from("company_settings")
        .select("id, name, logo_url")
        .order("updated_at", { ascending: false })
        .limit(1);

      const first = latest?.[0] || null;

      if (first?.logo_url) {
        setSettings(first);
        return;
      }

      // Fallback: find the most recent setting that has a non-empty logo
      const { data: withLogo } = await supabase
        .from("company_settings")
        .select("id, name, logo_url")
        .not("logo_url", "is", null)
        .neq("logo_url", "")
        .order("updated_at", { ascending: false })
        .limit(1);

      setSettings(withLogo?.[0] || first || null);
    };
    fetchSettings();
  }, []);

  const hasLogo = !!settings?.logo_url;
  const hasName = !!settings?.name;

  return (
    <div className="flex flex-col items-center text-center px-4 py-3">
      {hasLogo && (
        <div className="w-full flex items-center justify-center">
          <img
            src={settings!.logo_url!}
            alt="Company Logo"
            className="h-24 w-full object-contain"
          />
        </div>
      )}
      {hasName && (
        <div className="mt-2">
          <p className="text-sm font-medium leading-tight">{settings!.name}</p>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Powered By Ethos Dive Software©</p>
    </div>
  );
}