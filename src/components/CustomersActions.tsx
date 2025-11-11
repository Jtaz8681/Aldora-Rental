"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import Papa from "papaparse";
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
import ImportCustomersDialog from "@/components/ImportCustomersDialog";

type Props = {
  onImported?: () => void;
};

type SupabaseCustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  balance_due: number;
  rentals?: { count: number }[];
};

export default function CustomersActions({ onImported }: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setExporting(false);
      toast.error("You must be logged in to export.");
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, email, balance_due, rentals(count)")
      .order("created_at", { ascending: true });

    setExporting(false);

    if (error) {
      toast.error(`Export failed: ${error.message}`);
      return;
    }

    const rows = (data as SupabaseCustomerRow[] | null) ?? [];
    const csv = Papa.unparse(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone ?? "",
        email: r.email ?? "",
        balance_due: r.balance_due ?? 0,
        rental_count: r.rentals?.[0]?.count ?? 0,
      })),
      { quotes: true }
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${rows.length} customer(s).`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">Import / Export</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel>Customers</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import from CSV
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exporting…" : "Export customers CSV"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportCustomersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        showTriggerButton={false}
        onImported={onImported}
      />
    </>
  );
}