"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  onUploaded: (urls: string[]) => void;
  initialUrls?: string[];
  gearInternalId?: string;
};

export default function MultiPhotoUpload({ onUploaded, initialUrls = [], gearInternalId }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentUrls, setCurrentUrls] = useState<string[]>(initialUrls);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files || null);
  };

  const uploadAll = async () => {
    if (!files || files.length === 0) return toast.error("Please select one or more images.");
    setUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUploading(false);
      return toast.error("You must be signed in to upload.");
    }

    const safeName = (gearInternalId || "gear").replace(/[^a-zA-Z0-9-_]/g, "_");
    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      const path = `${safeName}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("gear-photos")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });

      if (uploadError) {
        toast.error("Upload failed: " + (uploadError.message || "Unknown error"));
        setUploading(false);
        throw uploadError;
      }

      const { data: pub } = supabase.storage.from("gear-photos").getPublicUrl(path);
      if (pub?.publicUrl) uploaded.push(pub.publicUrl);
    }

    const merged = [...currentUrls, ...uploaded];
    setCurrentUrls(merged);
    onUploaded(merged);
    setUploading(false);
    toast.success(`Uploaded ${uploaded.length} photo${uploaded.length > 1 ? "s" : ""}`);
  };

  return (
    <div className="grid gap-2">
      <Label>Upload Photos</Label>
      <Input type="file" accept="image/*" multiple onChange={handleFileChange} />
      <Button type="button" onClick={uploadAll} disabled={uploading || !files}>
        {uploading ? "Uploading..." : "Upload"}
      </Button>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {currentUrls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover rounded border" />
          </a>
        ))}
        {currentUrls.length === 0 && (
          <p className="text-xs text-muted-foreground col-span-3">No photos uploaded</p>
        )}
      </div>
    </div>
  );
}