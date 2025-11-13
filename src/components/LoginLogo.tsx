"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";

export default function LoginLogo() {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadLogoFromStorage = async () => {
      const { data } = await supabase.storage
        .from("gear-photos")
        .list("company/logo", {
          limit: 100,
          sortBy: { column: "updated_at", order: "desc" },
        });

      const file = data?.[0];
      if (!file?.name) {
        setUrl(null);
        return;
      }

      const path = `company/logo/${file.name}`;
      const { data: pub } = supabase.storage.from("gear-photos").getPublicUrl(path);
      setUrl(pub?.publicUrl ?? null);
    };

    loadLogoFromStorage();
  }, []);

  if (!url) return null;

  return (
    <div className="mb-4 flex items-center justify-center">
      <img
        src={url}
        alt="Company Logo"
        className="h-24 w-full object-contain"
      />
    </div>
  );
}