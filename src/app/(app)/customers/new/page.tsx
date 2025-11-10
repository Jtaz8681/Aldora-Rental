"use client";

import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DuplicateCustomerWarning from "@/components/DuplicateCustomerWarning";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  certification_level: z.string().optional(),
  certification_agency: z.string().optional(),
  past_damage_notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export default function NewCustomerPage() {
  const router = useRouter();
  const { register, handleSubmit, getValues, formState: { isSubmitting, errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);

  const addCustomer = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("customers").insert({
      user_id: user.id,
      ...values,
    });
    if (error) {
      toast.error("Failed to add customer: " + error.message);
      throw error;
    }
    toast.success("Customer added");
    router.push("/customers");
  };

  const onSubmit = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let queryBuilder = supabase.from("customers").select("id, name, phone, email");
    const conditions: string[] = [];

    if (values.name) conditions.push(`name.ilike.%${values.name}%`);
    if (values.phone) conditions.push(`phone.eq.${values.phone}`);
    if (values.email) conditions.push(`email.eq.${values.email}`);

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.or(conditions.join(","));
    }

    const { data: existingCustomers, error: duplicateError } = await queryBuilder.limit(1);

    if (duplicateError) {
      toast.error("Error checking for duplicates: " + duplicateError.message);
      throw duplicateError;
    }

    if (existingCustomers && existingCustomers.length > 0) {
      setDuplicateCustomer(existingCustomers[0]);
      setShowDuplicateWarning(true);
    } else {
      await addCustomer(values);
    }
  };

  const handleConfirmNew = async () => {
    setShowDuplicateWarning(false);
    await addCustomer(getValues());
  };

  const handleViewExisting = (id: string) => {
    setShowDuplicateWarning(false);
    router.push(`/customers/${id}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Add Customer</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" {...register("email")} />
          {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="certification_level">Certification Level</Label>
          <Input id="certification_level" {...register("certification_level")} placeholder="#" />
        </div>
        <div>
          <Label htmlFor="certification_agency">Certification Agency</Label>
          <Input id="certification_agency" {...register("certification_agency")} placeholder="PADI, SSI..." />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="past_damage_notes">Past Damage Notes</Label>
          <Input id="past_damage_notes" {...register("past_damage_notes")} />
        </div>
      </div>
      <Button disabled={isSubmitting} type="submit">Save</Button>
      {Object.keys(errors).length > 0 && (
        <p className="text-xs text-destructive">Please fix the highlighted fields.</p>
      )}

      {duplicateCustomer && (
        <DuplicateCustomerWarning
          open={showDuplicateWarning}
          onOpenChange={setShowDuplicateWarning}
          duplicateCustomer={duplicateCustomer}
          onConfirmNew={handleConfirmNew}
          onViewExisting={handleViewExisting}
        />
      )}
    </form>
  );
}