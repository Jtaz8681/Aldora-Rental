"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MaintenanceTicketForm from "@/components/MaintenanceTicketForm";
import { format } from "date-fns";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import ServiceScheduleCalendar from "@/components/ServiceScheduleCalendar";

type Ticket = {
  id: string;
  user_id: string;
  gear_id: string | null;
  rental_id: string | null;
  damage_report_id: string | null;
  status: string;
  date_received: string;
  problem_description: string | null;
  assigned_technician: string | null;
  estimated_completion_date: string | null;
  cost: number | null;
  charge_customer: boolean | null;
  updated_at: string;
  gear_items?: { internal_id: string; category: string } | null;
};

type WorkLog = { id: string; description: string; created_at: string };
type Part = { id: string; part_name: string; quantity: number; unit_cost: number | null };

// NEW: Projection type for the calendar
type Projection = {
  gear: { id: string; internal_id: string; category: string };
  nextDue: Date;
  daysAway: number;
};

const STATUS_VARIANT = (status: string) => {
  switch (status) {
    case "pending": return "outline";
    case "in_progress": return "default";
    case "awaiting_parts": return "secondary";
    case "completed": return "secondary";
    default: return "outline";
  }
};

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [workLogs, setWorkLogs] = useState<Record<string, WorkLog[]>>({});
  const [parts, setParts] = useState<Record<string, Part[]>>({});
  const [loading, setLoading] = useState(true);
  const [statusUpdate, setStatusUpdate] = useState<Record<string, string>>({});
  const [costUpdate, setCostUpdate] = useState<Record<string, number>>({});
  const [chargeFlag, setChargeFlag] = useState<Record<string, boolean>>({});
  const [techUpdate, setTechUpdate] = useState<Record<string, string>>({});
  const [etaUpdate, setEtaUpdate] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");
  // NEW: list of available technicians from profiles
  const [technicians, setTechnicians] = useState<string[]>([]);
  // NEW: projections for ServiceScheduleCalendar
  const [projections, setProjections] = useState<Projection[]>([]);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Tickets with gear info (join via foreign key)
    const { data: tData, error: tErr } = await supabase
      .from("maintenance_tickets")
      .select("*, gear_items(internal_id, category)")
      .eq("user_id", user.id)
      .order("date_received", { ascending: false });

    if (tErr) {
      toast.error("Failed to load tickets: " + tErr.message);
      setLoading(false);
      return;
    }

    setTickets(tData || []);
    const ids = (tData || []).map(t => t.id);

    if (ids.length) {
      const { data: wlData } = await supabase
        .from("maintenance_work_logs")
        .select("*")
        .eq("user_id", user.id)
        .in("ticket_id", ids)
        .order("created_at", { ascending: false });

      const { data: pData } = await supabase
        .from("maintenance_parts")
        .select("*")
        .eq("user_id", user.id)
        .in("ticket_id", ids)
        .order("created_at", { ascending: false });

      const wlMap: Record<string, WorkLog[]> = {};
      (wlData || []).forEach(wl => {
        wlMap[wl.ticket_id] = [...(wlMap[wl.ticket_id] || []), wl];
      });
      const pMap: Record<string, Part[]> = {};
      (pData || []).forEach(pt => {
        pMap[pt.ticket_id] = [...(pMap[pt.ticket_id] || []), pt];
      });

      setWorkLogs(wlMap);
      setParts(pMap);
    } else {
      setWorkLogs({});
      setParts({});
    }

    // NEW: fetch profiles to populate technician picker
    const { data: techProfiles } = await supabase
      .from("profiles")
      .select("first_name, last_name, role")
      .in("role", ["technician", "manager", "owner"])
      .order("first_name", { ascending: true });

    const names = (techProfiles || [])
      .map(p => [p.first_name, p.last_name].filter(Boolean).join(" ").trim())
      .filter(Boolean);

    setTechnicians(Array.from(new Set(names))); // dedupe

    // NEW: Build service projections for the calendar
    const { data: settings } = await supabase
      .from("service_settings")
      .select("regulator_service_interval_months, bcd_service_interval_months")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const regulatorMonths = Number(settings?.regulator_service_interval_months ?? 12);
    const bcdMonths = Number(settings?.bcd_service_interval_months ?? 12);

    const { data: gearData } = await supabase
      .from("gear_items")
      .select("id, internal_id, category, date_added, purchase_date")
      .eq("user_id", user.id);

    const projectionsCalc: Projection[] = [];
    for (const g of gearData || []) {
      const cat = (g.category || "").toLowerCase();
      const months = cat.includes("reg")
        ? regulatorMonths
        : cat.includes("bcd")
          ? bcdMonths
          : 0;

      if (months <= 0) continue;

      const lastCompleted = (tData || [])
        .filter(t => t.gear_id === g.id && t.status === "completed" && t.updated_at)
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0];

      const anchorStr = (lastCompleted?.updated_at as string | undefined) || (g.purchase_date as string | null) || (g.date_added as string | null) || null;
      if (!anchorStr) continue;

      const nextDue = new Date(anchorStr);
      nextDue.setMonth(nextDue.getMonth() + months);
      const daysAway = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      projectionsCalc.push({
        gear: {
          id: g.id,
          internal_id: (g.internal_id as string | null) ?? g.id.slice(0, 8),
          category: g.category as string,
        },
        nextDue,
        daysAway,
      });
    }

    projectionsCalc.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
    setProjections(projectionsCalc);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // NEW: computed visible tickets based on filter
  const visibleTickets = useMemo(
    () => tickets.filter(t => (filterStatus === "all" ? true : t.status === filterStatus)),
    [tickets, filterStatus]
  );

  // NEW: Export tickets to CSV
  const exportTicketsCsv = () => {
    const headers = [
      "ticket_id",
      "gear_internal_id",
      "status",
      "assigned_technician",
      "estimated_completion_date",
      "cost",
      "charge_customer",
      "date_received",
      "problem_description",
      "parts_count",
      "parts_total",
    ];
    const lines = [headers.join(",")];

    tickets.forEach(t => {
      const gearId = t.gear_items?.internal_id ?? "";
      const assigned = (techUpdate[t.id] ?? t.assigned_technician) ?? "";
      const eta = (etaUpdate[t.id] ?? (t.estimated_completion_date ? t.estimated_completion_date.split("T")[0] : "")) ?? "";
      const cost = (costUpdate[t.id] ?? (t.cost ?? 0));
      const charge = (chargeFlag[t.id] ?? !!t.charge_customer) ? "yes" : "no";
      const received = t.date_received ? new Date(t.date_received).toISOString().split("T")[0] : "";
      const desc = (t.problem_description || "").replace(/,/g, ";");
      const partsList = parts[t.id] || [];
      const partsCount = partsList.length;
      const partsTotal = partsList.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.unit_cost || 0), 0);

      const row = [
        t.id,
        gearId,
        t.status,
        assigned,
        eta,
        cost.toString(),
        charge,
        received,
        desc,
        partsCount.toString(),
        partsTotal.toFixed(2),
      ];
      lines.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maintenance_tickets_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tickets exported to CSV.");
  };

  const addWorkLog = async (ticketId: string, description: string) => {
    if (!description.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("maintenance_work_logs")
      .insert({ user_id: user.id, ticket_id: ticketId, description });

    if (error) {
      toast.error("Failed to add work log: " + error.message);
      throw error;
    }
    toast.success("Work log added.");
    await loadData();
  };

  // NEW: Helper to recompute ticket cost from parts (sum of quantity × unit_cost)
  const recomputeTicketCost = async (ticketId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: partsData, error: partsErr } = await supabase
      .from("maintenance_parts")
      .select("quantity, unit_cost")
      .eq("user_id", user.id)
      .eq("ticket_id", ticketId);

    if (partsErr) {
      toast.error("Failed to recompute cost: " + partsErr.message);
      throw partsErr;
    }

    const total = (partsData || []).reduce((sum, p) => {
      const qty = Number(p.quantity || 0);
      const cost = Number(p.unit_cost || 0);
      return sum + qty * cost;
    }, 0);

    const { error: updErr } = await supabase
      .from("maintenance_tickets")
      .update({ cost: total, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("id", ticketId);

    if (updErr) {
      toast.error("Failed to update ticket cost: " + updErr.message);
      throw updErr;
    }
  };

  // NEW: Remove a part and recompute ticket cost
  const removePart = async (ticketId: string, partId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("maintenance_parts")
      .delete()
      .eq("user_id", user.id)
      .eq("id", partId);

    if (error) {
      toast.error("Failed to remove part: " + error.message);
      throw error;
    }

    await recomputeTicketCost(ticketId);
    toast.success("Part removed and ticket cost updated.");
    await loadData();
  };

  const addPart = async (ticketId: string, partName: string, quantity: number, unitCost?: number) => {
    if (!partName.trim() || quantity <= 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("maintenance_parts")
      .insert({ user_id: user.id, ticket_id: ticketId, part_name: partName, quantity, unit_cost: unitCost ?? null });

    if (error) {
      toast.error("Failed to add part: " + error.message);
      throw error;
    }

    // NEW: Move ticket to 'awaiting_parts' if not already completed
    await supabase
      .from("maintenance_tickets")
      .update({ status: "awaiting_parts", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("id", ticketId)
      .in("status", ["pending", "in_progress"]);

    // NEW: Recompute ticket cost from parts total
    await recomputeTicketCost(ticketId);

    toast.success("Part added and ticket cost updated.");
    await loadData();
  };

  // NEW: Delete a ticket with confirmation
  const deleteTicket = async (ticketId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("maintenance_tickets")
      .delete()
      .eq("user_id", user.id)
      .eq("id", ticketId);
    if (error) {
      toast.error("Failed to delete ticket: " + error.message);
      throw error;
    }
    toast.success("Ticket deleted.");
    await loadData();
  };

  const updateTicket = async (ticket: Ticket) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newStatus = statusUpdate[ticket.id] || ticket.status;
    const newCost = costUpdate[ticket.id] ?? ticket.cost ?? null;
    const newCharge = chargeFlag[ticket.id] ?? !!ticket.charge_customer;
    // NEW: apply technician and estimated date updates
    const newTech = (techUpdate[ticket.id] ?? ticket.assigned_technician) || null;
    const etaStr = etaUpdate[ticket.id] ?? (ticket.estimated_completion_date ? ticket.estimated_completion_date.split("T")[0] : "");
    const newEta = etaStr ? new Date(etaStr).toISOString() : ticket.estimated_completion_date;

    const { error } = await supabase
      .from("maintenance_tickets")
      .update({
        status: newStatus,
        cost: newCost,
        charge_customer: newCharge,
        assigned_technician: newTech,
        estimated_completion_date: newEta ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update ticket: " + error.message);
      throw error;
    }

    // NEW: On completion, mark gear as Available
    if (newStatus === "completed" && ticket.gear_id) {
      await supabase
        .from("gear_items")
        .update({ status: "Available", updated_at: new Date().toISOString() })
        .eq("id", ticket.gear_id)
        .eq("user_id", user.id);
    }

    // NEW: On completion, log Final Testing & Sign-off
    if (newStatus === "completed") {
      const signer = ticket.assigned_technician || "Technician";
      await supabase
        .from("maintenance_work_logs")
        .insert({
          user_id: user.id,
          ticket_id: ticket.id,
          description: `Final testing & sign-off completed by ${signer}.`,
        });
    }

    // If ticket completed and charge_customer is true and rental_id exists, charge the customer balance
    if (newStatus === "completed" && newCharge && ticket.rental_id) {
      const { data: rental, error: rErr } = await supabase
        .from("rentals")
        .select("customer_id")
        .eq("user_id", user.id)
        .eq("id", ticket.rental_id)
        .single();

      if (!rErr && rental?.customer_id && newCost && newCost > 0) {
        const { error: incErr } = await supabase.rpc("increment_customer_balance", {
          p_user_id: user.id,
          p_customer_id: rental.customer_id,
          p_amount: newCost,
        });
        if (incErr) {
          toast.error("Failed to charge customer: " + incErr.message);
          throw incErr;
        }
        toast.success("Customer charged for service.");
      }
    }

    toast.success("Ticket updated.");
    await loadData();
  };

  // NEW: Automated Service Trigger Scan (by time and usage)
  const runTriggerScan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: settings } = await supabase
      .from("service_settings")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const regulatorMonths = Number(settings?.regulator_service_interval_months ?? 12);
    const bcdMonths = Number(settings?.bcd_service_interval_months ?? 12);
    const usageLimit = Number(settings?.max_dives_before_service ?? 100);

    const { data: gear } = await supabase
      .from("gear_items")
      .select("id, category, date_added, purchase_date")
      .eq("user_id", user.id);

    if (!gear || gear.length === 0) {
      toast.info("No gear to scan.");
      return;
    }

    const isReg = (c: string) => c.toLowerCase().includes("reg");
    const isBcd = (c: string) => c.toLowerCase().includes("bcd");

    for (const g of gear) {
      // Last completed service date
      const { data: lastCompleted } = await supabase
        .from("maintenance_tickets")
        .select("id, updated_at")
        .eq("user_id", user.id)
        .eq("gear_id", g.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const anchorDateStr = lastCompleted?.updated_at || g.purchase_date || g.date_added || null;
      const anchorDate = anchorDateStr ? new Date(anchorDateStr) : null;

      // Time-based trigger
      let dueByTime = false;
      if (anchorDate) {
        const months = isReg(g.category) ? regulatorMonths : isBcd(g.category) ? bcdMonths : 0;
        if (months > 0) {
          const nextDue = new Date(anchorDate);
          nextDue.setMonth(nextDue.getMonth() + months);
          dueByTime = nextDue.getTime() <= Date.now();
        }
      }

      // Usage-based trigger: sum rental days for this gear
      const { data: rentalsForGear } = await supabase
        .from("rental_items")
        .select("rental_id, rentals(start_at, expected_end_at)")
        .eq("user_id", user.id)
        .eq("gear_id", g.id);

      let usageDays = 0;
      const rentalsArr = ((rentalsForGear || []) as unknown) as { rentals: { start_at: string; expected_end_at: string } | null }[];
      for (const ri of rentalsArr) {
        const s = ri.rentals?.start_at ? new Date(ri.rentals.start_at) : null;
        const e = ri.rentals?.expected_end_at ? new Date(ri.rentals.expected_end_at) : null;
        if (s && e) {
          const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
          if (diff > 0) usageDays += diff;
        }
      }
      const dueByUsage = usageDays >= usageLimit;

      // Skip if a pending/in_progress ticket already exists
      const { data: openTicket } = await supabase
        .from("maintenance_tickets")
        .select("id")
        .eq("user_id", user.id)
        .eq("gear_id", g.id)
        .in("status", ["pending", "in_progress", "awaiting_parts"])
        .limit(1)
        .maybeSingle();

      if ((dueByTime || dueByUsage) && !openTicket) {
        const reasons: string[] = [];
        if (dueByTime) reasons.push("Time due");
        if (dueByUsage) reasons.push(`Usage threshold (${usageDays} days)`);
        await supabase.from("maintenance_tickets").insert({
          user_id: user.id,
          gear_id: g.id,
          problem_description: `Automated service trigger: ${reasons.join(", ")}`,
          status: "pending",
          date_received: new Date().toISOString(),
        });
      }
    }

    toast.success("Service trigger scan completed.");
    await loadData();
  };

  const statusOptions = ["pending", "in_progress", "awaiting_parts", "completed"];

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading maintenance...</div>;
  }

  return (
    <RoleGuard allow={["owner", "manager", "technician", "staff"]} title="Maintenance">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold">Maintenance</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/maintenance/tickets/new" className="text-sm underline">Create Ticket</Link>
            <Link href="/maintenance/tickets" className="text-sm underline">Tickets</Link>
            <Link href="/maintenance/schedule" className="text-sm underline">Service Schedule</Link>
            <Link href="/maintenance/work-parts" className="text-sm underline">Work & Parts</Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create Maintenance Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Start a new maintenance ticket for a gear item.
              </p>
              <div className="mt-3">
                <Link href="/maintenance/tickets/new" className="underline">Go to Create Ticket</Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and update all maintenance tickets.
              </p>
              <div className="mt-3">
                <Link href="/maintenance/tickets" className="underline">Go to Tickets</Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                See upcoming service dates per gear.
              </p>
              <div className="mt-3">
                <Link href="/maintenance/schedule" className="underline">Go to Service Schedule</Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Performed & Parts Used</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track work performed and parts used for tickets.
              </p>
              <div className="mt-3">
                <Link href="/maintenance/work-parts" className="underline">Go to Work & Parts</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}