"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignaturePad from "@/components/SignaturePad";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PickList from "@/components/PickList";
import { roundToTwo } from "@/lib/format";
import { ensureDefaultTemplate } from "@/lib/checklists";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { loadPickListSettings } from "@/lib/picklist";
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

type Customer = { id: string; name: string };
type Gear = {
  id: string;
  internal_id: string;
  category: string;
  rental_price: number;
  status: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  checklist_template_pre?: Record<string, string> | null;
  brand?: string | null;
  model?: string | null;
  size?: string | null;
  serial_number?: string | null;
  home_location?: string | null;
};

type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };

export default function NewRentalPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Gear data (paginated + filtered)
  const [gear, setGear] = useState<Gear[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Pre-checklist templates per category
  const [categoryPreTemplates, setCategoryPreTemplates] = useState<Record<string, Record<string, string>>>({});

  // Selection and rental details
  const [customerId, setCustomerId] = useState("");
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");
  const [selectedGearIds, setSelectedGearIds] = useState<string[]>([]);
  const [packageIncludedIds, setPackageIncludedIds] = useState<string[]>([]);
  const [signature, setSignature] = useState<string>("");

  const [isPackage, setIsPackage] = useState(false);
  const [packagePerDay, setPackagePerDay] = useState<string>("");

  const [checklist, setChecklist] = useState<Record<string, Record<string, boolean>>>({});
  const [conflictsByGear, setConflictsByGear] = useState<Record<string, { rentalId: string; start_at: string; expected_end_at: string }[]>>({});
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Modal flow state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"signature" | "picklist">("signature");

  // Load customers once
  useEffect(() => {
    const loadCustomers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: c } = await supabase.from("customers").select("id,name").order("name");
      setCustomers(c || []);
    };
    loadCustomers();
  }, []);

  // Load categories/subcategories for filters
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

  // Load gear with filters + pagination
  const loadGear = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("gear_items")
      .select(
        "id, internal_id, category, rental_price, status, category_id, subcategory_id, checklist_template_pre, brand, model, size, serial_number, home_location",
        { count: "exact" }
      )
      .eq("status", "Available")
      .order("internal_id", { ascending: true });

    if (selectedCategoryId) query = query.eq("category_id", selectedCategoryId);
    if (selectedSubcategoryId) query = query.eq("subcategory_id", selectedSubcategoryId);
    if (search.trim()) {
      const s = search.trim();
      query = query.or(
        `internal_id.ilike.%${s}%,friendly_name.ilike.%${s}%,brand.ilike.%${s}%,model.ilike.%${s}%,size.ilike.%${s}%`
      );
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    const g = (data as Gear[] | null) ?? [];
    setGear(g);
    setTotal(count ?? 0);

    // Load checklist templates for the categories present on this page
    const catIds = Array.from(new Set(g.map((x: any) => x.category_id).filter(Boolean)));
    if (catIds.length) {
      const { data: cats } = await supabase
        .from("gear_categories")
        .select("id, checklist_template_pre")
        .in("id", catIds);
      const map: Record<string, Record<string, string>> = {};
      (cats || []).forEach((cat: any) => {
        map[cat.id] = (cat.checklist_template_pre as any) || {};
      });
      setCategoryPreTemplates(map);
    } else {
      setCategoryPreTemplates({});
    }
  }, [page, pageSize, search, selectedCategoryId, selectedSubcategoryId]);

  useEffect(() => {
    loadGear();
  }, [loadGear]);

  // Conflict check whenever dates or selected items change
  useEffect(() => {
    const run = async () => {
      if (!startAt || !endAt || selectedGearIds.length === 0) {
        setConflictsByGear({});
        return;
      }
      setCheckingConflicts(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingConflicts(false);
        return;
      }

      const { data: items } = await supabase
        .from("rental_items")
        .select("gear_id, rental_id, rentals(id, start_at, expected_end_at, status)")
        .in("gear_id", selectedGearIds);

      const conflicts: Record<string, { rentalId: string; start_at: string; expected_end_at: string }[]> = {};
      const start = new Date(startAt).getTime();
      const end = new Date(endAt).getTime();

      (items || []).forEach((row: any) => {
        const r = row.rentals;
        if (!r || r.status !== "active") return;
        const rStart = new Date(r.start_at).getTime();
        const rEnd = new Date(r.expected_end_at).getTime();
        const overlaps = !(rEnd < start || rStart > end);
        if (overlaps) {
          const gid = row.gear_id as string;
          conflicts[gid] = conflicts[gid] || [];
          conflicts[gid].push({
            rentalId: r.id,
            start_at: r.start_at,
            expected_end_at: r.expected_end_at,
          });
        }
      });

      setConflictsByGear(conflicts);
      setCheckingConflicts(false);
    };

    run();
  }, [startAt, endAt, selectedGearIds]);

  const hasConflicts = Object.keys(conflictsByGear).length > 0;

  const days = useMemo(() => {
    if (!startAt || !endAt) return 1;
    const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
    const d = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return Math.max(d, 1);
  }, [startAt, endAt]);

  // Compute total: package per-day price covers packageIncludedIds only; extras charged separately
  const total = useMemo(() => {
    const packageItemCount = packageIncludedIds.filter(id => selectedGearIds.includes(id)).length;
    const pkgPerDay = Number(packagePerDay || 0);
    const pkgContribution = isPackage && packageItemCount > 0 ? Math.max(pkgPerDay, 0) * days : 0;

    const extras = selectedGearIds
      .filter(id => !packageIncludedIds.includes(id))
      .reduce((sum, id) => {
        const g = gear.find(x => x.id === id);
        return sum + (Number(g?.rental_price || 0) * days);
      }, 0);

    return pkgContribution + extras;
  }, [isPackage, packagePerDay, packageIncludedIds, selectedGearIds, gear, days]);

  const toggleGear = (id: string) => {
    setSelectedGearIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];

      // If removing, also ensure it's not marked as package-included
      if (!next.includes(id)) {
        setPackageIncludedIds(p => p.filter(x => x !== id));
      } else if (isPackage) {
        // If adding and package pricing is enabled, default to included in package
        setPackageIncludedIds(p => (p.includes(id) ? p : [...p, id]));
      }

      // Initialize checklist defaults
      const gItem = gear.find(x => x.id === id);
      const rawTmpl = (gItem?.checklist_template_pre && Object.keys(gItem.checklist_template_pre).length
        ? gItem.checklist_template_pre
        : (gItem?.category_id ? categoryPreTemplates[gItem.category_id] || {} : {})) as Record<string, string>;
      const tmpl = ensureDefaultTemplate(rawTmpl);
      const defaults = Object.fromEntries(Object.keys(tmpl).map(k => [k, false]));
      setChecklist(prev => ({ ...prev, [id]: prev[id] || defaults }));

      return next;
    });
  };

  const togglePackageInclude = (id: string) => {
    if (!selectedGearIds.includes(id)) return;
    setPackageIncludedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const startFinalizeFlow = () => {
    if (!customerId || !startAt || !endAt || selectedGearIds.length === 0) {
      toast.error("Please complete all fields and select at least one item.");
      return;
    }
    if (isPackage) {
      const pkgPerDay = Number(packagePerDay);
      const packageItemCount = packageIncludedIds.filter(id => selectedGearIds.includes(id)).length;
      if (!packageItemCount) {
        toast.error("Include at least one item in the package or turn off package pricing.");
        return;
      }
      if (!packagePerDay || isNaN(pkgPerDay) || pkgPerDay <= 0) {
        toast.error("Enter a valid package price per day.");
        return;
      }
    }
    if (hasConflicts) {
      toast.error("Resolve gear conflicts before finalizing.");
      return;
    }
    setCheckoutStep("signature");
    setCheckoutOpen(true);
  };

  const submitRental = async () => {
    if (!signature) {
      toast.error("Please capture a signature.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rental, error: rentalErr } = await supabase.from("rentals").insert({
      user_id: user.id,
      customer_id: customerId,
      start_at: startAt,
      expected_end_at: endAt,
      signed_at: new Date().toISOString(),
      signature_data_url: signature,
      total_cost: total,
      status: "active"
    }).select("*").single();
    if (rentalErr) throw rentalErr;

    const packageItemCount = packageIncludedIds.filter(id => selectedGearIds.includes(id)).length;
    const pkgPerDay = Number(packagePerDay || 0);

    for (let idx = 0; idx < selectedGearIds.length; idx++) {
      const gearId = selectedGearIds[idx];
      const g = gear.find(x => x.id === gearId);
      const preChecklist = checklist[gearId] || {};

      let pricePerDay = Number(g?.rental_price || 0);
      let packageShareTotal: number | null = null;

      if (isPackage && packageIncludedIds.includes(gearId) && packageItemCount > 0) {
        // Divide package per-day across package-included items
        pricePerDay = roundToTwo(pkgPerDay / packageItemCount);
        packageShareTotal = roundToTwo((pkgPerDay * days) / packageItemCount);
      }

      await supabase.from("rental_items").insert({
        user_id: user.id,
        rental_id: rental.id,
        gear_id: gearId,
        price: pricePerDay, // price per day
        pre_checklist: preChecklist,
        package_share_total: packageShareTotal
      });

      await supabase.from("gear_items")
        .update({ status: "Checked-Out" })
        .eq("id", gearId);
    }

    const { error: balanceErr } = await supabase.rpc("increment_customer_balance", {
      p_user_id: user.id,
      p_customer_id: customerId,
      p_amount: total,
    });

    if (balanceErr) {
      const { data: cust } = await supabase
        .from("customers")
        .select("balance_due")
        .eq("user_id", user.id)
        .eq("id", customerId)
        .single();
      const current = Number(cust?.balance_due || 0);
      await supabase
        .from("customers")
        .update({ balance_due: current + total })
        .eq("user_id", user.id)
        .eq("id", customerId);
    }

    toast.success("Rental created and gear checked out");
    setCheckoutOpen(false);
    router.push(`/customers/${customerId}`);
  };

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
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">New Rental</h1>

      {hasConflicts && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTitle>Some selected gear is already booked</AlertTitle>
          <AlertDescription className="text-sm">
            Adjust your dates or remove the conflicting items below. You cannot finalize while conflicts exist.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Customer</Label>
          <select className="border rounded px-2 py-2 w-full" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {customerId && (
            <p className="mt-2 text-xs text-muted-foreground">
              Outstanding balance will be updated: ${Number(total || 0).toFixed(2)} added.
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <div>
            <Label>Start</Label>
            <Input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
          </div>
          <div>
            <Label>Expected End</Label>
            <Input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="isPackage">Use package pricing</Label>
          <Switch id="isPackage" checked={isPackage} onCheckedChange={(v) => {
            setIsPackage(!!v);
            if (!v) setPackageIncludedIds([]); // clear package-included when turning off
          }} />
        </div>
        {isPackage && (
          <div>
            <Label htmlFor="packagePerDay">Package price per day</Label>
            <Input
              id="packagePerDay"
              type="number"
              step="0.01"
              value={packagePerDay}
              onChange={(e) => setPackagePerDay(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The package price per day will be divided across item(s) you mark as “included in package”.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label className="block">Find Available Gear</Label>
        <div className="flex flex-col sm:flex-row items-center gap-2">
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
          >
            <option value="">All Subcategories</option>
            {filteredSubcategories.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {gear.map(g => {
            const conflicts = conflictsByGear[g.id] || [];
            const selected = selectedGearIds.includes(g.id);
            const packageIncluded = packageIncludedIds.includes(g.id);
            return (
              <label key={g.id} className="flex flex-col gap-2 border rounded p-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={selected} onCheckedChange={() => toggleGear(g.id)} />
                  <span className="text-sm">
                    {g.internal_id} · {g.category} · ${Number(g.rental_price || 0).toFixed(2)}/day
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {[g.brand, g.model, g.size].filter(Boolean).join(" · ") || ""}
                </div>
                {selected && isPackage && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={packageIncluded}
                      onCheckedChange={() => togglePackageInclude(g.id)}
                    />
                    Include in package
                  </label>
                )}
                {selected && conflicts.length > 0 && (
                  <span className="text-xs text-destructive">
                    Not available for selected dates (conflicts with {conflicts.length} rental{conflicts.length > 1 ? "s" : ""})
                  </span>
                )}
              </label>
            );
          })}
          {gear.length === 0 && <p className="text-sm text-muted-foreground">No available gear.</p>}
        </div>

        {hasConflicts && (
          <div className="space-y-2">
            {Object.entries(conflictsByGear).map(([gid, list]) => {
              const g = gear.find(x => x.id === gid);
              return (
                <div key={gid} className="text-xs">
                  <span className="font-medium">{g?.internal_id || "Gear"}:</span>{" "}
                  {list.map((c, i) => (
                    <span key={c.rentalId}>
                      {new Date(c.start_at).toLocaleDateString()} → {new Date(c.expected_end_at).toLocaleDateString()}
                      {i < list.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        )}
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

      {selectedGearIds.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pre-Rental Inspection</h2>
          {selectedGearIds.map(id => {
            const gItem = gear.find(x => x.id === id);
            const c = checklist[id] || {};
            const rawTmpl = (gItem?.checklist_template_pre && Object.keys(gItem.checklist_template_pre || {}).length
              ? (gItem?.checklist_template_pre as any)
              : (gItem?.category_id ? categoryPreTemplates[gItem.category_id] || {} : {})) as Record<string, string>;
            const tmpl = ensureDefaultTemplate(rawTmpl);
            return (
              <div key={id} className="border rounded p-3">
                <p className="font-medium text-sm mb-2">{gItem?.internal_id} · {gItem?.category}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {Object.entries(tmpl).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!c[key]}
                        onCheckedChange={(v) => setChecklist(prev => ({ ...prev, [id]: { ...prev[id], [key]: !!v } }))}
                      />
                      {label}
                    </label>
                  ))}
                  {Object.keys(tmpl).length === 0 && (
                    <span className="text-xs text-muted-foreground">No pre-checks configured for this category.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm">
          Total: <span className="font-semibold">${Number(total || 0).toFixed(2)}</span> ({days} day{days > 1 ? "s" : ""})
        </p>
        <div className="flex gap-2">
          <Button onClick={startFinalizeFlow} disabled={checkingConflicts || hasConflicts}>
            {checkingConflicts ? "Checking..." : "Finalize & Check Out"}
          </Button>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          {checkoutStep === "signature" && (
            <>
              <DialogHeader>
                <DialogTitle>Rental Waiver Signature</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <SignaturePad onChange={setSignature} />
              </div>
              <DialogFooter className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  if (!signature) {
                    toast.error("Please capture a signature before continuing.");
                    return;
                  }
                  setCheckoutStep("picklist");
                }}>
                  Save Signature
                </Button>
              </DialogFooter>
            </>
          )}

          {checkoutStep === "picklist" && (
            <>
              <DialogHeader>
                <DialogTitle>Pack List</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <PickList
                  customerName={customers.find(c => c.id === customerId)?.name || ""}
                  startAt={startAt}
                  endAt={endAt}
                  items={selectedGearIds.map(id => {
                    const gItem = gear.find(x => x.id === id);
                    const packageItemCount = packageIncludedIds.filter(pid => selectedGearIds.includes(pid)).length;
                    const pkgPerDay = Number(packagePerDay || 0);
                    const pricePerDay =
                      isPackage && packageIncludedIds.includes(id) && packageItemCount > 0
                        ? roundToTwo(pkgPerDay / packageItemCount)
                        : Number(gItem?.rental_price || 0);
                    return {
                      internal_id: gItem?.internal_id || "",
                      category: gItem?.category || "",
                      price: Number(pricePerDay || 0),
                      brand: gItem?.brand || undefined,
                      model: gItem?.model || undefined,
                      size: gItem?.size || undefined,
                      serial_number: gItem?.serial_number || undefined,
                      home_location: gItem?.home_location || undefined,
                    };
                  })}
                  total={total}
                  settings={loadPickListSettings()}
                />
              </div>
              <DialogFooter className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCheckoutOpen(false)}>Back</Button>
                <Button onClick={submitRental}>Complete Checkout</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}