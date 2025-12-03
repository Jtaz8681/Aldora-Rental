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
  const [storageLogoUrl, setStorageLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadBrand = async () => {
      // Load company settings only if authenticated to avoid 401 on login page
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: settingsRows } = await supabase
          .from("company_settings")
          .select("id, name, logo_url")
          .order("updated_at", { ascending: false })
          .limit(1);
        const s = settingsRows?.[0] || null;
        setSettings(s);
      } else {
        setSettings(null);
      }

      // Load latest logo from storage bucket gear-photos/company/logo
      const { data: files } = await supabase.storage
        .from("gear-photos")
        .list("company/logo", {
          limit: 100,
          sortBy: { column: "name", order: "desc" },
        });

      const latestFile = files?.[0];
      if (latestFile?.name) {
        const path = `company/logo/${latestFile.name}`;
        const { data: pub } = supabase.storage.from("gear-photos").getPublicUrl(path);
        setStorageLogoUrl(pub?.publicUrl || null);
      } else {
        setStorageLogoUrl(null);
      }
    };
    loadBrand();
  }, []);

  const hasLogo = !!(storageLogoUrl || settings?.logo_url);
  const hasName = !!settings?.name;

  return (
    <div className="flex flex-col items-center text-center px-4 py-3">
      {hasLogo && (
        <div className="w-full flex items-center justify-center">
          <img
            src={(storageLogoUrl ?? settings?.logo_url) as string}
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