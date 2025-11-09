"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  onUploaded: (url: string) => void;
  initialUrl?: string | null;
  gearInternalId?: string;
};

export default function ManualUpload({ onUploaded, initialUrl, gearInternalId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>(initialUrl || "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f || null);
  };

  const upload = async () => {
    if (!file) return toast.error("Please select a PDF to upload.");
    setUploading(true);

    const safeName = (gearInternalId || "manual").replace(/[^a-zA-Z0-9-_]/g, "_");
    const path = `${safeName}/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage.from("manuals").upload(path, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      throw error;
    }

    const { data: pub } = supabase.storage.from("manuals").getPublicUrl(path);
    const url = pub?.publicUrl || "";
    setCurrentUrl(url);
    onUploaded(url);
    setUploading(false);
    toast.success("Manual uploaded");
  };

  return (
    <div className="grid gap-2">
      <Label>Upload Manual (PDF)</Label>
      <Input type="file" accept="application/pdf" onChange={handleFileChange} />
      <div className="flex items-center gap-2">
        <Button type="button" onClick={upload} disabled={uploading || !file}>
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        {currentUrl ? (
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
            View current manual
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">No manual uploaded</span>
        )}
      </div>
    </div>
  );
}