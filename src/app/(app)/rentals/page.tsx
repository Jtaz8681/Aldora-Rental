"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from "@/components/ui/pagination";
import { formatDateTime, formatCurrency } from "@/lib/format";
import { badgeVariantForRentalStatus } from "@/lib/status";

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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      setPage(1);
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

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };
  const from = (page - 1) * pageSize;
  const displayed = filtered.slice(from, from + pageSize);

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
          <Input
            id="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. Jane Doe"
          />
        </div>
        <div>
          <Label htmlFor="status">Filter by status</Label>
          <select
            id="status"
            className="border rounded px-2 py-2 w-full"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
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
          {displayed.map(r => {
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
                <TableCell>{formatDateTime(r.start_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{formatDateTime(r.expected_end_at)}</span>
                    {overdue && <Badge variant="destructive">Overdue</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={badgeVariantForRentalStatus(r.status)}>{r.status}</Badge>
                </TableCell>
                <TableCell>{formatCurrency(r.total_cost)}</TableCell>
                <TableCell className="space-x-2">
                  <Link className="underline text-sm" href={`/rentals/${r.id}`}>View Rental</Link>
                  <Link className="underline text-sm" href={`/customers/${r.customer_id}`}>View Customer</Link>
                  <Link className="underline text-sm" href={`/returns`}>Return</Link>
                </TableCell>
              </TableRow>
            );
          })}
          {displayed.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                No rentals found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableCaption>Active and overdue rentals are highlighted for quick action.</TableCaption>
      </Table>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              const size = Number(v);
              setPageSize(size);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {total === 0
              ? "0 results"
              : `${from + 1}–${Math.min(from + pageSize, total)} of ${total}`}
          </span>
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
              />
            </PaginationItem>

            {getPageNumbers().map((p, idx) =>
              p === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(p as number);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}