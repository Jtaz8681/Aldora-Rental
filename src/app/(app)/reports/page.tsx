"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";

type Gear = { id: string; internal_id: string; category: string; date_added: string | null; purchase_date: string | null; rental_price: number | null };
type RentalItem = { gear_id: string; rentals: { start_at: string; expected_end_at: string; status: string } | null };
type Ticket = { id: string; gear_id: string | null; status: string; cost: number | null; updated_at: string | null; date_received: string | null };
type Damage = { id: string; gear_id: string; user_id: string; severity: string | null; estimate_cost: number | null; reported_at: string | null };

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [gear, setGear] = useState<Gear[]>([]);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [damages, setDamages] = useState<Damage[]>([]);
  const [overdueRentals, setOverdueRentals] = useState<any[]>([]);
  const [serviceDueSoon, setServiceDueSoon] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: gearData } = await supabase
        .from("gear_items")
        .select("id, internal_id, category, date_added, purchase_date, rental_price")
        .eq("user_id", user.id);

      const { data: rentalItemData } = await supabase
        .from("rental_items")
        .select("gear_id, rentals(start_at, expected_end_at, status)")
        .eq("user_id", user.id);

      const { data: ticketData } = await supabase
        .from("maintenance_tickets")
        .select("id, gear_id, status, cost, updated_at, date_received")
        .eq("user_id", user.id);

      const { data: damageData } = await supabase
        .from("damage_reports")
        .select("id, gear_id, user_id, severity, estimate_cost, reported_at")
        .eq("user_id", user.id);

      const { data: rentalData } = await supabase
        .from("rentals")
        .select("id, customer_id, start_at, expected_end_at, status, customers(name, phone, email)")
        .eq("user_id", user.id);

      const { data: settings } = await supabase
        .from("service_settings")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      setGear(gearData || []);
      setRentalItems(rentalItemData || []);
      setTickets(ticketData || []);
      setDamages(damageData || []);

      // Overdue rentals report
      const overdue = (rentalData || []).filter(r => ["active", "checked-out"].includes(r.status) && new Date(r.expected_end_at).getTime() < Date.now());
      setOverdueRentals(overdue);

      // Service schedule projection: next 30/60/90 days based on last completed and intervals
      const regulatorMonths = Number(settings?.regulator_service_interval_months ?? 12);
      const bcdMonths = Number(settings?.bcd_service_interval_months ?? 12);
      const projections: any[] = [];
      for (const g of gearData || []) {
        const lastCompleted = (ticketData || [])
          .filter(t => t.gear_id === g.id && t.status === "completed" && t.updated_at)
          .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0];
        const anchorStr = lastCompleted?.updated_at || g.purchase_date || g.date_added || null;
        if (!anchorStr) continue;
        const nextDue = new Date(anchorStr);
        if (g.category.toLowerCase().includes("reg")) {
          nextDue.setMonth(nextDue.getMonth() + regulatorMonths);
        } else if (g.category.toLowerCase().includes("bcd")) {
          nextDue.setMonth(nextDue.getMonth() + bcdMonths);
        } else {
          continue;
        }
        const daysAway = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        projections.push({ gear: g, nextDue, daysAway });
      }
      setServiceDueSoon(projections.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime()));
      setLoading(false);
    })();
  }, []);

  // Utilization: count rental days per gear
  const rentalDaysByGear: Record<string, number> = {};
  for (const ri of rentalItems) {
    const s = ri.rentals?.start_at ? new Date(ri.rentals.start_at) : null;
    const e = ri.rentals?.expected_end_at ? new Date(ri.rentals.expected_end_at) : null;
    if (s && e) {
      const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) rentalDaysByGear[ri.gear_id] = (rentalDaysByGear[ri.gear_id] || 0) + diff;
    }
  }

  // Profitability per item: Rental revenue (approx = rental_price * rentalDays) - maintenance costs
  const costByGear: Record<string, number> = {};
  for (const t of tickets) {
    if (t.gear_id && t.cost) costByGear[t.gear_id] = (costByGear[t.gear_id] || 0) + Number(t.cost);
  }

  const utilization = (gear || [])
    .map(g => ({
      gear: g,
      daysRented: rentalDaysByGear[g.id] || 0,
      revenueApprox: (rentalDaysByGear[g.id] || 0) * Number(g.rental_price || 0),
      maintenanceCost: costByGear[g.id] || 0,
      profitability: ((rentalDaysByGear[g.id] || 0) * Number(g.rental_price || 0)) - (costByGear[g.id] || 0),
    }))
    .sort((a, b) => b.daysRented - a.daysRented);

  const damageSummary = (damages || []).map(d => ({
    gear_id: d.gear_id,
    severity: d.severity || "Unknown",
    estimate_cost: Number(d.estimate_cost || 0),
    reported_at: d.reported_at,
  }));

  if (loading) return <div className="text-center text-muted-foreground">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <Card>
        <CardHeader><CardTitle>Gear Utilization & Profitability</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gear</TableHead>
                <TableHead>Days Rented</TableHead>
                <TableHead>Revenue (approx)</TableHead>
                <TableHead>Maintenance Cost</TableHead>
                <TableHead>Profitability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {utilization.map(u => (
                <TableRow key={u.gear.id}>
                  <TableCell className="font-mono">{u.gear.internal_id}</TableCell>
                  <TableCell>{u.daysRented}</TableCell>
                  <TableCell>${u.revenueApprox.toFixed(2)}</TableCell>
                  <TableCell>${u.maintenanceCost.toFixed(2)}</TableCell>
                  <TableCell className={u.profitability >= 0 ? "text-green-600" : "text-destructive"}>
                    ${u.profitability.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {utilization.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Damage & Loss</CardTitle></CardHeader>
        <CardContent>
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
              {damageSummary.map((d, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono">{d.gear_id}</TableCell>
                  <TableCell>{d.severity}</TableCell>
                  <TableCell>${d.estimate_cost.toFixed(2)}</TableCell>
                  <TableCell>{d.reported_at ? format(new Date(d.reported_at), "PPp") : "-"}</TableCell>
                </TableRow>
              ))}
              {damageSummary.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No damage reports.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Overdue Rentals</CardTitle></CardHeader>
        <CardContent>
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
              {overdueRentals.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.customers?.name || "N/A"}</TableCell>
                  <TableCell>{format(new Date(r.start_at), "PPP")}</TableCell>
                  <TableCell className="text-destructive">{format(new Date(r.expected_end_at), "PPP")}</TableCell>
                  <TableCell>{r.status}</TableCell>
                </TableRow>
              ))}
              {overdueRentals.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No overdue rentals.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Service Schedule Projection (Next Due)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gear</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Days Away</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceDueSoon.map((s, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono">{s.gear.internal_id}</TableCell>
                  <TableCell>{s.gear.category}</TableCell>
                  <TableCell>{format(new Date(s.nextDue), "PPP")}</TableCell>
                  <TableCell>{s.daysAway}</TableCell>
                </TableRow>
              ))}
              {serviceDueSoon.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No projected services.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}