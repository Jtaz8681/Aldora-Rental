"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";

type Gear = {
  id: string;
  internal_id: string | null;
  friendly_name: string | null;
  category: string;
  status: string;
  rental_price: number | null;
  checklist_template_pre?: Record<string, string> | null;
  checklist_template_post?: Record<string, string> | null;
};

type RentalItemRow = {
  id: string;
  price: number | null;
  rentals: { start_at: string; expected_end_at: string; status: string } | null;
};

type Ticket = {
  id: string;
  status: string;
  date_received: string | null;
  problem_description: string | null;
  updated_at: string | null;
  assigned_technician: string | null;
  estimated_completion_date: string | null;
  cost: number | null;
};

type WorkLog = { id: string; ticket_id: string; description: string; created_at: string };

export default function GearHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const gearId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [gear, setGear] = useState<Gear | null>(null);
  const [rentalItems, setRentalItems] = useState<RentalItemRow[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [logsByTicket, setLogsByTicket] = useState<Record<string, WorkLog[]>>({});
  const [monthsEdit, setMonthsEdit] = useState<number | "">("");
  const [usageEdit, setUsageEdit] = useState<number | "">("");
  // NEW: checklist templates per item
  const [itemPreTemplate, setItemPreTemplate] = useState<Record<string, string>>({});
  const [itemPostTemplate, setItemPostTemplate] = useState<Record<string, string>>({});
  const [newItemPreKey, setNewItemPreKey] = useState("");
  const [newItemPreLabel, setNewItemPreLabel] = useState("");
  const [newItemPostKey, setNewItemPostKey] = useState("");
  const [newItemPostLabel, setNewItemPostLabel] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !gearId) {
        setLoading(false);
        return;
      }

      // Load gear (confirm ownership)
      const { data: g, error: gErr } = await supabase
        .from("gear_items")
        .select("id, internal_id, friendly_name, category, status, rental_price, checklist_template_pre, checklist_template_post")
        .eq("user_id", user.id)
        .eq("id", gearId)
        .single();

      if (gErr || !g) {
        toast.error("Gear not found.");
        router.push("/gear");
        return;
      }
      setGear(g as Gear);
      setItemPreTemplate(((g as any).checklist_template_pre as any) || {});
      setItemPostTemplate(((g as any).checklist_template_post as any) || {});

      // Prefill custom schedule editor from gear
      if (g?.id) {
        setMonthsEdit((g as any).service_interval_months ?? "");
        setUsageEdit((g as any).usage_service_threshold ?? "");
      }

      // Load rentals for this gear
      const { data: ri } = await supabase
        .from("rental_items")
        .select("id, price, rentals(start_at, expected_end_at, status)")
        .eq("user_id", user.id)
        .eq("gear_id", gearId)
        .order("created_at", { ascending: false });

      setRentalItems((ri || []) as unknown as RentalItemRow[]);

      // Load maintenance tickets and logs
      const { data: tix } = await supabase
        .from("maintenance_tickets")
        .select("id, status, date_received, problem_description, updated_at, assigned_technician, estimated_completion_date, cost")
        .eq("user_id", user.id)
        .eq("gear_id", gearId)
        .order("date_received", { ascending: false });

      const ticketsList = (tix || []) as Ticket[];
      setTickets(ticketsList);

      const ids = ticketsList.map(t => t.id);
      if (ids.length) {
        const { data: wls } = await supabase
          .from("maintenance_work_logs")
          .select("id, ticket_id, description, created_at")
          .eq("user_id", user.id)
          .in("ticket_id", ids)
          .order("created_at", { ascending: false });

        const map: Record<string, WorkLog[]> = {};
        (wls || []).forEach(w => {
          map[w.ticket_id] = [...(map[w.ticket_id] || []), w as WorkLog];
        });
        setLogsByTicket(map);
      } else {
        setLogsByTicket({});
      }

      setLoading(false);
    };
    load();
  }, [gearId, router]);

  const metrics = useMemo(() => {
    // Rental metrics
    let times = 0;
    let days = 0;
    let income = 0;

    for (const r of rentalItems) {
      const start = r.rentals?.start_at ? new Date(r.rentals.start_at) : null;
      const end = r.rentals?.expected_end_at ? new Date(r.rentals.expected_end_at) : null;
      if (start && end) {
        const d = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        times += 1;
        days += d;
        income += d * Number(r.price || 0);
      }
    }

    // Maintenance cost
    const maintenance = tickets.reduce((sum, t) => sum + Number(t.cost || 0), 0);

    return {
      times,
      days,
      income,
      maintenance,
    };
  }, [rentalItems, tickets]);

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading gear history...</div>;
  }

  if (!gear) {
    return <div className="text-center text-destructive">Gear not found.</div>;
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case "Available": return "secondary";
      case "Checked-Out": return "default";
      case "Overdue": return "destructive";
      case "In Maintenance": return "secondary";
      case "Quarantined": return "destructive";
      case "Retired": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gear History</h1>
          <div className="text-sm text-muted-foreground">
            <span className="font-mono">{gear.internal_id}</span>
            {gear.friendly_name ? <> • {gear.friendly_name}</> : null} • {gear.category} • <Badge variant={statusVariant(gear.status)}>{gear.status}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/gear/${gear.id}/edit`} className="text-sm underline">Edit Gear</Link>
          <Link href="/gear" className="text-sm underline">Back to Gear</Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Custom Checklist Templates (This Item)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Pre-Checkout Checklist</div>
            <div className="grid grid-cols-[1.5fr,2fr,auto] gap-2 mb-2">
              <Input placeholder="key" value={newItemPreKey} onChange={(e) => setNewItemPreKey(e.target.value)} />
              <Input placeholder="label" value={newItemPreLabel} onChange={(e) => setNewItemPreLabel(e.target.value)} />
              <Button variant="outline" onClick={() => {
                if (!newItemPreKey.trim() || !newItemPreLabel.trim()) return;
                setItemPreTemplate(prev => ({ ...prev, [newItemPreKey.trim()]: newItemPreLabel.trim() }));
                setNewItemPreKey(""); setNewItemPreLabel("");
              }}>Add</Button>
            </div>
            <div className="space-y-1">
              {Object.entries(itemPreTemplate).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{k}</span> <span>{v}</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const next = { ...itemPreTemplate }; delete next[k]; setItemPreTemplate(next);
                  }}>Remove</Button>
                </div>
              ))}
              {Object.keys(itemPreTemplate).length === 0 && (
                <div className="text-xs text-muted-foreground">No pre-checks configured.</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Post-Check-In Checklist</div>
            <div className="grid grid-cols-[1.5fr,2fr,auto] gap-2 mb-2">
              <Input placeholder="key" value={newItemPostKey} onChange={(e) => setNewItemPostKey(e.target.value)} />
              <Input placeholder="label" value={newItemPostLabel} onChange={(e) => setNewItemPostLabel(e.target.value)} />
              <Button variant="outline" onClick={() => {
                if (!newItemPostKey.trim() || !newItemPostLabel.trim()) return;
                setItemPostTemplate(prev => ({ ...prev, [newItemPostKey.trim()]: newItemPostLabel.trim() }));
                setNewItemPostKey(""); setNewItemPostLabel("");
              }}>Add</Button>
            </div>
            <div className="space-y-1">
              {Object.entries(itemPostTemplate).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{k}</span> <span>{v}</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const next = { ...itemPostTemplate }; delete next[k]; setItemPostTemplate(next);
                  }}>Remove</Button>
                </div>
              ))}
              {Object.keys(itemPostTemplate).length === 0 && (
                <div className="text-xs text-muted-foreground">No post-checks configured.</div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={saveItemTemplates}>Save Templates</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Total Times Rented</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{metrics.times}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Days Rented</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{metrics.days}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Rental Income</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">${metrics.income.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Maintenance Cost</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">${metrics.maintenance.toFixed(2)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Rental History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start</TableHead>
                <TableHead>Expected End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Price/Day</TableHead>
                <TableHead>Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentalItems.map((r) => {
                const s = r.rentals?.start_at ? new Date(r.rentals.start_at) : null;
                const e = r.rentals?.expected_end_at ? new Date(r.rentals.expected_end_at) : null;
                const d = s && e ? Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))) : 0;
                const income = d * Number(r.price || 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{s ? format(s, "PPP p") : "-"}</TableCell>
                    <TableCell>{e ? format(e, "PPP p") : "-"}</TableCell>
                    <TableCell>{r.rentals?.status || "-"}</TableCell>
                    <TableCell>{d}</TableCell>
                    <TableCell>${Number(r.price || 0).toFixed(2)}</TableCell>
                    <TableCell>${income.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              {rentalItems.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No rental history.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Maintenance Tickets</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tech</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.date_received ? format(new Date(t.date_received), "PPP") : "-"}</TableCell>
                  <TableCell>{t.status}</TableCell>
                  <TableCell>{t.assigned_technician || "-"}</TableCell>
                  <TableCell>{t.estimated_completion_date ? format(new Date(t.estimated_completion_date), "PPP") : "-"}</TableCell>
                  <TableCell>${Number(t.cost || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.problem_description || "-"}</TableCell>
                </TableRow>
              ))}
              {tickets.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No maintenance tickets.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Work Logs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {tickets.map(t => {
            const logs = logsByTicket[t.id] || [];
            return (
              <div key={t.id} className="border rounded p-3">
                <div className="text-sm font-medium mb-2">Ticket {t.id.slice(0, 8)} • {t.problem_description || "Service"}</div>
                {logs.length > 0 ? (
                  <div className="space-y-1">
                    {logs.map(l => (
                      <div key={l.id} className="text-xs">
                        <span className="text-muted-foreground">{format(new Date(l.created_at), "PPp")} • </span>
                        {l.description}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No work logs for this ticket.</div>
                )}
              </div>
            );
          })}
          {tickets.length === 0 && (
            <div className="text-sm text-muted-foreground">No work logs.</div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link href={`/gear/${gear.id}/edit`}>Edit Gear</Link>
        </Button>
      </div>
    </div>
  );
}