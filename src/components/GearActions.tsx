"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ImportGearDialog from "@/components/ImportGearDialog";
import ExportCsvDialog from "@/components/ExportCsvDialog";

type Props = {
  onImported?: () => void;
};

type SupabaseGearRow = {
  id: string;
  internal_id: string;
  friendly_name: string | null;
  category: string;
  sub_type: string | null;
  brand: string | null;
  model: string | null;
  size: string | null;
  status: string;
  rental_price: number;
  manual_url?: string | null;
};

const GEAR_FIELDS = [
  { key: "id", label: "ID" },
  { key: "internal_id", label: "Internal ID" },
  { key: "friendly_name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "sub_type", label: "Sub-Type" },
  { key: "brand", label: "Brand" },
  { key: "model", label: "Model" },
  { key: "size", label: "Size" },
  { key: "status", label: "Status" },
  { key: "rental_price", label: "Rental Price" },
  { key: "manual_url", label: "Manual URL" },
];

export default function GearActions({ onImported }: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const getRows = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to export.");
      return [];
    }

    const { data, error } = await supabase
      .from("gear_items")
      .select("id, internal_id, friendly_name, category, sub_type, brand, model, size, status, rental_price, manual_url")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(`Export failed: ${error.message}`);
      return [];
    }

    const rows = (data as SupabaseGearRow[] | null) ?? [];
    return rows.map((r) => ({
      id: r.id,
      internal_id: r.internal_id,
      friendly_name: r.friendly_name ?? "",
      category: r.category,
      sub_type: r.sub_type ?? "",
      brand: r.brand ?? "",
      model: r.model ?? "",
      size: r.size ?? "",
      status: r.status,
      rental_price: r.rental_price ?? 0,
      manual_url: r.manual_url ?? "",
    }));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">Import / Export</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel>Gear</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import from CSV
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportGearDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        showTriggerButton={false}
        onImported={onImported}
      />

      <ExportCsvDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        fields={GEAR_FIELDS}
        defaultSelected={["internal_id", "friendly_name", "category", "status", "rental_price"]}
        filename="gear.csv"
        getRows={getRows}
      />
    </>
  );
}