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

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  certification_level: z.string().optional(),
  certification_agency: z.string().optional(),
  past_damage_notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomer = async () => {
      if (!id) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .eq("id", id)
        .single();

      if (error) {
        toast.error("Failed to load customer: " + error.message);
        router.push("/customers");
        return;
      }

      if (data) {
        reset(data); // Pre-fill the form with existing data
      }
      setLoading(false);
    };
    loadCustomer();
  }, [id, reset, router]);

  const onSubmit = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("customers").update({
      ...values,
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update customer: " + error.message);
      throw error;
    }
    toast.success("Customer updated");
    router.push(`/customers/${id}`);
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading customer data...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Edit Customer</h1>
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
      <Button disabled={isSubmitting} type="submit">Save Changes</Button>
      {Object.keys(errors).length > 0 && (
        <p className="text-xs text-destructive">Please fix the highlighted fields.</p>
      )}
    </form>
  );
}