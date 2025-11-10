"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ManualUpload from "@/components/ManualUpload";
import MultiPhotoUpload from "@/components/MultiPhotoUpload";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  internal_id: z.string().min(1),
  friendly_name: z.string().optional(),
  category: z.string().min(1),
  sub_type: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  rental_price: z.coerce.number().min(0),
  photos_csv: z.string().optional(),
  serial_number: z.string().optional(),
  home_location: z.string().optional(),
  manual_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_cost: z.coerce.number().optional(),
  initial_cost: z.coerce.number().optional(),
  current_value: z.coerce.number().optional(),
  status: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export default function EditGearPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      internal_id: "",
      category: "",
      rental_price: 0,
      status: "Available",
    },
  });
  const internalId = watch("internal_id");
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [logsByTicket, setLogsByTicket] = useState<Record<string, any[]>>({});
  const [categories, setCategories] = useState<{ id: string; name: string; service_interval_months: number | null; usage_service_threshold: number | null }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; category_id: string; service_interval_months: number | null; usage_service_threshold: number | null }[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [useCustomSchedule, setUseCustomSchedule] = useState<boolean>(false);
  const [customMonths, setCustomMonths] = useState<number | "">("");
  const [customUsageDays, setCustomUsageDays] = useState<number | "">("");
  // NEW: item-level checklist templates
  const [itemPreTemplate, setItemPreTemplate] = useState<Record<string, string>>({});
  const [itemPostTemplate, setItemPostTemplate] = useState<Record<string, string>>({});
  const [newItemPreKey, setNewItemPreKey] = useState("");
  const [newItemPreLabel, setNewItemPreLabel] = useState("");
  const [newItemPostKey, setNewItemPostKey] = useState("");
  const [newItemPostLabel, setNewItemPostLabel] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: cats } = await supabase
        .from("gear_categories")
        .select("id, name, service_interval_months, usage_service_threshold")
        .eq("user_id", user.id)
        .order("name");
      setCategories(cats || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!categoryId) { setSubcategories([]); setSubcategoryId(""); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: subs } = await supabase
        .from("gear_subcategories")
        .select("id, name, category_id, service_interval_months, usage_service_threshold")
        .eq("user_id", user.id)
        .eq("category_id", categoryId)
        .order("name");
      setSubcategories(subs || []);
    })();
  }, [categoryId]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;
      const { data, error } = await supabase
        .from("gear_items")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        toast.error("Failed to load gear: " + error.message);
        router.push("/gear");
        return;
      }
      if (data) {
        reset({
          internal_id: data.internal_id,
          friendly_name: data.friendly_name || "",
          category: data.category,
          sub_type: data.sub_type || "",
          brand: data.brand || "",
          model: data.model || "",
          size: data.size || "",
          rental_price: Number(data.rental_price || 0),
          photos_csv: (data.photos || []).join(","),
          serial_number: data.serial_number || "",
          home_location: data.home_location || "",
          manual_url: data.manual_url || "",
          notes: data.notes || "",
          purchase_date: data.purchase_date || "",
          purchase_cost: data.purchase_cost ? Number(data.purchase_cost) : undefined,
          initial_cost: data.initial_cost ? Number(data.initial_cost) : undefined,
          current_value: data.current_value ? Number(data.current_value) : undefined,
          status: data.status,
        });
        setPhotoUrls(data.photos || []);
        setCategoryId(data.category_id || "");
        setSubcategoryId(data.subcategory_id || "");
        if (data.service_interval_months != null || data.usage_service_threshold != null) {
          setUseCustomSchedule(true);
          setCustomMonths(data.service_interval_months ?? "");
          setCustomUsageDays(data.usage_service_threshold ?? "");
        } else {
          setUseCustomSchedule(false);
          setCustomMonths("");
          setCustomUsageDays("");
        }
        // NEW: hydrate item-level templates
        setItemPreTemplate((data.checklist_template_pre as Record<string, string>) || {});
        setItemPostTemplate((data.checklist_template_post as Record<string, string>) || {});
        
        // NEW: Load maintenance history for this gear
        const { data: tData } = await supabase
          .from("maintenance_tickets")
          .select("id, status, date_received, problem_description, updated_at, assigned_technician, cost")
          .eq("gear_id", id)
          .order("date_received", { ascending: false });
        setTickets(tData || []);
        const ids = (tData || []).map(t => t.id);
        if (ids.length) {
          const { data: wlData } = await supabase
            .from("maintenance_work_logs")
            .select("id, ticket_id, description, created_at")
            .in("ticket_id", ids)
            .order("created_at", { ascending: false });
          const map: Record<string, any[]> = {};
          (wlData || []).forEach(w => {
            map[w.ticket_id] = [...(map[w.ticket_id] || []), w];
          });
          setLogsByTicket(map);
        } else {
          setLogsByTicket({});
        }
      }
      setLoading(false);
    };
    load();
  }, [id, reset, router]);

  const onSubmit: SubmitHandler<FormValues> = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const photos = (values.photos_csv || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("gear_items")
      .update({
        internal_id: values.internal_id,
        friendly_name: values.friendly_name || null,
        category: (categories.find(c => c.id === categoryId)?.name) || values.category,
        sub_type: (subcategories.find(s => s.id === subcategoryId)?.name) || values.sub_type || null,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        brand: values.brand || null,
        model: values.model || null,
        size: values.size || null,
        rental_price: values.rental_price,
        photos,
        serial_number: values.serial_number || null,
        home_location: values.home_location || null,
        manual_url: values.manual_url || null,
        notes: values.notes || null,
        purchase_date: values.purchase_date || null,
        purchase_cost: values.purchase_cost ?? null,
        initial_cost: values.initial_cost ?? null,
        current_value: values.current_value ?? null,
        updated_at: new Date().toISOString(),
        status: values.status,
        service_interval_months: useCustomSchedule ? (customMonths === "" ? null : Number(customMonths)) : null,
        usage_service_threshold: useCustomSchedule ? (customUsageDays === "" ? null : Number(customUsageDays)) : null,
        // NEW: include item-level templates
        checklist_template_pre: itemPreTemplate,
        checklist_template_post: itemPostTemplate,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update gear: " + error.message);
      throw error;
    }
    toast.success("Gear updated");
    router.push("/gear");
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading gear...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Edit Gear</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Internal ID</Label>
          <Input {...register("internal_id")} />
        </div>
        <div>
          <Label>Status</Label>
          <select className="border rounded px-2 py-2 w-full" {...(register("status") as any)}>
            <option>Available</option>
            <option>Checked-Out</option>
            <option>Overdue</option>
            <option>In Maintenance</option>
            <option>Quarantined</option>
            <option>Retired</option>
          </select>
        </div>
        <div>
          <Label>Friendly Name</Label>
          <Input {...register("friendly_name")} />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={(v) => setCategoryId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sub-type</Label>
          <Select value={subcategoryId} onValueChange={(v) => setSubcategoryId(v)} disabled={!categoryId || subcategories.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={categoryId ? (subcategories.length ? "Select subcategory" : "No subcategories") : "Pick a category first"} />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Brand</Label>
          <Input {...register("brand")} />
        </div>
        <div>
          <Label>Model</Label>
          <Input {...register("model")} />
        </div>
        <div>
          <Label>Size</Label>
          <Input {...register("size")} />
        </div>
        <div>
          <Label>Rental Price (per day)</Label>
          <Input type="number" step="0.01" {...register("rental_price")} />
        </div>

        <div>
          <Label>Purchase Date</Label>
          <Input type="date" {...register("purchase_date")} />
        </div>
        <div>
          <Label>Purchase Cost</Label>
          <Input type="number" step="0.01" {...register("purchase_cost")} />
        </div>
        <div>
          <Label>Initial Cost</Label>
          <Input type="number" step="0.01" {...register("initial_cost")} />
        </div>
        <div>
          <Label>Current Value</Label>
          <Input type="number" step="0.01" {...register("current_value")} />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Service Schedule</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Use custom</span>
              <Switch checked={useCustomSchedule} onCheckedChange={(v) => setUseCustomSchedule(!!v)} />
            </div>
          </div>
          {useCustomSchedule ? (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label>Service interval (months)</Label>
                <Input type="number" value={customMonths === "" ? "" : String(customMonths)} onChange={(e) => setCustomMonths(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <Label>Usage threshold (days rented)</Label>
                <Input type="number" value={customUsageDays === "" ? "" : String(customUsageDays)} onChange={(e) => setCustomUsageDays(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-2">
              {(() => {
                const cat = categories.find(c => c.id === categoryId);
                const sub = subcategories.find(s => s.id === subcategoryId);
                const months = sub?.service_interval_months ?? cat?.service_interval_months;
                const usage = sub?.usage_service_threshold ?? cat?.usage_service_threshold;
                return months || usage
                  ? <>Default applied: {months ? `${months} months` : ""}{months && usage ? " · " : ""}{usage ? `${usage} days rented` : ""}.</>
                  : <>No default configured.</>;
              })()}
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <MultiPhotoUpload
            gearInternalId={internalId}
            initialUrls={photoUrls}
            onUploaded={(urls) => setValue("photos_csv", urls.join(","))}
          />
        </div>

        <div>
          <Label>Serial Number</Label>
          <Input {...register("serial_number")} />
        </div>
        <div>
          <Label>Home Location</Label>
          <Input {...register("home_location")} />
        </div>
        <div className="sm:col-span-2">
          <ManualUpload
            gearInternalId={internalId}
            initialUrl={watch("manual_url") || ""}
            onUploaded={(url) => setValue("manual_url", url)}
          />
        </div>

        {/* NEW: Custom Checklist Templates (This Item) - placed above Notes */}
        <div className="sm:col-span-2 space-y-3">
          <h2 className="text-sm font-medium">Custom Checklist Templates (This Item)</h2>

          <div>
            <div className="text-xs font-semibold mb-1">Pre-Checkout Checklist</div>
            <div className="grid grid-cols-[1.5fr,2fr,auto] gap-2 mb-2">
              <Input placeholder="key" value={newItemPreKey} onChange={(e) => setNewItemPreKey(e.target.value)} />
              <Input placeholder="label" value={newItemPreLabel} onChange={(e) => setNewItemPreLabel(e.target.value)} />
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  if (!newItemPreKey.trim() || !newItemPreLabel.trim()) return;
                  setItemPreTemplate(prev => ({ ...prev, [newItemPreKey.trim()]: newItemPreLabel.trim() }));
                  setNewItemPreKey(""); setNewItemPreLabel("");
                }}
              >
                Add
              </Button>
            </div>
            <div className="space-y-1">
              {Object.entries(itemPreTemplate).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{k}</span> <span>{v}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      const next = { ...itemPreTemplate }; delete next[k]; setItemPreTemplate(next);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {Object.keys(itemPreTemplate).length === 0 && (
                <div className="text-xs text-muted-foreground">No pre-checks configured.</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold mb-1">Post-Check-In Checklist</div>
            <div className="grid grid-cols-[1.5fr,2fr,auto] gap-2 mb-2">
              <Input placeholder="key" value={newItemPostKey} onChange={(e) => setNewItemPostKey(e.target.value)} />
              <Input placeholder="label" value={newItemPostLabel} onChange={(e) => setNewItemPostLabel(e.target.value)} />
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  if (!newItemPostKey.trim() || !newItemPostLabel.trim()) return;
                  setItemPostTemplate(prev => ({ ...prev, [newItemPostKey.trim()]: newItemPostLabel.trim() }));
                  setNewItemPostKey(""); setNewItemPostLabel("");
                }}
              >
                Add
              </Button>
            </div>
            <div className="space-y-1">
              {Object.entries(itemPostTemplate).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{k}</span> <span>{v}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      const next = { ...itemPostTemplate }; delete next[k]; setItemPostTemplate(next);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {Object.keys(itemPostTemplate).length === 0 && (
                <div className="text-xs text-muted-foreground">No post-checks configured.</div>
              )}
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Input {...register("notes")} />
        </div>
      </div>

      <Button disabled={isSubmitting} type="submit">Save Changes</Button>
      {Object.keys(errors).length > 0 && (
        <p className="text-xs text-destructive">Please fix the highlighted fields.</p>
      )}

      {/* NEW: Full Maintenance History */}
      <div className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold">Maintenance History</h2>
        {tickets.length === 0 && (
          <p className="text-sm text-muted-foreground">No maintenance records for this item yet.</p>
        )}
        {tickets.map(t => (
          <div key={t.id} className="border rounded-md p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{t.problem_description || "Service"}</div>
              <span className="text-xs text-muted-foreground">{new Date(t.date_received).toLocaleDateString()}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Status: {t.status} {t.assigned_technician ? `• Tech: ${t.assigned_technician}` : ""} {t.cost != null ? `• Cost: $${Number(t.cost).toFixed(2)}` : ""}
            </div>
            <div className="mt-2 space-y-1">
              {(logsByTicket[t.id] || []).map(l => (
                <div key={l.id} className="text-xs">
                  {new Date(l.created_at).toLocaleString()} • {l.description}
                </div>
              ))}
              {(logsByTicket[t.id] || []).length === 0 && (
                <div className="text-xs text-muted-foreground">No work logs.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </form>
  );
}