"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import MultiPhotoUpload from "@/components/MultiPhotoUpload";
import ManualUpload from "@/components/ManualUpload";

const schema = z.object({
  internal_id: z.string().min(1, "Internal ID is required"),
  friendly_name: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  sub_type: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  status: z.enum(["Available", "Checked-Out", "In Maintenance", "Overdue", "Quarantined", "Retired"]),
  rental_price: z.coerce.number().min(0, "Rental price must be >= 0"),
  purchase_date: z.string().optional(),
  purchase_price: z.coerce.number().min(0).optional(),
  manual_url: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewGearPage() {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { isSubmitting, errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "Available",
    },
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const [manualUrl, setManualUrl] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cats } = await supabase
        .from("gear_categories")
        .select("name")
        .order("name", { ascending: true });
      setCategories((cats || []).map((c) => c.name));

      const { data: subs } = await supabase
        .from("gear_subcategories")
        .select("name")
        .order("name", { ascending: true });
      setSubcategories((subs || []).map((s) => s.name));
    };
    load();
  }, []);

  const onSubmit = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("gear_items").insert({
      user_id: user.id,
      internal_id: values.internal_id,
      friendly_name: values.friendly_name || null,
      category: values.category,
      sub_type: values.sub_type || null,
      brand: values.brand || null,
      model: values.model || null,
      size: values.size || null,
      status: values.status,
      rental_price: values.rental_price,
      purchase_date: values.purchase_date || null,
      purchase_price: values.purchase_price || null,
      manual_url: manualUrl || null,
    });

    if (error) {
      toast.error("Failed to create gear: " + error.message);
      throw error;
    }

    toast.success("Gear created");
    router.push("/gear");
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Add New Gear</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div>
          <Label htmlFor="internal_id">Internal ID</Label>
          <Input id="internal_id" {...register("internal_id")} placeholder="e.g., BCD-001" />
          {errors.internal_id && <p className="text-xs text-destructive mt-1">{errors.internal_id.message}</p>}
        </div>

        <div>
          <Label htmlFor="friendly_name">Friendly Name</Label>
          <Input id="friendly_name" {...register("friendly_name")} placeholder="e.g., Jacket Style BCD" />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select onValueChange={(v) => setValue("category", v)} value={watch("category")}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
        </div>

        <div>
          <Label htmlFor="sub_type">Sub-Type</Label>
          <Select onValueChange={(v) => setValue("sub_type", v)} value={watch("sub_type")}>
            <SelectTrigger>
              <SelectValue placeholder="Select sub-type" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" {...register("brand")} placeholder="e.g., Scubapro" />
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Input id="model" {...register("model")} placeholder="e.g., MK25" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <Label htmlFor="size">Size</Label>
            <Input id="size" {...register("size")} placeholder="e.g., M" />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(v) => setValue("status", v as any)} value={watch("status")}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Checked-Out">Checked-Out</SelectItem>
                <SelectItem value="In Maintenance">In Maintenance</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Quarantined">Quarantined</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <Label htmlFor="rental_price">Rental Price (per day)</Label>
            <Input id="rental_price" type="number" step="0.01" {...register("rental_price")} />
            {errors.rental_price && <p className="text-xs text-destructive mt-1">{errors.rental_price.message}</p>}
          </div>
          <div>
            <Label htmlFor="purchase_price">Purchase Price</Label>
            <Input id="purchase_price" type="number" step="0.01" {...register("purchase_price")} />
          </div>
        </div>

        <div>
          <Label htmlFor="purchase_date">Purchase Date</Label>
          <Input id="purchase_date" type="date" {...register("purchase_date")} />
        </div>

        <MultiPhotoUpload gearInternalId={watch("internal_id")} initialUrls={photos} onUploaded={setPhotos} />
        <ManualUpload onUploaded={setManualUrl} gearInternalId={watch("internal_id")} />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Gear"}
        </Button>
      </form>
    </div>
  );
}