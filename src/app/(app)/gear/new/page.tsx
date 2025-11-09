"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client"; // Changed from default to named import
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  manual_url: z.string().url().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewGearPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const photos = (values.photos_csv || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const { error } = await supabase.from("gear_items").insert({
      user_id: user.id,
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
      status: "Available",
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
          <Input {...register("category")} placeholder="BCD, Regulator, Wetsuit..." />
        </div>
        <div>
          <Label>Sub-type</Label>
          <Input {...register("sub_type")} placeholder="Jacket, Back-Inflate, Wing..." />
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
          <Label>Photo URLs (comma-separated)</Label>
          <Input {...register("photos_csv")} placeholder="https://..." />
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
          <Label>Manual URL (PDF)</Label>
          <Input {...register("manual_url")} placeholder="https://..." />
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