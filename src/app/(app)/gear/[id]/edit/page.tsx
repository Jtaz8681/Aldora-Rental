"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ManualUpload from "@/components/ManualUpload";
import MultiPhotoUpload from "@/components/MultiPhotoUpload";

const schema = z.object({
  internal_id: z.string().min(1),
  friendly_name: z.string().optional(),
  category: z.string().min(1),
  sub_type: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  rental_price: z.coerce.number().min(0).default(0),
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
  });
  const internalId = watch("internal_id");
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;
      const { data, error } = await supabase
        .from("gear_items")
        .select("*")
        .eq("user_id", user.id)
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
      }
      setLoading(false);
    };
    load();
  }, [id, reset, router]);

  const onSubmit = async (values: FormValues) => {
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
        category: values.category,
        sub_type: values.sub_type || null,
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
      })
      .eq("id", id)
      .eq("user_id", user.id);

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
          <Input {...register("category")} />
        </div>
        <div>
          <Label>Sub-type</Label>
          <Input {...register("sub_type")} />
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
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Input {...register("notes")} />
        </div>
      </div>

      <Button disabled={isSubmitting} type="submit">Save Changes</Button>
      {Object.keys(errors).length > 0 && (
        <p className="text-xs text-destructive">Please fix the highlighted fields.</p>
      )}
    </form>
  );
}