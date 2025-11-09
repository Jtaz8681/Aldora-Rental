"use client";

import React, { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  gear_id: z.string().uuid("Select a gear item"),
  problem_description: z.string().min(2, "Describe the problem"),
  assigned_technician: z.string().optional(),
  estimated_completion_date: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  charge_customer: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

type GearOption = { id: string; internal_id: string; category: string };

type Props = {
  onCreated?: () => void;
};

export default function MaintenanceTicketForm({ onCreated }: Props) {
  const { register, handleSubmit, setValue, formState: { isSubmitting, errors }, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const [gearOptions, setGearOptions] = useState<GearOption[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("gear_items")
        .select("id, internal_id, category")
        .eq("user_id", user.id)
        .order("internal_id", { ascending: true });
      if (error) {
        toast.error("Failed to load gear: " + error.message);
        return;
      }
      setGearOptions(data || []);
    })();
  }, []);

  const onSubmit = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("maintenance_tickets")
      .insert({
        user_id: user.id,
        gear_id: values.gear_id,
        problem_description: values.problem_description,
        assigned_technician: values.assigned_technician || null,
        estimated_completion_date: values.estimated_completion_date || null,
        cost: values.cost ?? null,
        charge_customer: !!values.charge_customer,
        status: "pending",
      });

    if (error) {
      toast.error("Failed to create ticket: " + error.message);
      throw error;
    }

    toast.success("Maintenance ticket created.");
    reset();
    onCreated?.();
  };

  const selectedGearId = watch("gear_id");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
      <div>
        <Label>Gear Item</Label>
        <Select onValueChange={(v) => setValue("gear_id", v)} value={selectedGearId || ""}>
          <SelectTrigger>
            <SelectValue placeholder="Select gear" />
          </SelectTrigger>
          <SelectContent>
            {gearOptions.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                <span className="font-mono">{g.internal_id}</span> <span className="text-muted-foreground">({g.category})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.gear_id && <p className="text-xs text-destructive mt-1">{errors.gear_id.message}</p>}
      </div>
      <div>
        <Label>Problem Description</Label>
        <Input placeholder="e.g., Leak detected on inflator" {...register("problem_description")} />
        {errors.problem_description && <p className="text-xs text-destructive mt-1">{errors.problem_description.message}</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <Label>Assigned Technician</Label>
          <Input placeholder="Technician name" {...register("assigned_technician")} />
        </div>
        <div>
          <Label>Estimated Completion Date</Label>
          <Input type="date" {...register("estimated_completion_date")} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <Label>Cost of Service</Label>
          <Input type="number" step="0.01" {...register("cost")} />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Checkbox onCheckedChange={(v) => setValue("charge_customer", !!v)} />
          <span className="text-sm">Charge customer (if applicable)</span>
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>Create Ticket</Button>
    </form>
  );
}