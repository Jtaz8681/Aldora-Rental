"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import MultiPhotoUpload from "@/components/MultiPhotoUpload";

const schema = z.object({
  damage_type: z.string().optional(),
  severity: z.enum(["Cosmetic", "Functional", "Critical"]).default("Functional"),
  notes: z.string().optional(),
  estimate_cost: z.coerce.number().min(0).optional(),
  photos_csv: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentalId: string;
  gearId: string;
  gearInternalId: string;
  rentalItemId: string; // Added rentalItemId prop
  onReported?: () => void;
};

export default function ReportDamageDialog({
  open,
  onOpenChange,
  rentalId,
  gearId,
  gearInternalId,
  rentalItemId, // Destructure rentalItemId
  onReported,
}: Props) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      severity: "Functional",
      estimate_cost: 0,
    },
  });

  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const onSubmit = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const photos = (values.photos_csv || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const { error: insertDamageError } = await supabase.from("damage_reports").insert({
      user_id: user.id,
      rental_id: rentalId,
      gear_id: gearId,
      rental_item_id: rentalItemId, // Included rental_item_id
      damage_type: values.damage_type || null,
      severity: values.severity,
      photos,
      estimate_cost: values.estimate_cost ?? null,
      notes: values.notes || null,
    });

    if (insertDamageError) {
      toast.error("Failed to report damage: " + insertDamageError.message);
      throw insertDamageError;
    }

    // If damage is critical, update gear status to Quarantined
    if (values.severity === "Critical") {
      const { error: updateGearStatusError } = await supabase.from("gear_items")
        .update({ status: "Quarantined" })
        .eq("id", gearId)
        .eq("user_id", user.id);
      if (updateGearStatusError) {
        toast.error("Failed to update gear status: " + updateGearStatusError.message);
        throw updateGearStatusError;
      }
    }

    toast.success("Damage reported successfully!");
    reset();
    setPhotoUrls([]);
    onOpenChange(false);
    onReported?.();

    // NEW: Create maintenance ticket automatically for this damage event
    const problem = [values.damage_type || null, values.notes || null]
      .filter(Boolean)
      .join(" - ") || "Damage reported";
    await supabase.from("maintenance_tickets").insert({
      user_id: user.id,
      gear_id: gearId,
      rental_id: rentalId,
      damage_report_id: null, // report id not captured here; leaving null is fine
      problem_description: problem,
      status: "pending",
      cost: values.estimate_cost ?? null,
      charge_customer: false,
      date_received: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Damage for {gearInternalId}</DialogTitle>
          <DialogDescription>
            Document any damage found on this gear item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div>
            <Label htmlFor="damage_type">Damage Type</Label>
            <Input id="damage_type" {...register("damage_type")} placeholder="e.g., Scratch, Leak, Broken" />
          </div>
          <div>
            <Label htmlFor="severity">Severity</Label>
            <select
              id="severity"
              className="border rounded px-2 py-2 w-full"
              {...register("severity")}
            >
              <option value="Cosmetic">Cosmetic</option>
              <option value="Functional">Functional</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...register("notes")} placeholder="Detailed description of damage" />
          </div>
          <div>
            <Label htmlFor="estimate_cost">Estimated Repair Cost</Label>
            <Input id="estimate_cost" type="number" step="0.01" {...register("estimate_cost")} />
            {errors.estimate_cost && <p className="text-destructive text-xs mt-1">{errors.estimate_cost.message}</p>}
          </div>
          <div>
            <MultiPhotoUpload
              gearInternalId={gearInternalId}
              initialUrls={photoUrls}
              onUploaded={(urls) => {
                setPhotoUrls(urls);
                setValue("photos_csv", urls.join(","));
              }}
            />
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}