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
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Props = {
  onImported?: () => void;
};

function normalizeRow(row: Record<string, any>): ParsedRow {
  const out: ParsedRow = {};
  Object.keys(row || {}).forEach((k) => {
    const key = String(k).trim().toLowerCase();
    const val = row[k];
    if (key === "name") out.name = val ?? null;
    if (key === "phone") out.phone = val ?? null;
    if (key === "email") out.email = val ?? null;
  });
  return out;
}

export default function ImportCustomersDialog({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const validRows = useMemo(
    () => rows.filter((r) => r.name && String(r.name).trim().length > 0),
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
      toast.error("No valid rows to import (missing 'name').");
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
      name: String(r.name).trim(),
      phone: r.phone ? String(r.phone).trim() : null,
      email: r.email ? String(r.email).trim() : null,
    }));

    const { error } = await supabase.from("customers").insert(payload);
    setIsImporting(false);

    if (error) {
      toast.error(`Import failed: ${error.message}`);
      return;
    }
    toast.success(`Imported ${payload.length} customer(s).`);
    setOpen(false);
    setRows([]);
    onImported?.();
  };

  const resetAndClose = () => {
    setOpen(false);
    setRows([]);
    setIsParsing(false);
    setIsImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button variant="secondary">Import from CSV</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with headers: name, phone, email. You will be able to review and confirm before importing.
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
              Required: name. Optional: phone, email. Extra columns are ignored.
            </p>
            {isParsing && <p className="text-sm">Parsing CSV…</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              Total rows: {rows.length}. Rows to import (with name): {validRows.length}.
            </div>
            <div className="relative w-full overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{r.name || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{r.phone || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{r.email || <span className="text-muted-foreground">-</span>}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length > 50 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs text-muted-foreground">
                        Showing first 50 rows of {rows.length}.
                      </TableCell>
                    </TableRow>
                  )}
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