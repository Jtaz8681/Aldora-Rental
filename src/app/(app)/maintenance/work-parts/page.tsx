"use client";

import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { badgeVariantForTicketStatus } from "@/lib/status";

type Ticket = {
  id: string;
  user_id: string;
  gear_id: string | null;
  status: string;
  problem_description: string | null;
  gear_items?: { internal_id: string; category: string } | null;
};

type WorkLog = { id: string; description: string; created_at: string; ticket_id: string };
type Part = { id: string; part_name: string; quantity: number; unit_cost: number | null; ticket_id: string };

export default function MaintenanceWorkPartsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [workLogs, setWorkLogs] = useState<Record<string, WorkLog[]>>({});
  const [parts, setParts] = useState<Record<string, Part[]>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: tData, error: tErr } = await supabase
      .from("maintenance_tickets")
      .select("*, gear_items(internal_id, category)")
      .in("status", ["pending", "in_progress", "awaiting_parts", "completed"])
      .order("status", { ascending: true });

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
        .in("ticket_id", ids)
        .order("created_at", { ascending: false });

      const { data: pData } = await supabase
        .from("maintenance_parts")
        .select("*")
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

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const recomputeTicketCost = async (ticketId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: partsData, error: partsErr } = await supabase
      .from("maintenance_parts")
      .select("quantity, unit_cost")
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
      .eq("id", ticketId);

    if (updErr) {
      toast.error("Failed to update ticket cost: " + updErr.message);
      throw updErr;
    }
  };

  const removePart = async (ticketId: string, partId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("maintenance_parts")
      .delete()
      .eq("id", partId);

    if (error) {
      toast.error("Failed to remove part: " + error.message);
      throw error;
    }
    await recomputeTicketCost(ticketId);
    toast.success("Part removed and ticket cost updated.");
    await loadData();
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
    await supabase
      .from("maintenance_tickets")
      .update({ status: "awaiting_parts", updated_at: new Date().toISOString() })
      .eq("id", ticketId)
      .in("status", ["pending", "in_progress"]);

    await recomputeTicketCost(ticketId);
    toast.success("Part added and ticket cost updated.");
    await loadData();
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading work & parts...</div>;
  }

  return (
    <RoleGuard allow={["owner", "manager", "dev", "technician", "staff"]} title="Maintenance">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold">Work Performed & Parts Used</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/maintenance/tickets" className="text-sm underline">Go to Tickets</Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Work & Parts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tickets.map(t => (
              <div key={t.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    Ticket: {t.id.slice(0, 8)} • {t.gear_items?.internal_id ? (
                      <Link href={`/gear/${t.gear_id}`} className="underline font-mono">
                        {t.gear_items.internal_id}
                      </Link>
                    ) : (
                      "N/A"
                    )}
                  </div>
                  <Badge variant={badgeVariantForTicketStatus(t.status)}>{t.status}</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 mt-3">
                  <div>
                    <div className="text-sm font-medium">Add Work Log</div>
                    <div className="flex gap-2 mt-1">
                      <Input id={`wl-${t.id}`} placeholder='e.g. "Overhauled 1st stage"' />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const el = document.getElementById(`wl-${t.id}`) as HTMLInputElement | null;
                          addWorkLog(t.id, el?.value || "");
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="mt-2 space-y-1">
                      {(workLogs[t.id] || []).map(wl => (
                        <div key={wl.id} className="text-xs">
                          <span className="text-muted-foreground">{format(new Date(wl.created_at), "PPp")} • </span>
                          {wl.description}
                        </div>
                      ))}
                      {(workLogs[t.id] || []).length === 0 && (
                        <div className="text-xs text-muted-foreground">No work logs.</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Add Part</div>
                    <div className="grid grid-cols-2 md:grid-cols-[2fr,1fr,1fr,auto] gap-2 mt-1">
                      <Input id={`ptn-${t.id}`} placeholder="Part name" />
                      <Input id={`ptq-${t.id}`} type="number" placeholder="Qty" />
                      <Input id={`ptc-${t.id}`} type="number" step="0.01" placeholder="Unit cost" />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const ptn = document.getElementById(`ptn-${t.id}`) as HTMLInputElement | null;
                          const ptq = document.getElementById(`ptq-${t.id}`) as HTMLInputElement | null;
                          const ptc = document.getElementById(`ptc-${t.id}`) as HTMLInputElement | null;
                          const qty = Number(ptq?.value || 0);
                          const cost = ptc?.value ? Number(ptc.value) : undefined;
                          addPart(t.id, ptn?.value || "", qty, cost);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="mt-2 space-y-1">
                      {(parts[t.id] || []).map(pt => (
                        <div key={pt.id} className="text-xs flex items-center justify-between">
                          <div>
                            {pt.part_name} × {pt.quantity} {pt.unit_cost != null ? `@ $${Number(pt.unit_cost).toFixed(2)}` : ""}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removePart(t.id, pt.id)}
                            aria-label="Remove part"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {(parts[t.id] || []).length === 0 && (
                        <div className="text-xs text-muted-foreground">No parts added.</div>
                      )}
                      <div className="text-xs mt-2 font-medium">
                        Parts total: $
                        {((parts[t.id] || []).reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.unit_cost || 0), 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="text-sm text-muted-foreground">No maintenance records yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}