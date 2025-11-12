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
};

export default function CompanyLogoUpload({ onUploaded, initialUrl }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>(initialUrl || "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f || null);
  };

  const upload = async () => {
    if (!file) return toast.error("Please select an image to upload.");
    setUploading(true);

    const path = `company/logo/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from("gear-photos")
      .upload(path, file, {
        contentType: file.type || "image/png",
        upsert: false,
      });

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      throw error;
    }

    const { data: pub } = supabase.storage.from("gear-photos").getPublicUrl(path);
    const url = pub?.publicUrl || "";
    setCurrentUrl(url);
    onUploaded(url);
    setUploading(false);
    toast.success("Logo uploaded");
  };

  return (
    <div className="grid gap-2">
      <Label>Company Logo</Label>
      <Input type="file" accept="image/*" onChange={handleFileChange} />
      <div className="flex items-center gap-2">
        <Button type="button" onClick={upload} disabled={uploading || !file}>
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        {currentUrl ? (
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
            View current logo
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">No logo uploaded</span>
        )}
      </div>
    </div>
  );
}