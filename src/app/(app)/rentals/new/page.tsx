"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignaturePad from "@/components/SignaturePad";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import PickList from "@/components/PickList";

type Customer = { id: string; name: string; };
type Gear = { id: string; internal_id: string; category: string; rental_price: number; status: string; };

export default function NewRentalPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [gear, setGear] = useState<Gear[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");
  const [selectedGearIds, setSelectedGearIds] = useState<string[]>([]);
  const [signature, setSignature] = useState<string>("");

  const [checklist, setChecklist] = useState<Record<string, Record<string, boolean>>>({}); // gearId -> checks

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: c } = await supabase.from("customers").select("id,name").eq("user_id", user.id).order("name");
      setCustomers(c || []);
      const { data: g } = await supabase.from("gear_items").select("id, internal_id, category, rental_price, status").eq("user_id", user.id).eq("status", "Available").order("internal_id");
      setGear(g || []);
    };
    load();
  }, []);

  const days = useMemo(() => {
    if (!startAt || !endAt) return 1;
    const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
    const d = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return Math.max(d, 1);
  }, [startAt, endAt]);

  const total = useMemo(() => {
    return selectedGearIds.reduce((sum, id) => {
      const g = gear.find(x => x.id === id);
      return sum + (g?.rental_price || 0) * days;
    }, 0);
  }, [selectedGearIds, gear, days]);

  const toggleGear = (id: string) => {
    setSelectedGearIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setChecklist(prev => ({ ...prev, [id]: prev[id] || { regulator_ok: false, bcd_ok: false, computer_ok: false, wetsuit_ok: false } }));
  };

  const submitRental = async () => {
    if (!customerId || !startAt || !endAt || selectedGearIds.length === 0 || !signature) {
      toast.error("Please complete all fields and capture a signature.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rental, error: rentalErr } = await supabase.from("rentals").insert({
      user_id: user.id,
      customer_id: customerId,
      start_at: startAt,
      expected_end_at: endAt,
      signed_at: new Date().toISOString(),
      signature_data_url: signature,
      total_cost: total,
      status: "active"
    }).select("*").single();
    if (rentalErr) throw rentalErr;

    for (const gearId of selectedGearIds) {
      const g = gear.find(x => x.id === gearId);
      await supabase.from("rental_items").insert({
        user_id: user.id,
        rental_id: rental.id,
        gear_id: gearId,
        price: g?.rental_price || 0,
        pre_checklist: checklist[gearId] || {}
      });
      await supabase.from("gear_items").update({ status: "Checked-Out" }).eq("id", gearId).eq("user_id", user.id);
    }

    // apply bill to customer account
    await supabase.rpc("increment_customer_balance", { p_user_id: user.id, p_customer_id: customerId, p_amount: total })
      .catch(async () => {
        // Fallback if function not present: direct update
        const { data: cust } = await supabase.from("customers").select("balance_due").eq("user_id", user.id).eq("id", customerId).single();
        const current = Number(cust?.balance_due || 0);
        await supabase.from("customers").update({ balance_due: current + total }).eq("user_id", user.id).eq("id", customerId);
      });

    toast.success("Rental created and gear checked out");
    router.push(`/customers/${customerId}`);
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">New Rental</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Customer</Label>
          <select className="border rounded px-2 py-2 w-full" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {customerId && (
            <p className="mt-2 text-xs text-muted-foreground">
              Outstanding balance will be updated: ${total.toFixed(2)} added.
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <div>
            <Label>Start</Label>
            <Input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
          </div>
          <div>
            <Label>Expected End</Label>
            <Input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <Label className="block mb-2">Gear (Available)</Label>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {gear.map(g => (
            <label key={g.id} className="flex items-center gap-2 border rounded p-2">
              <Checkbox checked={selectedGearIds.includes(g.id)} onCheckedChange={() => toggleGear(g.id)} />
              <span className="text-sm">{g.internal_id} · {g.category} · ${g.rental_price.toFixed(2)}/day</span>
            </label>
          ))}
          {gear.length === 0 && <p className="text-sm text-muted-foreground">No available gear.</p>}
        </div>
      </div>

      {selectedGearIds.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pre-Rental Inspection</h2>
          {selectedGearIds.map(id => {
            const g = gear.find(x => x.id === id);
            const c = checklist[id] || {};
            return (
              <div key={id} className="border rounded p-3">
                <p className="font-medium text-sm mb-2">{g?.internal_id} · {g?.category}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={!!c.regulator_ok} onCheckedChange={(v) => setChecklist(prev => ({ ...prev, [id]: { ...prev[id], regulator_ok: !!v } }))} />
                    Regulator breathes freely
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={!!c.bcd_ok} onCheckedChange={(v) => setChecklist(prev => ({ ...prev, [id]: { ...prev[id], bcd_ok: !!v } }))} />
                    BCD inflates/deflates and holds air
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={!!c.computer_ok} onCheckedChange={(v) => setChecklist(prev => ({ ...prev[id], computer_ok: !!v } }))} />
                    Computer powers on
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={!!c.wetsuit_ok} onCheckedChange={(v) => setChecklist(prev => ({ ...prev[id], wetsuit_ok: !!v } }))} />
                    Wetsuit has no major tears
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Rental Waiver Signature</h2>
        <SignaturePad onChange={setSignature} />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm">Total: <span className="font-semibold">${total.toFixed(2)}</span> ({days} day{days > 1 ? "s" : ""})</p>
        <div className="flex gap-2">
          <PickList
            customerName={customers.find(c => c.id === customerId)?.name || ""}
            startAt={startAt}
            endAt={endAt}
            items={selectedGearIds.map(id => {
              const gItem = gear.find(x => x.id === id);
              return { internal_id: gItem?.internal_id || "", category: gItem?.category || "", price: Number(gItem?.rental_price || 0) };
            })}
            total={total}
          />
          <Button onClick={submitRental}>Finalize & Check Out</Button>
        </div>
      </div>
    </div>
  );
}