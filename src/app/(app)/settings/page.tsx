"use client";

import React, { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RoleGuard from "@/components/RoleGuard";
import CategoryPricingForm from "@/components/CategoryPricingForm";
import GearTypeManager from "@/components/GearTypeManager";

const schema = z.object({
  late_fee_per_day: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      late_fee_per_day: 0,
    },
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from("service_settings")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (settings) {
        setValue("late_fee_per_day", Number(settings.late_fee_per_day ?? 0));
      } else {
        // Initialize settings row
        await supabase.from("service_settings").insert({ user_id: user!.id });
      }
    })();
  }, [setValue]);

  const onSubmit: SubmitHandler<FormValues> = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from("service_settings")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const payload = {
      late_fee_per_day: values.late_fee_per_day,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("service_settings")
        .update(payload)
        .eq("id", existing.id)
        .eq("user_id", user.id);
      if (error) {
        toast.error("Failed to save settings: " + error.message);
        throw error;
      }
    } else {
      const { error } = await supabase
        .from("service_settings")
        .insert({ user_id: user.id, ...payload });
      if (error) {
        toast.error("Failed to save settings: " + error.message);
        throw error;
      }
    }

    toast.success("Settings saved.");
  };

  return (
    <RoleGuard allow={["owner", "manager"]} title="Settings">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>

        {/* Single-column, centered content */}
        <div className="mx-auto max-w-screen-md space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Late Fee</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div>
                <Label>Late fee per day</Label>
                <Input type="number" step="0.01" {...register("late_fee_per_day")} />
              </div>
              <div>
                <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Save Settings</Button>
              </div>
            </CardContent>
          </Card>

          <CategoryPricingForm />

          <GearTypeManager />
        </div>
      </div>
    </RoleGuard>
  );
}