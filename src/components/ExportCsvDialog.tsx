"use client";

import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Field = {
  key: string;
  label: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: Field[];
  defaultSelected?: string[];
  filename: string; // example: "customers.csv"
  getRows: () => Promise<Record<string, any>[]>; // rows should include keys from 'fields'
};

export default function ExportCsvDialog({
  open,
  onOpenChange,
  fields,
  defaultSelected,
  filename,
  getRows,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected || fields.map(f => f.key)));

  useEffect(() => {
    if (open) {
      // Reset selection when opened
      setSelected(new Set(defaultSelected || fields.map(f => f.key)));
    }
  }, [open, fields, defaultSelected]);

  const allSelected = useMemo(() => selected.size === fields.length, [selected, fields.length]);
  const noneSelected = useMemo(() => selected.size === 0, [selected]);

  const toggleKey = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const selectAll = () => setSelected(new Set(fields.map(f => f.key)));
  const clearAll = () => setSelected(new Set());

  const handleExport = async () => {
    if (noneSelected) {
      toast.error("Please select at least one field to export.");
      return;
    }
    setExporting(true);
    const rows = await getRows();
    setExporting(false);

    if (!rows || rows.length === 0) {
      toast.message("No data to export.");
      onOpenChange(false);
      return;
    }

    const selectedKeys = Array.from(selected);
    const pruned = rows.map((r) => {
      const out: Record<string, any> = {};
      selectedKeys.forEach((k) => {
        out[k] = r[k] ?? "";
      });
      return out;
    });

    const csv = Papa.unparse(pruned, { quotes: true });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${rows.length} item(s).`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export CSV</DialogTitle>
          <DialogDescription>
            Choose which fields to include in your export file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={selectAll} disabled={allSelected}>
              Select all
            </Button>
            <Button variant="ghost" onClick={clearAll} disabled={noneSelected}>
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fields.map((f) => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selected.has(f.key)}
                  onCheckedChange={() => toggleKey(f.key)}
                />
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting || noneSelected}>
            {exporting ? "Exporting…" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}