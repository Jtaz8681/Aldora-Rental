"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  certification_level: z.string().optional(),
  certification_agency: z.string().optional(),
  past_damage_notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewCustomerPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("customers").insert({
      user_id: user.id,
      ...values,
    });
    if (error) throw error;
    toast.success("Customer added");
    router.push("/customers");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Add Customer</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input {...register("name")} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input {...register("phone")} />
        </div>
        <div className="sm:col-span-2">
          <Label>Email</Label>
          <Input {...register("email")} />
        </div>
        <div>
          <Label>Certification Level</Label>
          <Input {...register("certification_level")} placeholder="#" />
        </div>
        <div>
          <Label>Certification Agency</Label>
          <Input {...register("certification_agency")} placeholder="PADI, SSI..." />
        </div>
        <div className="sm:col-span-2">
          <Label>Past Damage Notes</Label>
          <Input {...register("past_damage_notes")} />
        </div>
      </div>
      <Button disabled={isSubmitting} type="submit">Save</Button>
    </form>
  );
}