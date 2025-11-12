"use client";

import React, { useMemo, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ParsedRow = {
  internal_id?: string | null;
  friendly_name?: string | null;
  category?: string | null;
  sub_type?: string | null;
  brand?: string | null;
  model?: string | null;
  size?: string | null;
  status?: string | null;
  rental_price?: number | null;
  manual_url?: string | null;
};

type Props = {
  onImported?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTriggerButton?: boolean; // default true
};

function normalizeRow(row: Record<string, any>): ParsedRow {
  const out: ParsedRow = {};
  Object.keys(row || {}).forEach((k) => {
    const key = String(k).trim().toLowerCase();
    const val = row[k];

    if (key === "internal_id") out.internal_id = val ?? null;
    if (key === "friendly_name" || key === "name") out.friendly_name = val ?? null;
    if (key === "category") out.category = val ?? null;
    if (key === "sub_type" || key === "subtype" || key === "sub type") out.sub_type = val ?? null;
    if (key === "brand") out.brand = val ?? null;
    if (key === "model") out.model = val ?? null;
    if (key === "size") out.size = val ?? null;
    if (key === "status") out.status = val ?? null;
    if (key === "manual_url" || key === "manual url") out.manual_url = val ?? null;

    if (key === "rental_price" || key === "price") {
      const num = val == null ? null : Number(String(val).replace(/[^0-9.\-]/g, ""));
      out.rental_price = Number.isFinite(num as number) ? (num as number) : null;
    }
  });
  return out;
}

export default function ImportGearDialog({
  onImported,
  open,
  onOpenChange,
  showTriggerButton = true,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const validRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.internal_id && String(r.internal_id).trim().length > 0 &&
          r.category && String(r.category).trim().length > 0 &&
          r.status && String(r.status).trim().length > 0
      ),
    [rows]
  );

  const onFileSelected = (file: File | null) => {
    if (!file) return;
    setIsParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const data = (results.data as Record<string, any>[]).map(normalizeRow);
        setRows(data);
        setIsParsing(false);
        if (!results.errors || results.errors.length === 0) {
          toast.success(`Loaded ${data.length} row(s) from CSV`);
        } else {
          toast.message(`Loaded with ${results.errors.length} parser warning(s)`);
        }
      },
      error: (err) => {
        setIsParsing(false);
        toast.error(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      toast.error("No valid rows to import (require internal_id, category, status).");
      return;
    }
    setIsImporting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsImporting(false);
      toast.error("You must be logged in to import.");
      return;
    }

    const payload = validRows.map((r) => ({
      user_id: user.id,
      internal_id: String(r.internal_id).trim(),
      friendly_name: r.friendly_name ? String(r.friendly_name).trim() : null,
      category: String(r.category).trim(),
      sub_type: r.sub_type ? String(r.sub_type).trim() : null,
      brand: r.brand ? String(r.brand).trim() : null,
      model: r.model ? String(r.model).trim() : null,
      size: r.size ? String(r.size).trim() : null,
      status: String(r.status).trim(),
      rental_price: r.rental_price ?? 0,
      manual_url: r.manual_url ? String(r.manual_url).trim() : null,
    }));

    const { error } = await supabase.from("gear_items").insert(payload);
    setIsImporting(false);

    if (error) {
      toast.error(`Import failed: ${error.message}`);
      return;
    }
    toast.success(`Imported ${payload.length} gear item(s).`);
    setDialogOpen(false);
    setRows([]);
    onImported?.();
  };

  const resetAndClose = () => {
    setDialogOpen(false);
    setRows([]);
    setIsParsing(false);
    setIsImporting(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(v) => (v ? setDialogOpen(true) : resetAndClose())}>
      {showTriggerButton && (
        <DialogTrigger asChild>
          <Button variant="secondary">Import from CSV</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Gear from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with headers: internal_id, friendly_name, category, sub_type, brand, model, size, status, rental_price, manual_url. Required: internal_id, category, status.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="csv">CSV File</Label>
              <Input
                id="csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
                disabled={isParsing}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Required: internal_id, category, status. Optional: other fields listed above. Extra columns are ignored.
            </p>
            {isParsing && <p className="text-sm">Parsing CSV…</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              Total rows: {rows.length}. Rows to import (valid): {validRows.length}.
            </div>
            <div className="relative w-full overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Internal ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sub-Type</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rental Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{r.internal_id || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{r.friendly_name || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{r.category || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{r.sub_type || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{r.brand || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{r.model || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{r.size || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{r.status || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{r.rental_price ?? <span className="text-muted-foreground">-</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isImporting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleConfirmImport}
            disabled={rows.length === 0 || isImporting || validRows.length === 0}
          >
            {isImporting ? "Importing…" : "Confirm Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}