"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { badgeVariantForRentalStatus } from "@/lib/status";
import { formatCurrency } from "@/lib/format";

type GearItem = {
  id: string;
  status: string;
};

// NEW: minimal gear type for service projection
type GearLite = { id: string; internal_id?: string; category: string; date_added?: string | null; purchase_date?: string | null; service_interval_months?: number | null };

// NEW: projection type
type ServiceProjection = { gear: GearLite; nextDue: Date; daysAway: number };

type Customer = {
  id: string;
  balance_due: number;
};

type Rental = {
  id: string;
  customer_id: string;
  start_at: string;
  expected_end_at: string;
  status: string;
  total_cost: number | null;
  customers: { name: string } | null;
};

export default function DashboardPage() {
  const [totalGear, setTotalGear] = useState(0);
  const [availableGear, setAvailableGear] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [activeRentalsCount, setActiveRentalsCount] = useState(0);
  const [totalBalanceDue, setTotalBalanceDue] = useState(0);
  const [recentRentals, setRecentRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  // NEW: dashboard alerts
  const [overdueRentalsCount, setOverdueRentalsCount] = useState(0);
  const [serviceDueCount, setServiceDueCount] = useState(0);
  const [serviceDueSoon, setServiceDueSoon] = useState<ServiceProjection[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch Gear Data (company-wide)
      const { data: gearData, error: gearError } = await supabase
        .from("gear_items")
        .select("id, status, internal_id, category, date_added, purchase_date, service_interval_months");
      if (gearError) console.error("Error fetching gear:", gearError);
      setTotalGear(gearData?.length || 0);
      setAvailableGear(gearData?.filter(g => g.status === "Available").length || 0);

      // Fetch Customer Data (company-wide)
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, balance_due");
      if (customerError) console.error("Error fetching customers:", customerError);
      setTotalCustomers(customerData?.length || 0);
      setTotalBalanceDue(customerData?.reduce((sum, c) => sum + Number(c.balance_due || 0), 0) || 0);

      // Fetch Rental Data (recent list - unchanged per-user)
      const { data: rentalData, error: rentalError } = await supabase
        .from("rentals")
        .select("id, customer_id, start_at, expected_end_at, status, total_cost, customers(name)")
        .eq("user_id", user.id) // unchanged: recent list can remain scoped
        .order("created_at", { ascending: false })
        .limit(5);
      if (rentalError) console.error("Error fetching rentals:", rentalError);
      setRecentRentals((rentalData || []) as unknown as Rental[]);

      // Overdue rentals count and active rentals count (company-wide)
      const { data: activeAll } = await supabase
        .from("rentals")
        .select("id, expected_end_at, status")
        .in("status", ["active", "checked-out"]);
      const overdueCount = (activeAll || []).filter(r => new Date(r.expected_end_at).getTime() < Date.now()).length;
      setOverdueRentalsCount(overdueCount);
      setActiveRentalsCount(activeAll?.length || 0);

      // Maintenance tickets (company-wide)
      const { data: ticketData } = await supabase
        .from("maintenance_tickets")
        .select("gear_id, status, updated_at");

      // Service projections across all gear
      const projections: ServiceProjection[] = [];
      for (const g of gearData || []) {
        const months = Number((g as any).service_interval_months ?? 0);
        if (months <= 0) continue;

        const lastCompleted = (ticketData || [])
          .filter(t => t.gear_id === g.id && t.status === "completed" && t.updated_at)
          .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0];

        const anchorStr = lastCompleted?.updated_at || (g as any).purchase_date || (g as any).date_added || null;
        if (!anchorStr) continue;

        const nextDue = new Date(anchorStr);
        nextDue.setMonth(nextDue.getMonth() + months);
        const daysAway = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        projections.push({
          gear: { id: g.id, internal_id: (g as any).internal_id, category: (g as any).category, date_added: (g as any).date_added, purchase_date: (g as any).purchase_date },
          nextDue,
          daysAway,
        });
      }
      const sorted = projections.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
      setServiceDueSoon(sorted);
      setServiceDueCount(sorted.filter(p => p.daysAway >= 0 && p.daysAway <= 30).length);

      setLoading(false);
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gear Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGear}</div>
            <p className="text-xs text-muted-foreground">
              {availableGear} available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalBalanceDue)} outstanding balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRentalsCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently checked out
            </p>
          </CardContent>
        </Card>
      </div>

      {/* NEW: Alerts row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Rentals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueRentalsCount}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/rentals" className="underline">View rentals</Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Due Soon (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceDueCount}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/maintenance" className="underline">Go to Maintenance</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* NEW: Compact upcoming service list */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Upcoming Service</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gear</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Away</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceDueSoon.slice(0, 5).map((p, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono">
                    <Link href={`/gear/${p.gear.id}`} className="underline">
                      {p.gear.internal_id || p.gear.id}
                    </Link>
                  </TableCell>
                  <TableCell>{p.gear.category}</TableCell>
                  <TableCell>{format(p.nextDue, 'PPP')}</TableCell>
                  <TableCell className={p.daysAway < 0 ? "text-destructive" : ""}>{p.daysAway}</TableCell>
                  <TableCell>
                    <Link href="/maintenance" className="text-sm underline">Review</Link>
                  </TableCell>
                </TableRow>
              ))}
              {serviceDueSoon.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No upcoming service due.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Rentals</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Expected End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRentals.map(r => {
                const overdue = (r.status === "active" || r.status === "checked-out") && new Date(r.expected_end_at).getTime() < Date.now();
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.customers?.name || "N/A"}</TableCell>
                    <TableCell>{format(new Date(r.start_at), 'PPP')}</TableCell>
                    <TableCell className={overdue ? "text-destructive" : ""}>
                      {format(new Date(r.expected_end_at), 'PPP')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariantForRentalStatus(r.status)}>
                        {overdue ? "Overdue" : r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>${Number(r.total_cost || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Link href={`/customers/${r.customer_id}`} className="text-sm underline">View Customer</Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {recentRentals.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No recent rentals found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}