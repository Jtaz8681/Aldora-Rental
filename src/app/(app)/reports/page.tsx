"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import ServiceScheduleCalendar from "@/components/ServiceScheduleCalendar";
import Link from "next/link";
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

type Gear = { id: string; internal_id: string; category: string; date_added: string | null; purchase_date: string | null; rental_price: number | null; service_interval_months?: number | null };
type RentalItem = { gear_id: string; rentals: { start_at: string; expected_end_at: string; status: string } | null };
type Ticket = { id: string; gear_id: string | null; status: string; cost: number | null; updated_at: string | null; date_received: string | null };
type Damage = { id: string; gear_id: string; user_id: string; severity: string | null; estimate_cost: number | null; reported_at: string | null };
type Rental = { id: string; customer_id: string; start_at: string; expected_end_at: string; status: string; customers?: { name: string; phone: string | null; email: string | null } | null };

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [gear, setGear] = useState<Gear[]>([]);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [damages, setDamages] = useState<Damage[]>([]);
  const [overdueRentals, setOverdueRentals] = useState<Rental[]>([]);
  const [serviceDueSoon, setServiceDueSoon] = useState<any[]>([]);

  // Utilization filters and pagination
  const [utilSearch, setUtilSearch] = useState("");
  const [utilCategory, setUtilCategory] = useState<string>("all");
  const [utilProfitability, setUtilProfitability] = useState<string>("all"); // all | profitable | unprofitable
  const [utilPage, setUtilPage] = useState(1);
  const UTIL_PAGE_SIZE = 10;

  // Damage filters and pagination
  const [damageSearch, setDamageSearch] = useState("");
  const [damageSeverity, setDamageSeverity] = useState<string>("all");
  const [damagePage, setDamagePage] = useState(1);
  const DAMAGE_PAGE_SIZE = 10;

  // Overdue filters and pagination
  const [overdueSearch, setOverdueSearch] = useState("");
  const [overdueStatus, setOverdueStatus] = useState<string>("all");
  const [overduePage, setOverduePage] = useState(1);
  const OVERDUE_PAGE_SIZE = 10;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: gearData } = await supabase
        .from("gear_items")
        .select("id, internal_id, category, date_added, purchase_date, rental_price, service_interval_months");

      const { data: rentalItemData } = await supabase
        .from("rental_items")
        .select("gear_id, rentals(start_at, expected_end_at, status)");

      const { data: ticketData } = await supabase
        .from("maintenance_tickets")
        .select("id, gear_id, status, cost, updated_at, date_received");

      const { data: damageData } = await supabase
        .from("damage_reports")
        .select("id, gear_id, user_id, severity, estimate_cost, reported_at");

      const { data: rentalData } = await supabase
        .from("rentals")
        .select("id, customer_id, start_at, expected_end_at, status, customers(name, phone, email)");

      const { data: settings } = await supabase
        .from("service_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      setGear(gearData || []);
      setRentalItems((rentalItemData || []) as unknown as RentalItem[]);
      setTickets(ticketData || []);
      setDamages(damageData || []);

      // Overdue rentals report
      const overdueRaw = (rentalData || []).filter(r => ["active", "checked-out"].includes(r.status) && new Date(r.expected_end_at).getTime() < Date.now());
      const overdueNorm: Rental[] = overdueRaw.map((r: any) => ({
        id: r.id,
        customer_id: r.customer_id,
        start_at: r.start_at,
        expected_end_at: r.expected_end_at,
        status: r.status,
        customers: Array.isArray(r.customers) ? (r.customers[0] ?? null) : (r.customers ?? null),
      }));
      setOverdueRentals(overdueNorm);

      // Service schedule projection: next 30/60/90 days based on last completed and intervals
      const regulatorMonths = Number(settings?.regulator_service_interval_months ?? 12);
      const bcdMonths = Number(settings?.bcd_service_interval_months ?? 12);
      const projections: any[] = [];
      for (const g of gearData || []) {
        const monthsField = Number((g as any).service_interval_months ?? 0);
        const months = monthsField > 0 ? monthsField : (
          g.category.toLowerCase().includes("reg") ? regulatorMonths :
          g.category.toLowerCase().includes("bcd") ? bcdMonths : 0
        );
        if (months <= 0) continue;
        const lastCompleted = (ticketData || [])
          .filter(t => t.gear_id === g.id && t.status === "completed" && t.updated_at)
          .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0];
        const anchorStr = lastCompleted?.updated_at || g.purchase_date || g.date_added || null;
        if (!anchorStr) continue;
        const nextDue = new Date(anchorStr);
        nextDue.setMonth(nextDue.getMonth() + months);
        const daysAway = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        projections.push({ gear: g as any, nextDue, daysAway });
      }
      setServiceDueSoon(projections.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime()));
      setLoading(false);

      // Reset pages on data load
      setUtilPage(1);
      setDamagePage(1);
      setOverduePage(1);
    })();
  }, []);

  // Utilization: count rental days per gear
  const rentalDaysByGear: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ri of rentalItems) {
      const s = ri.rentals?.start_at ? new Date(ri.rentals.start_at) : null;
      const e = ri.rentals?.expected_end_at ? new Date(ri.rentals.expected_end_at) : null;
      if (s && e) {
        const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) map[ri.gear_id] = (map[ri.gear_id] || 0) + diff;
      }
    }
    return map;
  }, [rentalItems]);

  // Profitability per item: Rental revenue (approx = rental_price * rentalDays) - maintenance costs
  const costByGear: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tickets) {
      if (t.gear_id && t.cost) map[t.gear_id] = (map[t.gear_id] || 0) + Number(t.cost);
    }
    return map;
  }, [tickets]);

  const utilization = useMemo(() => {
    const rows = (gear || [])
      .map(g => {
        const daysRented = rentalDaysByGear[g.id] || 0;
        const revenueApprox = daysRented * Number(g.rental_price || 0);
        const maintenanceCost = costByGear[g.id] || 0;
        const profitability = revenueApprox - maintenanceCost;

        // profitability per month owned
        const anchorStr = g.purchase_date || g.date_added || null;
        let monthsOwned = 0;
        if (anchorStr) {
          const anchor = new Date(anchorStr);
          const now = new Date();
          monthsOwned = Math.max(1, (now.getFullYear() - anchor.getFullYear()) * 12 + (now.getMonth() - anchor.getMonth()));
        }
        const profitPerMonth = monthsOwned > 0 ? profitability / monthsOwned : 0;

        return {
          gear: g,
          daysRented,
          revenueApprox,
          maintenanceCost,
          profitability,
          profitPerMonth,
        };
      })
      .sort((a, b) => b.daysRented - a.daysRented);

    return rows;
  }, [gear, rentalDaysByGear, costByGear]);

  // Maintenance cost by category (unchanged)
  const gearCategoryById: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of gear) map[g.id] = g.category;
    return map;
  }, [gear]);

  const costCategoryRows = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const t of tickets) {
      if (t.gear_id && t.cost != null) {
        const cat = gearCategoryById[t.gear_id] || "Unknown";
        byCat[cat] = (byCat[cat] || 0) + Number(t.cost || 0);
      }
    }
    return Object.entries(byCat)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [tickets, gearCategoryById]);

  const damageSummaryRaw = useMemo(() => (damages || []).map(d => ({
    gear_id: d.gear_id,
    severity: d.severity || "Unknown",
    estimate_cost: Number(d.estimate_cost || 0),
    reported_at: d.reported_at,
  })), [damages]);

  const gearCodeById: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of gear) map[g.id] = g.internal_id;
    return map;
  }, [gear]);

  // Generic pagination helper
  const getPageNumbers = (totalPages: number, page: number) => {
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

  // Derived filter options
  const utilCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const g of gear) set.add(g.category);
    return Array.from(set).sort();
  }, [gear]);

  const damageSeverityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of damages) set.add(d.severity || "Unknown");
    return Array.from(set).sort();
  }, [damages]);

  const overdueStatusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of overdueRentals) set.add(r.status);
    return Array.from(set).sort();
  }, [overdueRentals]);

  // Filters and pagination for Utilization
  const filteredUtilization = useMemo(() => {
    const s = utilSearch.trim().toLowerCase();
    return utilization.filter(u => {
      const matchSearch =
        !s ||
        u.gear.internal_id.toLowerCase().includes(s) ||
        u.gear.category.toLowerCase().includes(s);
      const matchCategory = utilCategory === "all" || u.gear.category === utilCategory;
      const matchProfit =
        utilProfitability === "all" ||
        (utilProfitability === "profitable" && u.profitability >= 0) ||
        (utilProfitability === "unprofitable" && u.profitability < 0);
      return matchSearch && matchCategory && matchProfit;
    });
  }, [utilization, utilSearch, utilCategory, utilProfitability]);

  const utilTotalPages = Math.max(1, Math.ceil(filteredUtilization.length / UTIL_PAGE_SIZE));
  const utilStart = (utilPage - 1) * UTIL_PAGE_SIZE;
  const utilSlice = filteredUtilization.slice(utilStart, utilStart + UTIL_PAGE_SIZE);

  // Filters and pagination for Damage
  const damageDisplay = useMemo(() => {
    return damageSummaryRaw.map(d => ({
      ...d,
      gear_code: gearCodeById[d.gear_id] || d.gear_id,
    })).sort((a, b) => {
      const ad = dDate(a.reported_at);
      const bd = dDate(b.reported_at);
      return bd - ad;
    });
  }, [damageSummaryRaw, gearCodeById]);

  function dDate(str: string | null) {
    return str ? new Date(str).getTime() : 0;
  }

  const filteredDamage = useMemo(() => {
    const s = damageSearch.trim().toLowerCase();
    return damageDisplay.filter(d => {
      const matchSearch =
        !s ||
        d.gear_code.toLowerCase().includes(s) ||
        d.severity.toLowerCase().includes(s);
      const matchSeverity = damageSeverity === "all" || d.severity === damageSeverity;
      return matchSearch && matchSeverity;
    });
  }, [damageDisplay, damageSearch, damageSeverity]);

  const damageTotalPages = Math.max(1, Math.ceil(filteredDamage.length / DAMAGE_PAGE_SIZE));
  const damageStart = (damagePage - 1) * DAMAGE_PAGE_SIZE;
  const damageSlice = filteredDamage.slice(damageStart, damageStart + DAMAGE_PAGE_SIZE);

  // Filters and pagination for Overdue Rentals
  const filteredOverdue = useMemo(() => {
    const s = overdueSearch.trim().toLowerCase();
    return overdueRentals
      .filter(r => {
        const matchSearch =
          !s ||
          (r.customers?.name || "n/a").toLowerCase().includes(s);
        const matchStatus = overdueStatus === "all" || r.status === overdueStatus;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(a.expected_end_at).getTime() - new Date(b.expected_end_at).getTime());
  }, [overdueRentals, overdueSearch, overdueStatus]);

  const overdueTotalPages = Math.max(1, Math.ceil(filteredOverdue.length / OVERDUE_PAGE_SIZE));
  const overdueStart = (overduePage - 1) * OVERDUE_PAGE_SIZE;
  const overdueSlice = filteredOverdue.slice(overdueStart, overdueStart + OVERDUE_PAGE_SIZE);

  // Reset pages when filters change
  useEffect(() => {
    setUtilPage(1);
  }, [utilSearch, utilCategory, utilProfitability]);

  useEffect(() => {
    setDamagePage(1);
  }, [damageSearch, damageSeverity]);

  useEffect(() => {
    setOverduePage(1);
  }, [overdueSearch, overdueStatus]);

  if (loading) return <div className="text-center text-muted-foreground">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <Card>
        <CardHeader><CardTitle>Gear Utilization & Profitability</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="w-64">
                <Input
                  placeholder="Search gear or category"
                  value={utilSearch}
                  onChange={(e) => setUtilSearch(e.target.value)}
                />
              </div>
              <Select value={utilCategory} onValueChange={(v) => setUtilCategory(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {utilCategoryOptions.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={utilProfitability} onValueChange={(v) => setUtilProfitability(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Profitability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="profitable">Profitable</SelectItem>
                  <SelectItem value="unprofitable">Not profitable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredUtilization.length === 0
                ? "0 results"
                : `${utilStart + 1}–${Math.min(utilStart + UTIL_PAGE_SIZE, filteredUtilization.length)} of ${filteredUtilization.length}`}
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gear</TableHead>
                <TableHead>Days Rented</TableHead>
                <TableHead>Revenue (approx)</TableHead>
                <TableHead>Maintenance Cost</TableHead>
                <TableHead>Profitability</TableHead>
                <TableHead>Profit / mo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {utilSlice.map(u => (
                <TableRow key={u.gear.id}>
                  <TableCell className="font-mono">
                    <Link href={`/gear/${u.gear.id}`} className="underline">
                      {u.gear.internal_id}
                    </Link>
                  </TableCell>
                  <TableCell>{u.daysRented}</TableCell>
                  <TableCell>${u.revenueApprox.toFixed(2)}</TableCell>
                  <TableCell>${u.maintenanceCost.toFixed(2)}</TableCell>
                  <TableCell className={u.profitability >= 0 ? "text-green-600" : "text-destructive"}>
                    ${u.profitability.toFixed(2)}
                  </TableCell>
                  <TableCell className={u.profitPerMonth >= 0 ? "text-green-600" : "text-destructive"}>
                    ${u.profitPerMonth.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {utilSlice.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (utilPage > 1) setUtilPage(utilPage - 1);
                    }}
                  />
                </PaginationItem>

                {getPageNumbers(utilTotalPages, utilPage).map((p, idx) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`util-ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={`util-${p}`}>
                      <PaginationLink
                        href="#"
                        isActive={p === utilPage}
                        onClick={(e) => {
                          e.preventDefault();
                          setUtilPage(p as number);
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
                      if (utilPage < utilTotalPages) setUtilPage(utilPage + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Damage & Loss</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="w-64">
                <Input
                  placeholder="Search gear or severity"
                  value={damageSearch}
                  onChange={(e) => setDamageSearch(e.target.value)}
                />
              </div>
              <Select value={damageSeverity} onValueChange={(v) => setDamageSeverity(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {damageSeverityOptions.map(sev => (
                    <SelectItem key={sev} value={sev}>{sev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredDamage.length === 0
                ? "0 results"
                : `${damageStart + 1}–${Math.min(damageStart + DAMAGE_PAGE_SIZE, filteredDamage.length)} of ${filteredDamage.length}`}
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gear</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Reported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {damageSlice.map((d, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono">
                    <Link href={`/gear/${d.gear_id}`} className="underline">
                      {d.gear_code}
                    </Link>
                  </TableCell>
                  <TableCell>{d.severity}</TableCell>
                  <TableCell>${d.estimate_cost.toFixed(2)}</TableCell>
                  <TableCell>{d.reported_at ? format(new Date(d.reported_at), "PPp") : "-"}</TableCell>
                </TableRow>
              ))}
              {damageSlice.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No damage reports.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (damagePage > 1) setDamagePage(damagePage - 1);
                    }}
                  />
                </PaginationItem>

                {getPageNumbers(damageTotalPages, damagePage).map((p, idx) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`damage-ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={`damage-${p}`}>
                      <PaginationLink
                        href="#"
                        isActive={p === damagePage}
                        onClick={(e) => {
                          e.preventDefault();
                          setDamagePage(p as number);
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
                      if (damagePage < damageTotalPages) setDamagePage(damagePage + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Overdue Rentals</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="w-64">
                <Input
                  placeholder="Search customer"
                  value={overdueSearch}
                  onChange={(e) => setOverdueSearch(e.target.value)}
                />
              </div>
              <Select value={overdueStatus} onValueChange={(v) => setOverdueStatus(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {overdueStatusOptions.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredOverdue.length === 0
                ? "0 results"
                : `${overdueStart + 1}–${Math.min(overdueStart + OVERDUE_PAGE_SIZE, filteredOverdue.length)} of ${filteredOverdue.length}`}
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Expected End</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueSlice.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.customers?.name || "N/A"}</TableCell>
                  <TableCell>{format(new Date(r.start_at), "PPP")}</TableCell>
                  <TableCell className="text-destructive">{format(new Date(r.expected_end_at), "PPP")}</TableCell>
                  <TableCell>{r.status}</TableCell>
                </TableRow>
              ))}
              {overdueSlice.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No overdue rentals.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (overduePage > 1) setOverduePage(overduePage - 1);
                    }}
                  />
                </PaginationItem>

                {getPageNumbers(overdueTotalPages, overduePage).map((p, idx) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`overdue-ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={`overdue-${p}`}>
                      <PaginationLink
                        href="#"
                        isActive={p === overduePage}
                        onClick={(e) => {
                          e.preventDefault();
                          setOverduePage(p as number);
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
                      if (overduePage < overdueTotalPages) setOverduePage(overduePage + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Maintenance Cost by Category</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costCategoryRows.map((row) => (
                <TableRow key={row.category}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>${row.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {costCategoryRows.length === 0 && (
                <TableRow><TableCell colSpan={2} className="text-center text-sm text-muted-foreground">No maintenance costs yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ServiceScheduleCalendar
        projections={serviceDueSoon.map((s: any) => ({
          gear: { id: s.gear.id, internal_id: s.gear.internal_id, category: s.gear.category },
          nextDue: new Date(s.nextDue),
          daysAway: s.daysAway,
        }))}
      />
    </div>
  );
}