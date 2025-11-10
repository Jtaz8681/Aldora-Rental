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
import { useRouter } from "next/navigation";
import PostRentalChecklist from "@/components/PostRentalChecklist";
import DamageReportForm from "@/components/DamageReportForm"; // Import the new component
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
type DamageEntry = { hasDamage: boolean; type?: string; severity?: string; photos?: string[]; notes?: string; estimate?: number }; // Updated type
type DamageMap = Record<string, DamageEntry>;

export default function ReturnsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rental, setRental] = useState<Rental | null>(null);
  const [items, setItems] = useState<(RentalItem & { gear: Gear })[]>([]);
  const [postChecks, setPostChecks] = useState<PostChecks>({});
  const [damage, setDamage] = useState<DamageMap>({});
  const [inspector, setInspector] = useState<string>("");
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [lateFeePerDay, setLateFeePerDay] = useState<number>(0);
  const [lateDays, setLateDays] = useState<number>(0);
  const [lateCharges, setLateCharges] = useState<number>(0);
  const [damageCharges, setDamageCharges] = useState<number>(0);
  const [projectedTotal, setProjectedTotal] = useState<number>(0);

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
      setActiveRentals((data || []) as unknown as Rental[]);
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
      defaults[ri.id] = ri.post_checklist || {};
    });
    setPostChecks(defaults);

    const damageDefaults: DamageMap = {};
    enriched.forEach(ri => {
      damageDefaults[ri.id] = { hasDamage: false, photos: [] }; // Initialize damage state with empty photos array
    });
    setDamage(damageDefaults);
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

    // Fetch settings for late fee per day
    const { data: settings } = await supabase
      .from("service_settings")
      .select("late_fee_per_day")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const lateFeePerDay = Number(settings?.late_fee_per_day ?? 0);

    let extraCharges = 0;

    for (const item of items) {
      const checks = postChecks[item.id] || {};
      const { error: updateRentalItemError } = await supabase.from("rental_items")
        .update({ post_checklist: checks, inspected_by: inspector || null, inspected_at: new Date().toISOString() })
        .eq("id", item.id).eq("user_id", user.id);
      
      if (updateRentalItemError) {
        toast.error("Failed to update rental item checklist: " + updateRentalItemError.message);
        throw updateRentalItemError;
      }

      const d = damage[item.id];
      if (d?.hasDamage) {
        const photos = d.photos || []; // Use the photos array directly
        const { data: newDamage, error: insertDamageError } = await supabase
          .from("damage_reports")
          .insert({
            user_id: user.id,
            rental_id: rental.id,
            gear_id: item.gear_id,
            rental_item_id: item.id,
            damage_type: d.type || null,
            severity: d.severity || "Functional",
            photos,
            estimate_cost: d.estimate || null,
            notes: d.notes || null
          })
          .select("*")
          .single();
        
        if (insertDamageError) {
          toast.error("Failed to insert damage report: " + insertDamageError.message);
          throw insertDamageError;
        }

        // NEW: Auto-create maintenance ticket linked to this damage report
        if (!insertDamageError && newDamage) {
          const problem = [d.type, d.notes].filter(Boolean).join(" - ") || "Damage reported";
          await supabase.from("maintenance_tickets").insert({
            user_id: user.id,
            gear_id: item.gear_id,
            rental_id: rental.id,
            damage_report_id: newDamage.id,
            problem_description: problem,
            status: "pending",
            cost: d.estimate ?? null,
            charge_customer: false,
            date_received: new Date().toISOString(),
          });
        }

        const newStatus = d.severity === "Critical" ? "Quarantined" : "In Maintenance";
        const { error: updateGearStatusError } = await supabase.from("gear_items").update({ status: newStatus }).eq("id", item.gear_id).eq("user_id", user.id);
        if (updateGearStatusError) {
          toast.error("Failed to update gear status after damage: " + updateGearStatusError.message);
          throw updateGearStatusError;
        }
        extraCharges += Number(d.estimate || 0);
      } else {
        const { error: updateGearStatusError } = await supabase.from("gear_items").update({ status: "Available" }).eq("id", item.gear_id).eq("user_id", user.id);
        if (updateGearStatusError) {
          toast.error("Failed to update gear status to available: " + updateGearStatusError.message);
          throw updateGearStatusError;
        }
      }
    }

    // Calculate late charges using configured late fee per day
    const lateCharges = lateFeePerDay * lateDays;

    // Update rental as returned and adjust total_cost
    const newTotal = Number(rental.total_cost || 0) + lateCharges + extraCharges;
    const { error: updateRentalError } = await supabase
      .from("rentals")
      .update({ status: "returned", updated_at: new Date().toISOString(), total_cost: newTotal })
      .eq("id", rental.id).eq("user_id", user.id);

    if (updateRentalError) {
      toast.error("Failed to update rental status: " + updateRentalError.message);
      throw updateRentalError;
    }

    // Increase customer balance by late/damage charges
    if (lateCharges + extraCharges > 0) {
      const { error: incrementBalanceError } = await supabase.rpc("increment_customer_balance", {
        p_user_id: user.id,
        p_customer_id: rental.customer_id,
        p_amount: lateCharges + extraCharges,
      });
      if (incrementBalanceError) {
        toast.error("Failed to update customer balance: " + incrementBalanceError.message);
        throw incrementBalanceError;
      }
    }

    toast.success(`Return finalized. Late fee ($${lateFeePerDay.toFixed(2)}/day × ${lateDays} days): $${lateCharges.toFixed(2)}, Damage: $${extraCharges.toFixed(2)}.`);
    setRental(null);
    setItems([]);
    setPostChecks({});
    setDamage({});
    setQuery("");
    setActiveRentals(prev => prev.filter(r => r.id !== rental.id));
    
    router.push("/rentals");
    router.refresh();
  };

  useEffect(() => {
    const computeCharges = async () => {
      if (!rental) {
        setLateFeePerDay(0);
        setLateDays(0);
        setLateCharges(0);
        setDamageCharges(0);
        setProjectedTotal(0);
        return;
      }

      const now = new Date();
      const expected = new Date(rental.expected_end_at);
      const ld = Math.max(Math.ceil((now.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)), 0);
      setLateDays(ld);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from("service_settings")
        .select("late_fee_per_day")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const fee = Number(settings?.late_fee_per_day ?? 0);
      setLateFeePerDay(fee);

      const lCharges = fee * ld;
      setLateCharges(lCharges);

      const dCharges = Object.values(damage).reduce((sum, d) => {
        if (d?.hasDamage) return sum + Number(d.estimate || 0);
        return sum;
      }, 0);
      setDamageCharges(dCharges);

      const newTotal = Number(rental.total_cost || 0) + lCharges + dCharges;
      setProjectedTotal(newTotal);
    };

    computeCharges();
  }, [rental, damage]);

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
              const dmg = damage[item.id] || { hasDamage: false, photos: [] }; // Initialize damage state
              return (
                <div key={item.id} className="border rounded p-3 space-y-2">
                  <PostRentalChecklist
                    gearInternalId={item.gear.internal_id}
                    category={item.gear.category}
                    checklist={checks}
                    onChecklistChange={(newChecks) => setPostChecks(prev => ({ ...prev, [item.id]: newChecks }))}
                  />

                  <DamageReportForm
                    damage={dmg}
                    onDamageChange={(newDamage) => setDamage(prev => ({ ...prev, [item.id]: newDamage }))}
                    gearInternalId={item.gear.internal_id} // Pass gearInternalId
                  />
                </div>
              );
            })}
          </div>

          {/* NEW: Charges preview */}
          <Card>
            <CardHeader>
              <CardTitle>Charges Preview</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span>Late fee per day</span>
                <span>${lateFeePerDay.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Days late</span>
                <span>{lateDays}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Late charges</span>
                <span>${lateCharges.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Damage charges (est.)</span>
                <span>${damageCharges.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between font-medium pt-2 border-t">
                <span>New total after return</span>
                <span>${projectedTotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!inspector.trim()} variant={inspector.trim() ? "default" : "secondary"}>
                  Finalize Return
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Finalize Return</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the rental as returned, update gear status, and add charges to the customer balance.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Late charges</span>
                    <span>${lateCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Damage charges</span>
                    <span>${damageCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between font-medium pt-2 border-t">
                    <span>New rental total</span>
                    <span>${projectedTotal.toFixed(2)}</span>
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={finalizeReturn}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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