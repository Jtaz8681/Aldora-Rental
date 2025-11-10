"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { Trash2 } from "lucide-react";
import { badgeVariantForTicketStatus } from "@/lib/status";

type Ticket = {
  id: string;
  user_id: string;
  gear_id: string | null;
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

export default function MaintenanceTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdate, setStatusUpdate] = useState<Record<string, string>>({});
  const [costUpdate, setCostUpdate] = useState<Record<string, number>>({});
  const [chargeFlag, setChargeFlag] = useState<Record<string, boolean>>({});
  const [techUpdate, setTechUpdate] = useState<Record<string, string>>({});
  const [etaUpdate, setEtaUpdate] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [technicians, setTechnicians] = useState<string[]>([]);

  const statusOptions = ["all", "pending", "in_progress", "awaiting_parts", "completed"];

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

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

    const { data: techProfiles } = await supabase
      .from("profiles")
      .select("first_name, last_name, role")
      .in("role", ["technician", "manager", "owner", "dev"])
      .order("first_name", { ascending: true });

    const names = (techProfiles || [])
      .map(p => [p.first_name, p.last_name].filter(Boolean).join(" ").trim())
      .filter(Boolean);

    setTechnicians(Array.from(new Set(names)));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const visibleTickets = useMemo(
    () => tickets.filter(t => (filterStatus === "all" ? true : t.status === filterStatus)),
    [tickets, filterStatus]
  );

  const exportTicketsCsv = () => {
    const headers = [
      "ticket_id","gear_internal_id","status","assigned_technician","estimated_completion_date","cost","charge_customer","date_received","problem_description"
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
      const row = [t.id, gearId, t.status, assigned, eta, cost.toString(), charge, received, desc];
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

  const updateTicket = async (ticket: Ticket) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newStatus = statusUpdate[ticket.id] || ticket.status;
    const newCost = costUpdate[ticket.id] ?? ticket.cost ?? null;
    const newCharge = chargeFlag[ticket.id] ?? !!ticket.charge_customer;
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

    if (newStatus === "completed" && ticket.gear_id) {
      await supabase
        .from("gear_items")
        .update({ status: "Available", updated_at: new Date().toISOString() })
        .eq("id", ticket.gear_id)
        .eq("user_id", user.id);
    }

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

    toast.success("Ticket updated.");
    await loadData();
  };

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

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading tickets...</div>;
  }

  return (
    <RoleGuard allow={["owner", "manager", "dev", "technician", "staff"]} title="Maintenance">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold">Tickets</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/maintenance/tickets/new">Create Ticket</Link>
            </Button>
            <label className="text-sm flex items-center gap-2">
              <span>Status:</span>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <Button variant="outline" onClick={exportTicketsCsv}>Export CSV</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleTickets.map(t => (
                <Link key={t.id} href={`/maintenance/tickets/${t.id}`} className="block">
                  <div className="border rounded p-3 hover:bg-muted transition">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {t.gear_items?.internal_id ? (
                          <span className="font-mono">{t.gear_items.internal_id}</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>
                      <Badge variant={badgeVariantForTicketStatus(t.status)}>{t.status}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Received</div>
                        <div>{t.date_received ? format(new Date(t.date_received), "PPP") : "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Technician</div>
                        <div>{t.assigned_technician || "-"}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {t.problem_description || "No description"}
                    </div>
                  </div>
                </Link>
              ))}
              {visibleTickets.length === 0 && (
                <div className="text-sm text-muted-foreground">No tickets.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}