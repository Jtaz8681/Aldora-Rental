"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client"; // Changed from default to named import
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
  manual_url: z.string().url().optional(),
  notes: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_cost: z.coerce.number().optional(),
  initial_cost: z.coerce.number().optional(),
  current_value: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewGearPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rental_price: 0,
    },
  });

  const internalId = watch("internal_id");
  const category = watch("category");

  const [categories, setCategories] = React.useState<{ id: string; name: string; service_interval_months: number | null; usage_service_threshold: number | null }[]>([]);
  const [subcategories, setSubcategories] = React.useState<{ id: string; name: string; category_id: string; service_interval_months: number | null; usage_service_threshold: number | null }[]>([]);
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [subcategoryId, setSubcategoryId] = React.useState<string>("");
  const [useCustomSchedule, setUseCustomSchedule] = React.useState<boolean>(false);
  const [customMonths, setCustomMonths] = React.useState<number | "">("");
  const [customUsageDays, setCustomUsageDays] = React.useState<number | "">("");

  React.useEffect(() => {
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

  React.useEffect(() => {
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
      setSubcategoryId("");
      const selectedCat = (cats => cats.find(c => c.id === categoryId))(categories);
      if (selectedCat && !useCustomSchedule) {
        // Prefill rental price already handled; Prefill schedule preview only
        // Do not set form fields directly; store locally
      }
    })();
  }, [categoryId, categories, useCustomSchedule]);

  React.useEffect(() => {
    (async () => {
      const cat = (category || "").trim();
      if (!cat) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Fetch default price for category
      const { data } = await supabase
        .from("category_pricing")
        .select("price")
        .eq("user_id", user.id)
        .eq("category", cat)
        .maybeSingle();
      const defaultPrice = data?.price != null ? Number(data.price) : undefined;
      if (defaultPrice != null) {
        setValue("rental_price", defaultPrice, { shouldValidate: true });
      }
    })();
  }, [category, setValue]);

  const onSubmit: SubmitHandler<FormValues> = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const photos = (values.photos_csv || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const selectedCat = categories.find(c => c.id === categoryId);
    const selectedSub = subcategories.find(s => s.id === subcategoryId);

    const serviceMonths = useCustomSchedule
      ? (customMonths === "" ? null : Number(customMonths))
      : (selectedSub?.service_interval_months ?? selectedCat?.service_interval_months ?? null);
    const usageThreshold = useCustomSchedule
      ? (customUsageDays === "" ? null : Number(customUsageDays))
      : (selectedSub?.usage_service_threshold ?? selectedCat?.usage_service_threshold ?? null);

    const { error } = await supabase.from("gear_items").insert({
      user_id: user.id,
      internal_id: values.internal_id,
      friendly_name: values.friendly_name || null,
      category: selectedCat?.name || values.category, // keep text for readability
      sub_type: selectedSub?.name || values.sub_type || null,
      category_id: selectedCat?.id ?? null,
      subcategory_id: selectedSub?.id ?? null,
      brand: values.brand || null,
      model: values.model || null,
      size: values.size || null,
      rental_price: values.rental_price,
      photos,
      serial_number: values.serial_number || null,
      home_location: values.home_location || null,
      manual_url: values.manual_url || null,
      notes: values.notes || null,
      status: "Available",
      service_interval_months: serviceMonths,
      usage_service_threshold: usageThreshold,
    });
    if (error) throw error;
    toast.success("Gear added");
    router.push("/gear");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Add Gear</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Internal ID</Label>
          <Input {...register("internal_id")} placeholder="BCD-001" />
        </div>
        <div>
          <Label>Friendly Name</Label>
          <Input {...register("friendly_name")} placeholder="Big Blue BCD" />
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
          <p className="text-xs text-muted-foreground mt-1">Manage this list in Settings → Gear Types.</p>
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
          <Input {...register("brand")} placeholder="Scubapro" />
        </div>
        <div>
          <Label>Model</Label>
          <Input {...register("model")} placeholder="Hydros Pro" />
        </div>
        <div>
          <Label>Size</Label>
          <Input {...register("size")} placeholder="Medium" />
        </div>
        <div>
          <Label>Rental Price (per day)</Label>
          <Input type="number" step="0.01" {...register("rental_price")} />
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
                  ? <>Default will be applied: {months ? `${months} months` : ""}{months && usage ? " · " : ""}{usage ? `${usage} days rented` : ""}.</>
                  : <>No default configured; you can set a custom schedule.</>;
              })()}
            </div>
          )}
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
          <MultiPhotoUpload
            gearInternalId={internalId}
            onUploaded={(urls) => setValue("photos_csv", urls.join(","))}
          />
        </div>

        <div>
          <Label>Serial Number</Label>
          <Input {...register("serial_number")} />
        </div>
        <div>
          <Label>Home Location</Label>
          <Input {...register("home_location")} placeholder="Shelf A / Bin 3" />
        </div>
        <div className="sm:col-span-2">
          <ManualUpload
            gearInternalId={internalId}
            onUploaded={(url) => setValue("manual_url", url)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Input {...register("notes")} placeholder="Any misc info" />
        </div>
      </div>

      <Button disabled={isSubmitting} type="submit">Save</Button>
      {Object.keys(errors).length > 0 && (
        <p className="text-xs text-destructive">Please fix the highlighted fields.</p>
      )}
    </form>
  );
}