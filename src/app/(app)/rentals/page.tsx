"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Rental = {
  id: string;
  customer_id: string;
  start_at: string;
  expected_end_at: string;
  status: string;
  total_cost: number | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
};

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rs } = await supabase
        .from("rentals")
        .select("id, customer_id, start_at, expected_end_at, status, total_cost, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const { data: cs } = await supabase
        .from("customers")
        .select("id, name")
        .eq("user_id", user.id);

      const custMap: Record<string, Customer> = {};
      (cs || []).forEach(c => { custMap[c.id] = c as Customer; });

      setCustomers(custMap);
      setRentals(rs || []);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return rentals.filter(r => {
      const name = customers[r.customer_id]?.name?.toLowerCase() || "";
      const matchesSearch = name.includes(search.toLowerCase());
      const overdue = r.status !== "returned" && new Date(r.expected_end_at).getTime() < now;
      if (statusFilter === "All") return matchesSearch;
      if (statusFilter === "Overdue") return matchesSearch && overdue;
      return matchesSearch && r.status === statusFilter;
    });
  }, [rentals, customers, search, statusFilter]);

  const statusVariant = (status: string) => {
    switch (status) {
      case "returned": return "secondary";
      case "checked-out": return "default";
      case "overdue": return "destructive";
      case "draft": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Rentals</h1>
        <div className="flex gap-2">
          <Link href="/rentals/new"><Button>New Rental</Button></Link>
          <Link href="/returns"><Button variant="secondary">Open Returns</Button></Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Label htmlFor="search">Search by customer</Label>
          <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Jane Doe" />
        </div>
        <div>
          <Label htmlFor="status">Filter by status</Label>
          <select id="status" className="border rounded px-2 py-2 w-full" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            <option>draft</option>
            <option>checked-out</option>
            <option>returned</option>
            <option>Overdue</option>
          </select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>Expected End</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(r => {
            const customer = customers[r.customer_id];
            const overdue = r.status !== "returned" && new Date(r.expected_end_at).getTime() < Date.now();
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{customer?.name || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">{r.id}</span>
                  </div>
                </TableCell>
                <TableCell>{new Date(r.start_at).toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{new Date(r.expected_end_at).toLocaleString()}</span>
                    {overdue && <Badge variant="destructive">Overdue</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </TableCell>
                <TableCell>${Number(r.total_cost || 0).toFixed(2)}</TableCell>
                <TableCell className="space-x-2">
                  <Link className="underline text-sm" href={`/rentals/${r.id}`}>View Rental</Link> {/* Added this link */}
                  <Link className="underline text-sm" href={`/customers/${r.customer_id}`}>View Customer</Link>
                  <Link className="underline text-sm" href={`/returns`}>Return</Link>
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                No rentals found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableCaption>Active and overdue rentals are highlighted for quick action.</TableCaption>
      </Table>
    </div>
  );
}