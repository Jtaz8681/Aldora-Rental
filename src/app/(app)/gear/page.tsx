"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { badgeVariantForGearStatus } from "@/lib/status";
import { formatCurrency } from "@/lib/format";
import GearActions from "@/components/GearActions";

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
  category_id?: string | null;
  subcategory_id?: string | null;
};

type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };

export default function GearPage() {
  const [gear, setGear] = useState<GearItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadGear = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("gear_items")
      .select(
        "id, internal_id, friendly_name, category, sub_type, brand, model, size, status, rental_price, manual_url, category_id, subcategory_id",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (statusFilter) query = query.eq("status", statusFilter);

    if (selectedCategoryId) {
      const catName = categories.find((c) => c.id === selectedCategoryId)?.name;
      if (catName) {
        query = query.ilike("category", `%${catName}%`);
      } else {
        query = query.eq("category_id", selectedCategoryId);
      }
    }

    if (selectedSubcategoryId) {
      const subName = subcategories.find((s) => s.id === selectedSubcategoryId)?.name;
      if (subName) {
        query = query.ilike("sub_type", `%${subName}%`);
      } else {
        query = query.eq("subcategory_id", selectedSubcategoryId);
      }
    }

    if (search.trim()) {
      const s = search.trim();
      query = query.or(
        `internal_id.ilike.%${s}%,friendly_name.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%,size.ilike.%${s}%`
      );
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    setGear((data as GearItem[] | null) ?? []);
    setTotal(count ?? 0);
  }, [page, pageSize, search, statusFilter, selectedCategoryId, selectedSubcategoryId, categories, subcategories]);

  useEffect(() => {
    loadGear();
  }, [loadGear]);

  useEffect(() => {
    const loadFilters = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cats } = await supabase
        .from("gear_categories")
        .select("id, name")
        .order("name", { ascending: true });

      const { data: subs } = await supabase
        .from("gear_subcategories")
        .select("id, name, category_id")
        .order("name", { ascending: true });

      setCategories((cats as Category[] | null) ?? []);
      setSubcategories((subs as Subcategory[] | null) ?? []);
    };
    loadFilters();
  }, []);

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

  const filteredSubcategories = selectedCategoryId
    ? subcategories.filter((s) => s.category_id === selectedCategoryId)
    : subcategories;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Gear</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search ID, Name, Brand, Model, Size"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64"
          />
          <select
            className="border rounded px-2 py-1 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option>Available</option>
            <option>Checked-Out</option>
            <option>Overdue</option>
            <option>In Maintenance</option>
            <option>Quarantined</option>
            <option>Retired</option>
          </select>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setSelectedSubcategoryId("");
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={selectedSubcategoryId}
            onChange={(e) => {
              setSelectedSubcategoryId(e.target.value);
              setPage(1);
            }}
            disabled={!selectedCategoryId && filteredSubcategories.length > 0}
          >
            <option value="">All Subcategories</option>
            {filteredSubcategories.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <GearActions onImported={loadGear} />
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
            {gear.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono">
                  <Link href={`/gear/${g.id}`} className="underline">{g.internal_id}</Link>
                </TableCell>
                <TableCell>{g.friendly_name || "-"}</TableCell>
                <TableCell>{g.category}{g.sub_type ? ` / ${g.sub_type}` : ""}</TableCell>
                <TableCell>{[g.brand, g.model].filter(Boolean).join(" ") || "-"}</TableCell>
                <TableCell>{g.size || "-"}</TableCell>
                <TableCell><Badge variant={badgeVariantForGearStatus(g.status)}>{g.status}</Badge></TableCell>
                <TableCell>{formatCurrency(g.rental_price)}</TableCell>
                <TableCell className="space-x-2">
                  {g.manual_url ? (
                    <a href={g.manual_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Manual</a>
                  ) : (
                    <span className="text-xs text-muted-foreground">No manual</span>
                  )}
                  <Link href={`/gear/${g.id}/edit`} className="text-sm underline">Edit</Link>
                </TableCell>
              </TableRow>
            ))}
            {gear.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No gear found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
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