"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { format } from "date-fns";

type Rental = { 
  id: string; 
  customer_id: string; 
  expected_end_at: string; 
  start_at: string;
  total_cost: number; 
  status: string; 
  customers: { name: string; phone: string | null; email: string | null } | null;
};
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
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);

  useEffect(() => {
    const loadActiveRentals = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("rentals")
        .select("id, customer_id, start_at, expected_end_at, total_cost, status, customers(name, phone, email)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("expected_end_at", { ascending: true });

      if (error) {
        toast.error("Failed to load active rentals: " + error.message);
        return;
      }
      setActiveRentals(data || []);
    };
    loadActiveRentals();
  }, []);

  const loadRentalDetails = async (rentalId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: theRental, error: rentalError } = await supabase
      .from("rentals")
      .select("*, customers(name, phone, email)")
      .eq("user_id", user.id)
      .eq("id", rentalId)
      .single();

    if (rentalError || !theRental) {
      toast.error("Rental not found or failed to load details.");
      setRental(null);
      setItems([]);
      setPostChecks({});
      setDamage({});
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
      defaults[ri.id] = ri.post_checklist || { 
        general_ok: false, 
        regulator_ok: false, 
        regulator_ip_ok: false, 
        octopus_ok: false,
        bcd_ok: false, 
        holds_pressure_5min: false, 
        opv_ok: false, 
        power_inflator_ok: false,
        computer_ok: false, 
        computer_battery_ok: false, 
        computer_screen_ok: false, 
        computer_buttons_ok: false,
        wetsuit_ok: false, 
        wetsuit_zipper_ok: false 
      };
    });
    setPostChecks(defaults);
  };

  const handleSearch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !query) return;

    let foundRentalId: string | null = null;

    // 1. Try searching by Gear Internal ID
    const { data: gearItems } = await supabase
      .from("gear_items")
      .select("id")
      .eq("user_id", user.id)
      .ilike("internal_id", `%${query}%`)
      .limit(1);

    if (gearItems && gearItems.length > 0) {
      const gearId = gearItems[0].id;
      const { data: rItems } = await supabase
        .from("rental_items")
        .select("rental_id")
        .eq("user_id", user.id)
        .eq("gear_id", gearId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (rItems && rItems.length > 0) {
        foundRentalId = rItems[0].rental_id;
      }
    }

    // 2. If not found, try searching by Rental ID
    if (!foundRentalId) {
      const { data: r } = await supabase
        .from("rentals")
        .select("id")
        .eq("user_id", user.id)
        .eq("id", query)
        .limit(1);
      if (r && r.length > 0) {
        foundRentalId = r[0].id;
      }
    }

    // 3. If not found, try searching by Customer Name, Phone, or Email
    if (!foundRentalId) {
      const { data: customersData } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(1);

      if (customersData && customersData.length > 0) {
        const customerId = customersData[0].id;
        const { data: customerRentals } = await supabase
          .from("rentals")
          .select("id")
          .eq("user_id", user.id)
          .eq("customer_id", customerId)
          .eq("status", "active") // Only consider active rentals for return
          .order("expected_end_at", { ascending: true }) // Get the one due soonest
          .limit(1);
        if (customerRentals && customerRentals.length > 0) {
          foundRentalId = customerRentals[0].id;
        }
      }
    }

    if (foundRentalId) {
      await loadRentalDetails(foundRentalId);
    } else {
      toast.error("No active rental found matching your search criteria.");
      setRental(null);
      setItems([]);
      setPostChecks({});
      setDamage({});
    }
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
          gear_id: item.gear_id,
          damage_type: d.type || null,
          severity: d.severity || "Functional",
          photos,
          estimate_cost: d.estimate || null,
          notes: d.notes || null
        });
        const newStatus = d.severity === "Critical" ? "Quarantined" : "In Maintenance";
        await supabase.from("gear_items").update({ status: newStatus }).eq("id", item.gear_id).eq("user_id", user.id);
        extraCharges += Number(d.estimate || 0);
      } else {
        await supabase.from("gear_items").update({ status: "Available" }).eq("id", item.gear_id).eq("user_id", user.id);
      }
    }

    // Calculate late charges based on per-day item prices
    const perDaySum = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const lateCharges = perDaySum * lateDays;

    // Update rental as returned and adjust total_cost
    const newTotal = Number(rental.total_cost || 0) + lateCharges + extraCharges;
    await supabase
      .from("rentals")
      .update({ status: "returned", updated_at: new Date().toISOString(), total_cost: newTotal })
      .eq("id", rental.id).eq("user_id", user.id);

    // Increase customer balance by late/damage charges
    if (lateCharges + extraCharges > 0) {
      await supabase.rpc("increment_customer_balance", {
        p_user_id: user.id,
        p_customer_id: rental.customer_id,
        p_amount: lateCharges + extraCharges,
      });
    }

    toast.success(`Return finalized. Late: $${lateCharges.toFixed(2)}, Damage: $${extraCharges.toFixed(2)}.`);
    setRental(null);
    setItems([]);
    setPostChecks({});
    setDamage({});
    setQuery(""); // Clear search query
    setActiveRentals(prev => prev.filter(r => r.id !== rental.id)); // Remove from active list
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">Returns</h1>

      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <Label htmlFor="search-query">Search by Gear ID, Rental ID, Customer Name, Phone, or Email</Label>
          <Input 
            id="search-query"
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="e.g. BCD-001, rental UUID, John Doe, 555-1234, john@example.com" 
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleSearch}>Find Rental</Button>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="inspector-name">Inspector Name</Label>
          <Input 
            id="inspector-name"
            value={inspector} 
            onChange={(e) => setInspector(e.target.value)} 
            placeholder="Your name" 
          />
        </div>
      </div>

      {rental && (
        <div className="space-y-4 border rounded p-4">
          <h2 className="text-lg font-semibold">Rental Details for Return</h2>
          <p className="text-sm text-muted-foreground">Rental ID: {rental.id}</p>
          <p className="text-sm text-muted-foreground">Customer: {rental.customers?.name} ({rental.customers?.email || rental.customers?.phone || 'N/A'})</p>
          <p className="text-sm text-muted-foreground">Expected End: {format(new Date(rental.expected_end_at), 'PPP p')}</p>
          <div className="space-y-3 mt-4">
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
                      Regulator breathes freely
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.regulator_ip_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], regulator_ip_ok: !!v } }))} />
                      Regulator IP check OK
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.octopus_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], octopus_ok: !!v } }))} />
                      Octopus function OK
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.bcd_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], bcd_ok: !!v } }))} />
                      BCD inflates/deflates OK
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.holds_pressure_5min} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], holds_pressure_5min: !!v } }))} />
                      BCD holds pressure (5 min)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.opv_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], opv_ok: !!v } }))} />
                      OPV OK
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.power_inflator_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], power_inflator_ok: !!v } }))} />
                      Power inflator OK
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.computer_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], computer_ok: !!v } }))} />
                      Dive computer powers on
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.computer_battery_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], computer_battery_ok: !!v } }))} />
                      Battery indicator OK
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.computer_screen_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], computer_screen_ok: !!v } }))} />
                      Screen legible
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.computer_buttons_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], computer_buttons_ok: !!v } }))} />
                      Buttons work
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.wetsuit_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], wetsuit_ok: !!v } }))} />
                      Wetsuit no major tears
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!checks.wetsuit_zipper_ok} onCheckedChange={(v) => setPostChecks(prev => ({ ...prev, [item.id]: { ...prev[item.id], wetsuit_zipper_ok: !!v } }))} />
                      Wetsuit zipper OK
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

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Rentals</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Expected Return</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeRentals.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.customers?.name || "N/A"}</TableCell>
                  <TableCell>{format(new Date(r.start_at), 'PPP')}</TableCell>
                  <TableCell className={new Date(r.expected_end_at) < new Date() ? "text-destructive" : ""}>
                    {format(new Date(r.expected_end_at), 'PPP')}
                  </TableCell>
                  <TableCell>${Number(r.total_cost || 0).toFixed(2)}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => loadRentalDetails(r.id)}>Process Return</Button>
                  </TableCell>
                </TableRow>
              ))}
              {activeRentals.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No active rentals found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}