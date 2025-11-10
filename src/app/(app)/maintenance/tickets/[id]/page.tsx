"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";
import { Trash2 } from "lucide-react";

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

type WorkLog = { id: string; description: string; created_at: string; ticket_id: string };
type Part = { id: string; part_name: string; quantity: number; unit_cost: number | null; ticket_id: string };

const STATUS_VARIANT = (status: string) => {
  switch (status) {
    case "pending": return "outline";
    case "in_progress": return "default";
    case "awaiting_parts": return "secondary";
    case "completed": return "secondary";
    default: return "outline";
  }
};

export default function MaintenanceTicketDetailPage() {
  const params = useParams();
  const ticketId = (params?.id as string) || "";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [technicians, setTechnicians] = useState<string[]>([]);

  // editable fields
  const [statusUpdate, setStatusUpdate] = useState<string>("");
  const [techUpdate, setTechUpdate] = useState<string>("");
  const [etaUpdate, setEtaUpdate] = useState<string>("");
  const [costUpdate, setCostUpdate] = useState<number>(0);
  const [chargeFlag, setChargeFlag] = useState<boolean>(false);

  const statusOptions = ["pending", "in_progress", "awaiting_parts", "completed"];

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ticketId) { setLoading(false); return; }

    const { data: tData, error: tErr } = await supabase
      .from("maintenance_tickets")
      .select("*, gear_items(internal_id, category)")
      .eq("user_id", user.id)
      .eq("id", ticketId)
      .single();

    if (tErr) {
      toast.error("Failed to load ticket: " + tErr.message);
      setLoading(false);
      return;
    }
    setTicket(tData);
    setStatusUpdate(tData.status || "pending");
    setTechUpdate(tData.assigned_technician || "");
    setEtaUpdate(tData.estimated_completion_date ? tData.estimated_completion_date.split("T")[0] : "");
    setCostUpdate(Number(tData.cost ?? 0));
    setChargeFlag(!!tData.charge_customer);

    const { data: wlData } = await supabase
      .from("maintenance_work_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });

    const { data: pData } = await supabase
      .from("maintenance_parts")
      .select("*")
      .eq("user_id", user.id)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });

    setWorkLogs(wlData || []);
    setParts(pData || []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const recomputeTicketCost = async (ticketIdLocal: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: partsData, error: partsErr } = await supabase
      .from("maintenance_parts")
      .select("quantity, unit_cost")
      .eq("user_id", user.id)
      .eq("ticket_id", ticketIdLocal);

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
      .eq("id", ticketIdLocal);

    if (updErr) {
      toast.error("Failed to update ticket cost: " + updErr.message);
      throw updErr;
    }
    setCostUpdate(total);
  };

  const addWorkLog = async (description: string) => {
    if (!ticket) return;
    if (!description.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("maintenance_work_logs")
      .insert({ user_id: user.id, ticket_id: ticket.id, description });

    if (error) {
      toast.error("Failed to add work log: " + error.message);
      throw error;
    }
    toast.success("Work log added.");
    await loadData();
  };

  const addPart = async (partName: string, quantity: number, unitCost?: number) => {
    if (!ticket) return;
    if (!partName.trim() || quantity <= 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("maintenance_parts")
      .insert({ user_id: user.id, ticket_id: ticket.id, part_name: partName, quantity, unit_cost: unitCost ?? null });

    if (error) {
      toast.error("Failed to add part: " + error.message);
      throw error;
    }
    await supabase
      .from("maintenance_tickets")
      .update({ status: "awaiting_parts", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("id", ticket.id)
      .in("status", ["pending", "in_progress"]);

    await recomputeTicketCost(ticket.id);
    toast.success("Part added and ticket cost updated.");
    await loadData();
  };

  const removePart = async (partId: string) => {
    if (!ticket) return;
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
    await recomputeTicketCost(ticket.id);
    toast.success("Part removed and ticket cost updated.");
    await loadData();
  };

  const updateTicket = async () => {
    if (!ticket) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const etaIso = etaUpdate ? new Date(etaUpdate).toISOString() : ticket.estimated_completion_date;

    const { error } = await supabase
      .from("maintenance_tickets")
      .update({
        status: statusUpdate,
        cost: costUpdate ?? null,
        charge_customer: chargeFlag,
        assigned_technician: techUpdate || null,
        estimated_completion_date: etaIso ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update ticket: " + error.message);
      throw error;
    }

    if (statusUpdate === "completed" && ticket.gear_id) {
      await supabase
        .from("gear_items")
        .update({ status: "Available", updated_at: new Date().toISOString() })
        .eq("id", ticket.gear_id)
        .eq("user_id", user.id);
    }

    if (statusUpdate === "completed") {
      const signer = techUpdate || ticket.assigned_technician || "Technician";
      await supabase
        .from("maintenance_work_logs")
        .insert({
          user_id: user.id,
          ticket_id: ticket.id,
          description: `Final testing & sign-off completed by ${signer}.`,
        });
    }

    // Charge customer if applicable
    if (statusUpdate === "completed" && chargeFlag && ticket.rental_id) {
      const { data: rental } = await supabase
        .from("rentals")
        .select("customer_id")
        .eq("user_id", user.id)
        .eq("id", ticket.rental_id)
        .single();

      if (rental?.customer_id && costUpdate && costUpdate > 0) {
        const { error: incErr } = await supabase.rpc("increment_customer_balance", {
          p_user_id: user.id,
          p_customer_id: rental.customer_id,
          p_amount: costUpdate,
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

  const deleteTicket = async () => {
    if (!ticket) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("maintenance_tickets")
      .delete()
      .eq("user_id", user.id)
      .eq("id", ticket.id);
    if (error) {
      toast.error("Failed to delete ticket: " + error.message);
      throw error;
    }
    toast.success("Ticket deleted.");
    // Navigate back to tickets list
    window.location.href = "/maintenance/tickets";
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading ticket...</div>;
  }
  if (!ticket) {
    return <div className="text-center text-muted-foreground">Ticket not found.</div>;
  }

  return (
    <RoleGuard allow={["owner", "manager", "technician", "staff"]} title="Maintenance">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Ticket</h1>
            <div className="text-sm text-muted-foreground">
              ID: {ticket.id.slice(0, 8)} • Gear:{" "}
              {ticket.gear_items?.internal_id ? (
                <Link href={`/gear/${ticket.gear_id}`} className="underline font-mono">
                  {ticket.gear_items.internal_id}
                </Link>
              ) : "N/A"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/maintenance/tickets">Back to Tickets</Link>
            </Button>
            <Button variant="destructive" onClick={deleteTicket}>Delete Ticket</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={STATUS_VARIANT(statusUpdate)}>{statusUpdate}</Badge>
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                  >
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Technician</div>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    className="w-32 md:w-40"
                    placeholder="Technician"
                    value={techUpdate}
                    onChange={(e) => setTechUpdate(e.target.value)}
                  />
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) setTechUpdate(val);
                    }}
                    value=""
                  >
                    <option value="">Pick</option>
                    {technicians.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Estimate</div>
                <Input
                  type="date"
                  className="w-32 md:w-40 mt-1"
                  value={etaUpdate}
                  onChange={(e) => setEtaUpdate(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cost</div>
                <Input
                  type="number"
                  step="0.01"
                  className="w-24 md:w-28 mt-1"
                  value={costUpdate.toString()}
                  onChange={(e) => setCostUpdate(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={chargeFlag}
                  onChange={(e) => setChargeFlag(e.target.checked)}
                />
                <span className="text-xs">Charge customer on completion</span>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Received</div>
                <div className="mt-1">{ticket.date_received ? format(new Date(ticket.date_received), "PPP") : "-"}</div>
              </div>
              <div className="md:col-span-3">
                <div className="text-xs text-muted-foreground">Description</div>
                <div className="mt-1 text-sm">{ticket.problem_description || "No description"}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={updateTicket}>Save Changes</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Performed & Parts Used</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium">Add Work Log</div>
                <div className="flex gap-2 mt-1">
                  <Input id="wl-input" placeholder='e.g. "Overhauled 1st stage"' />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const el = document.getElementById("wl-input") as HTMLInputElement | null;
                      addWorkLog(el?.value || "");
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="mt-2 space-y-1">
                  {workLogs.map(wl => (
                    <div key={wl.id} className="text-xs">
                      <span className="text-muted-foreground">{format(new Date(wl.created_at), "PPp")} • </span>
                      {wl.description}
                    </div>
                  ))}
                  {workLogs.length === 0 && (
                    <div className="text-xs text-muted-foreground">No work logs.</div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Add Part</div>
                <div className="grid grid-cols-2 md:grid-cols-[2fr,1fr,1fr,auto] gap-2 mt-1">
                  <Input id="ptn-input" placeholder="Part name" />
                  <Input id="ptq-input" type="number" placeholder="Qty" />
                  <Input id="ptc-input" type="number" step="0.01" placeholder="Unit cost" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const ptn = document.getElementById("ptn-input") as HTMLInputElement | null;
                      const ptq = document.getElementById("ptq-input") as HTMLInputElement | null;
                      const ptc = document.getElementById("ptc-input") as HTMLInputElement | null;
                      const qty = Number(ptq?.value || 0);
                      const cost = ptc?.value ? Number(ptc.value) : undefined;
                      addPart(ptn?.value || "", qty, cost);
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="mt-2 space-y-1">
                  {parts.map(pt => (
                    <div key={pt.id} className="text-xs flex items-center justify-between">
                      <div>
                        {pt.part_name} × {pt.quantity} {pt.unit_cost != null ? `@ $${Number(pt.unit_cost).toFixed(2)}` : ""}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removePart(pt.id)}
                        aria-label="Remove part"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {parts.length === 0 && (
                    <div className="text-xs text-muted-foreground">No parts added.</div>
                  )}
                  <div className="text-xs mt-2 font-medium">
                    Parts total: $
                    {((parts.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.unit_cost || 0), 0))).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}