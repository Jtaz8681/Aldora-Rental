"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client"; // Changed from default to named import
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type GearItem = {
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

export default function GearPage() {
  const [gear, setGear] = useState<GearItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("gear_items")
        .select("id, internal_id, friendly_name, category, sub_type, brand, model, size, status, rental_price, manual_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setGear(data || []);
    };
    load();
  }, []);

  const filtered = statusFilter ? gear.filter(g => g.status === statusFilter) : gear;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Gear</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option>Available</option>
            <option>Checked-Out</option>
            <option>Overdue</option>
            <option>In Maintenance</option>
            <option>Quarantined</option>
            <option>Retired</option>
          </select>
          <Link href="/gear/new"><Button>Add Gear</Button></Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand/Model</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono">{g.internal_id}</TableCell>
                <TableCell>{g.friendly_name || "-"}</TableCell>
                <TableCell>{g.category}{g.sub_type ? ` / ${g.sub_type}` : ""}</TableCell>
                <TableCell>{[g.brand, g.model].filter(Boolean).join(" ") || "-"}</TableCell>
                <TableCell>{g.size || "-"}</TableCell>
                <TableCell><Badge variant="secondary">{g.status}</Badge></TableCell>
                <TableCell>${Number(g.rental_price || 0).toFixed(2)}</TableCell>
                <TableCell className="space-x-2">
                  {g.manual_url ? (
                    <a href={g.manual_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Manual</a>
                  ) : (
                    <span className="text-xs text-muted-foreground">No manual</span>
                  )}
                  <Link href={`/gear/new`} className="text-sm underline">Edit</Link>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No gear found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}