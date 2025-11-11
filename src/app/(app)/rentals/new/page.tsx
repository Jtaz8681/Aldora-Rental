"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignaturePad from "@/components/SignaturePad";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PickList from "@/components/PickList";
import { roundToTwo } from "@/lib/format";
import { ensureDefaultTemplate } from "@/lib/checklists";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { loadPickListSettings } from "@/lib/picklist";

type Customer = { id: string; name: string; };
type Gear = { id: string; internal_id: string; category: string; rental_price: number; status: string; category_id?: string; checklist_template_pre?: Record<string, string> | null };

export default function NewRentalPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [gear, setGear] = useState<Gear[]>([]);
  const [categoryPreTemplates, setCategoryPreTemplates] = useState<Record<string, Record<string, string>>>({});
  const [customerId, setCustomerId] = useState("");
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");
  const [selectedGearIds, setSelectedGearIds] = useState<string[]>([]);
  const [signature, setSignature] = useState<string>("");

  const [isPackage, setIsPackage] = useState(false);
  const [packageTotal, setPackageTotal] = useState<string>("");

  const [checklist, setChecklist] = useState<Record<string, Record<string, boolean>>>({});
  const [conflictsByGear, setConflictsByGear] = useState<Record<string, { rentalId: string; start_at: string; expected_end_at: string }[]>>({});
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Modal flow state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"signature" | "picklist">("signature");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: c } = await supabase.from("customers").select("id,name").order("name");
      setCustomers(c || []);
      const { data: g } = await supabase
        .from("gear_items")
        .select("id, internal_id, category, rental_price, status, category_id, checklist_template_pre")
        .eq("status", "Available")
        .order("internal_id");
      setGear(g || []);

      const catIds = Array.from(new Set((g || []).map((x: any) => x.category_id).filter(Boolean)));
      if (catIds.length) {
        const { data: cats } = await supabase
          .from("gear_categories")
          .select("id, checklist_template_pre")
          .in("id", catIds);
        const map: Record<string, Record<string, string>> = {};
        (cats || []).forEach((cat: any) => {
          map[cat.id] = (cat.checklist_template_pre as any) || {};
        });
        setCategoryPreTemplates(map);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!startAt || !endAt || selectedGearIds.length === 0) {
        setConflictsByGear({});
        return;
      }
      setCheckingConflicts(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingConflicts(false);
        return;
      }

      const { data: items } = await supabase
        .from("rental_items")
        .select("gear_id, rental_id, rentals(id, start_at, expected_end_at, status)")
        .in("gear_id", selectedGearIds);

      const conflicts: Record<string, { rentalId: string; start_at: string; expected_end_at: string }[]> = {};
      const start = new Date(startAt).getTime();
      const end = new Date(endAt).getTime();

      (items || []).forEach((row: any) => {
        const r = row.rentals;
        if (!r || r.status !== "active") return;
        const rStart = new Date(r.start_at).getTime();
        const rEnd = new Date(r.expected_end_at).getTime();
        const overlaps = !(rEnd < start || rStart > end);
        if (overlaps) {
          const gid = row.gear_id as string;
          conflicts[gid] = conflicts[gid] || [];
          conflicts[gid].push({
            rentalId: r.id,
            start_at: r.start_at,
            expected_end_at: r.expected_end_at,
          });
        }
      });

      setConflictsByGear(conflicts);
      setCheckingConflicts(false);
    };

    run();
  }, [startAt, endAt, selectedGearIds]);

  const hasConflicts = Object.keys(conflictsByGear).length > 0;

  const days = useMemo(() => {
    if (!startAt || !endAt) return 1;
    const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
    const d = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return Math.max(d, 1);
  }, [startAt, endAt]);

  const total = useMemo(() => {
    if (isPackage) {
      const val = Number(packageTotal || 0);
      return isNaN(val) ? 0 : Math.max(val, 0);
    }
    return selectedGearIds.reduce((sum, id) => {
      const g = gear.find(x => x.id === id);
      return sum + (Number(g?.rental_price || 0) * days);
    }, 0);
  }, [isPackage, packageTotal, selectedGearIds, gear, days]);

  const toggleGear = (id: string) => {
    setSelectedGearIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const gItem = gear.find(x => x.id === id);
    const rawTmpl = (gItem?.checklist_template_pre && Object.keys(gItem.checklist_template_pre).length
      ? gItem.checklist_template_pre
      : (gItem?.category_id ? categoryPreTemplates[gItem.category_id] || {} : {})) as Record<string, string>;
    const tmpl = ensureDefaultTemplate(rawTmpl);
    const defaults = Object.fromEntries(Object.keys(tmpl).map(k => [k, false]));
    setChecklist(prev => ({ ...prev, [id]: prev[id] || defaults }));
  };

  const startFinalizeFlow = () => {
    if (!customerId || !startAt || !endAt || selectedGearIds.length === 0) {
      toast.error("Please complete all fields and select at least one item.");
      return;
    }
    if (isPackage && (!packageTotal || Number(packageTotal) <= 0)) {
      toast.error("Enter a valid package total price.");
      return;
    }
    if (hasConflicts) {
      toast.error("Resolve gear conflicts before finalizing.");
      return;
    }
    setCheckoutStep("signature");
    setCheckoutOpen(true);
  };

  const submitRental = async () => {
    if (!signature) {
      toast.error("Please capture a signature.");
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

    for (let idx = 0; idx < selectedGearIds.length; idx++) {
      const gearId = selectedGearIds[idx];
      const g = gear.find(x => x.id === gearId);
      const preChecklist = checklist[gearId] || {};

      let perItemPricePerDay = Number(g?.rental_price || 0);
      let packageShareTotal: number | null = null;

      if (isPackage) {
        const shareTotal = roundToTwo(total / selectedGearIds.length);
        packageShareTotal = shareTotal;
        perItemPricePerDay = shareTotal / days;
      }

      await supabase.from("rental_items").insert({
        user_id: user.id,
        rental_id: rental.id,
        gear_id: gearId,
        price: perItemPricePerDay,
        pre_checklist: preChecklist,
        package_share_total: packageShareTotal
      });

      await supabase.from("gear_items")
        .update({ status: "Checked-Out" })
        .eq("id", gearId);
    }

    const { error: balanceErr } = await supabase.rpc("increment_customer_balance", {
      p_user_id: user.id,
      p_customer_id: customerId,
      p_amount: total,
    });

    if (balanceErr) {
      const { data: cust } = await supabase
        .from("customers")
        .select("balance_due")
        .eq("user_id", user.id)
        .eq("id", customerId)
        .single();
      const current = Number(cust?.balance_due || 0);
      await supabase
        .from("customers")
        .update({ balance_due: current + total })
        .eq("user_id", user.id)
        .eq("id", customerId);
    }

    toast.success("Rental created and gear checked out");
    setCheckoutOpen(false);
    router.push(`/customers/${customerId}`);
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">New Rental</h1>

      {hasConflicts && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTitle>Some selected gear is already booked</AlertTitle>
          <AlertDescription className="text-sm">
            Adjust your dates or remove the conflicting items below. You cannot finalize while conflicts exist.
          </AlertDescription>
        </Alert>
      )}

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

      <div className="grid sm:grid-cols-2 gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="isPackage">Price as package</Label>
          <Switch id="isPackage" checked={isPackage} onCheckedChange={(v) => setIsPackage(!!v)} />
        </div>
        {isPackage && (
          <div>
            <Label htmlFor="packageTotal">Package total price</Label>
            <Input
              id="packageTotal"
              type="number"
              step="0.01"
              value={packageTotal}
              onChange={(e) => setPackageTotal(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Total of ${Number(total || 0).toFixed(2)} will be divided across {selectedGearIds.length || 0} item(s).
            </p>
          </div>
        )}
      </div>

      <div>
        <Label className="block mb-2">Gear (Available)</Label>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {gear.map(g => {
            const conflicts = conflictsByGear[g.id] || [];
            return (
              <label key={g.id} className="flex flex-col gap-1 border rounded p-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={selectedGearIds.includes(g.id)} onCheckedChange={() => toggleGear(g.id)} />
                  <span className="text-sm">{g.internal_id} · {g.category} · ${g.rental_price.toFixed(2)}/day</span>
                </div>
                {selectedGearIds.includes(g.id) && conflicts.length > 0 && (
                  <span className="text-xs text-destructive">
                    Not available for selected dates (conflicts with {conflicts.length} rental{conflicts.length > 1 ? "s" : ""})
                  </span>
                )}
              </label>
            );
          })}
          {gear.length === 0 && <p className="text-sm text-muted-foreground">No available gear.</p>}
        </div>
        {hasConflicts && (
          <div className="mt-3 space-y-2">
            {Object.entries(conflictsByGear).map(([gid, list]) => {
              const g = gear.find(x => x.id === gid);
              return (
                <div key={gid} className="text-xs">
                  <span className="font-medium">{g?.internal_id || "Gear"}:</span>{" "}
                  {list.map((c, i) => (
                    <span key={c.rentalId}>
                      {new Date(c.start_at).toLocaleDateString()} → {new Date(c.expected_end_at).toLocaleDateString()}
                      {i < list.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedGearIds.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pre-Rental Inspection</h2>
          {selectedGearIds.map(id => {
            const gItem = gear.find(x => x.id === id);
            const c = checklist[id] || {};
            const rawTmpl = (gItem?.checklist_template_pre && Object.keys(gItem.checklist_template_pre || {}).length
              ? (gItem?.checklist_template_pre as any)
              : (gItem?.category_id ? categoryPreTemplates[gItem.category_id] || {} : {})) as Record<string, string>;
            const tmpl = ensureDefaultTemplate(rawTmpl);
            return (
              <div key={id} className="border rounded p-3">
                <p className="font-medium text-sm mb-2">{gItem?.internal_id} · {gItem?.category}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {Object.entries(tmpl).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!c[key]}
                        onCheckedChange={(v) => setChecklist(prev => ({ ...prev, [id]: { ...prev[id], [key]: !!v } }))}
                      />
                      {label}
                    </label>
                  ))}
                  {Object.keys(tmpl).length === 0 && (
                    <span className="text-xs text-muted-foreground">No pre-checks configured for this category.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm">
          Total: <span className="font-semibold">${Number(total || 0).toFixed(2)}</span> ({days} day{days > 1 ? "s" : ""})
        </p>
        <div className="flex gap-2">
          <Button onClick={startFinalizeFlow} disabled={checkingConflicts || hasConflicts}>
            {checkingConflicts ? "Checking..." : "Finalize & Check Out"}
          </Button>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          {checkoutStep === "signature" && (
            <>
              <DialogHeader>
                <DialogTitle>Rental Waiver Signature</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <SignaturePad onChange={setSignature} />
              </div>
              <DialogFooter className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  if (!signature) {
                    toast.error("Please capture a signature before continuing.");
                    return;
                  }
                  setCheckoutStep("picklist");
                }}>
                  Save Signature
                </Button>
              </DialogFooter>
            </>
          )}

          {checkoutStep === "picklist" && (
            <>
              <DialogHeader>
                <DialogTitle>Pack List</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <PickList
                  customerName={customers.find(c => c.id === customerId)?.name || ""}
                  startAt={startAt}
                  endAt={endAt}
                  items={selectedGearIds.map(id => {
                    const gItem = gear.find(x => x.id === id);
                    const shareTotal = isPackage ? roundToTwo(total / selectedGearIds.length) : Number(gItem?.rental_price || 0) * days;
                    const pricePerDay = isPackage ? shareTotal / days : Number(gItem?.rental_price || 0);
                    return { internal_id: gItem?.internal_id || "", category: gItem?.category || "", price: Number(pricePerDay || 0) };
                  })}
                  total={total}
                  settings={loadPickListSettings()}
                />
              </div>
              <DialogFooter className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCheckoutOpen(false)}>Back</Button>
                <Button onClick={submitRental}>Complete Checkout</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}