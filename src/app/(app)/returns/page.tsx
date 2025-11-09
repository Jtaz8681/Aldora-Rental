"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Rental = { id: string; customer_id: string; expected_end_at: string; total_cost: number; status: string; };
type RentalItem = { id: string; gear_id: string; price: number; pre_checklist: any; post_checklist: any; };
type Gear = { id: string; internal_id: string; category: string; };

type PostChecks = Record<string, Record<string, boolean>>;
type DamageEntry = { hasDamage: boolean; type?: string; severity?: string; photosCsv?: string; notes?: string; estimate?: number };
type DamageMap = Record<string, DamageEntry>;

export default function ReturnsPage() {
  const [query, setQuery] = useState("");
  const [rental, setRental] = useState<Rental | null>(null);
  const [items, setItems] = useState<(RentalItem & { gear: Gear })[]>([]);
  const [postChecks, setPostChecks] = useState<PostChecks>({});
  const [damage, setDamage] = useState<DamageMap>({});
  const [inspector, setInspector] = useState<string>("");

  const loadRentalByInternalId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !query) return;

    // Find gear by internal_id
    const { data: gear } = await supabase.from("gear_items").select("id").eq("user_id", user.id).eq("internal_id", query).limit(1);
    let theRental: Rental | null = null;

    if (gear && gear.length > 0) {
      const gearId = gear[0].id;
      // Find active rental item for this gear
      const { data: rItems } = await supabase.from("rental_items").select("rental_id").eq("user_id", user.id).eq("gear_id", gearId).order("created_at", { ascending: false }).limit(1);
      if (rItems && rItems.length > 0) {
        const rentalId = rItems[0].rental_id;
        const { data: r } = await supabase.from("rentals").select("*").eq("user_id", user.id).eq("id", rentalId).single();
        theRental = r || null;
      }
    }

    if (!theRental) {
      // Try by rental id
      const { data: r } = await supabase.from("rentals").select("*").eq("user_id", user.id).eq("id", query).single();
      theRental = r || null;
    }

    if (!theRental) {
      toast.error("Rental not found");
      return;
    }

    setRental(theRental);

    const { data: rItemsFull } = await supabase.from("rental_items").select("id, gear_id, price, pre_checklist, post_checklist").eq("user_id", user.id).eq("rental_id", theRental.id);
    const gearIds = (rItemsFull || []).map(ri => ri.gear_id);
    const { data: gears } = await supabase.from("gear_items").select("id, internal_id, category").in("id", gearIds);
    const map = new Map<string, Gear>((gears || []).map(g => [g.id, g]));
    const enriched = (rItemsFull || []).map(ri => ({ ...ri, gear: map.get(ri.gear_id)! }));
    setItems(enriched);

    const defaults: Record<string, Record<string, boolean>> = {};
    enriched.forEach(ri => {
      defaults[ri.id] = ri.post_checklist || { general_ok: false, regulator_ok: false, bcd_ok: false, computer_ok: false, wetsuit_ok: false };
    });
    setPostChecks(defaults);
  };

  const finalizeReturn = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !rental) return;

    const now = new Date();
    const expected = new Date(rental.expected_end_at);
    const lateDays = Math.max(Math.ceil((now.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)), 0);

    let extraCharges = 0;

    for (const item of items) {
      const checks = postChecks[item.id] || {};
      await supabase.from("rental_items")
        .update({ post_checklist: checks, inspected_by: inspector || null, inspected_at: new Date().toISOString() })
        .eq("id", item.id).eq("user_id", user.id);

      const d = damage[item.id];
      if (d?.hasDamage) {
        const photos = (d.photosCsv || "").split(",").map(s => s.trim()).filter(Boolean);
        await supabase.from("damage_reports").insert({
          user_id: user.id,
          rental_id: rental.id,
          gear_id: item.gear.id, // Use item.gear.id here
          damage_type: d.type || null,
          severity: d.severity || "Functional",
          photos,
          estimate_cost: d.estimate || null,
          notes: d.notes || null
        });
        const newStatus = d.severity === "Critical" ? "Quarantined" : "In Maintenance";
        await supabase.from("gear_items").update({ status: newStatus }).eq("id", item.gear.id).eq("user_id", user.id); // Use item.gear.id here
        extraCharges += Number(d.estimate || 0);
      } else {
        await supabase.from("gear_items").update({ status: "Available" }).eq("id", item.gear.id).eq("user_id", user.id); // Use item.gear.id here
      }
    }

    // Late fees: simple per-day late equals sum of per-item daily price * lateDays
    if (lateDays > 0) {
      const perDay = items.reduce((sum, i) => sum + Number(i.price || 0), 0);
      extraCharges += perDay * lateDays;
    }

    // Update customer balance
    if (extraCharges > 0) {
      await supabase.rpc("increment_customer_balance", { p_user_id: user.id, p_customer_id: rental.customer_id, p_amount: extraCharges })
        .catch(async () => {
          // Fallback if function not present: direct update
          const { data: cust } = await supabase.from("customers").select("balance_due").eq("user_id", user.id).eq("id", rental.customer_id).single();
          const current = Number(cust?.balance_due || 0);
          await supabase.from("customers").update({ balance_due: current + extraCharges }).eq("user_id", user.id).eq("id", rental.customer_id);
        });
    }

    await supabase.from("rentals").update({ status: lateDays > 0 ? "completed" : "completed" }).eq("id", rental.id).eq("user_id", user.id);

    toast.success("Return finalized");
    setRental(null);
    setItems([]);
    setPostChecks({});
    setDamage({});
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">Returns</h1>

      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <Label>Scan Gear ID or Enter Rental ID</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. BCD-001 or rental UUID" />
        </div>
        <div className="flex items-end">
          <Button onClick={loadRentalByInternalId}>Find</Button>
        </div>
        <div className="sm:col-span-2">
          <Label>Inspector Name</Label>
          <Input value={inspector} onChange={(e) => setInspector(e.target.value)} placeholder="Your name" />
        </div>
      </div>

      {rental && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Rental ID: {rental.id}</p>
          <div className="space-y-3">
            {items.map(item => {
              const checks = postChecks[item.id] || {};
              const dmg = damage[item.id] || { hasDamage: false };
              return (
                <div key={item.id} className="border rounded p-3 space-y-2">
                  <p className="font-medium text-sm">{item.gear.internal_id} · {item.gear.category}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.general_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], general_ok: !!v } }))} />
                      General Condition OK
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.regulator_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], regulator_ok: !!v } }))} />
                      Regulator OK
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.bcd_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], bcd_ok: !!v } }))} />
                      BCD OK
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.computer_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], computer_ok: !!v } }))} />
                      Computer OK
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.wetsuit_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], wetsuit_ok: !!v } }))} />
                      Wetsuit OK
                    </label>
                  </div>

                  <div className="border-t pt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={dmg.hasDamage} onCheckedChange={(v) => setDamage(prev => ({ ...prev, [item.id]: { ...prev[item.id], hasDamage: !!v } }))} />
                      Damage Found
                    </label>
                    {dmg.hasDamage && (
                      <div className="grid sm:grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label>Type</Label>
                          <Input value={dmg.type || ""} onChange={(e) => setDamage(prev => ({ ...prev, [item.id]: { ...prev[item.id], type: e.target.value } }))} />
                        </div>
                        <div>
                          <Label>Severity</Label>
                          <select className="border rounded px-2 py-2 w-full" value={dmg.severity || "Functional"} onChange={(e) => setDamage(prev => ({ ...prev, [item.id]: { ...prev[item.id], severity: e.target.value } }))}>
                            <option>Cosmetic</option>
                            <option>Functional</option>
                            <option>Critical</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <Label>Photo URLs (comma-separated)</Label>
                          <Input value={dmg.photosCsv || ""} onChange={(e) => setDamage(prev => ({ ...prev, [item.id]: { ...prev[item.id], photosCsv: e.target.value } }))} placeholder="https://..." />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>Notes</Label>
                          <Input value={dmg.notes || ""} onChange={(e) => setDamage(prev => ({ ...prev, [item.id]: { ...prev[item.id], notes: e.target.value } }))} />
                        </div>
                        <div>
                          <Label>Estimated Repair Cost</Label>
                          <Input type="number" step="0.01" value={dmg.estimate ?? 0} onChange={(e) => setDamage(prev => ({ ...prev, [item.id]: { ...prev[item.id], estimate: Number(e.target.value) } }))} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end">
            <Button onClick={finalizeReturn}>Finalize Return</Button>
          </div>
        </div>
      )}
    </div>
  );
}