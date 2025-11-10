"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { Trash2 } from "lucide-react";

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

const STATUS_VARIANT = (status: string) => {
  switch (status) {
    case "pending": return "outline";
    case "in_progress": return "default";
    case "awaiting_parts": return "secondary";
    case "completed": return "secondary";
    default: return "outline";
  }
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
      .in("role", ["technician", "manager", "owner"])
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
    <RoleGuard allow={["owner", "manager", "technician", "staff"]} title="Maintenance">
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
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[900px] md:min-w-0">
                <TableHeader>
                  <TableRow>
                    <TableHead>Gear</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Estimate</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Charge?</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTickets.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        {t.gear_items?.internal_id ? (
                          <Link href={`/gear/${t.gear_id}`} className="underline font-mono">
                            {t.gear_items.internal_id}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {t.problem_description || "No description"}
                        </div>
                      </TableCell>
                      <TableCell>{t.date_received ? format(new Date(t.date_received), "PPP") : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT(t.status)}>{t.status}</Badge>
                        <div className="mt-1">
                          <select
                            className="border rounded px-2 py-1 text-xs"
                            value={statusUpdate[t.id] ?? t.status}
                            onChange={(e) => setStatusUpdate(prev => ({ ...prev, [t.id]: e.target.value }))}
                          >
                            {statusOptions.filter(s => s !== "all").map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-28 md:w-40"
                            placeholder="Technician"
                            value={techUpdate[t.id] ?? (t.assigned_technician || "")}
                            onChange={(e) => setTechUpdate(prev => ({ ...prev, [t.id]: e.target.value }))}
                          />
                          <select
                            className="border rounded px-2 py-1 text-xs"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) setTechUpdate(prev => ({ ...prev, [t.id]: val }));
                            }}
                            value=""
                          >
                            <option value="">Pick</option>
                            {technicians.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <Input
                          type="date"
                          className="w-28 md:w-40"
                          value={etaUpdate[t.id] ?? (t.estimated_completion_date ? t.estimated_completion_date.split("T")[0] : "")}
                          onChange={(e) => setEtaUpdate(prev => ({ ...prev, [t.id]: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 md:w-28"
                          value={(costUpdate[t.id] ?? (t.cost ?? 0)).toString()}
                          onChange={(e) => setCostUpdate(prev => ({ ...prev, [t.id]: Number(e.target.value) }))}
                        />
                      </TableCell>
                      <TableCell>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={chargeFlag[t.id] ?? !!t.charge_customer}
                            onChange={(e) => setChargeFlag(prev => ({ ...prev, [t.id]: e.target.checked }))}
                          />
                          Charge customer
                        </label>
                      </TableCell>
                      <TableCell className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateTicket(t)}>Save</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteTicket(t.id)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleTickets.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No tickets.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}