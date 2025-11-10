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
  regulator_service_interval_months: z.coerce.number().min(1),
  bcd_service_interval_months: z.coerce.number().min(1),
  max_dives_before_service: z.coerce.number().min(1),
  late_fee_per_day: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      regulator_service_interval_months: 12,
      bcd_service_interval_months: 12,
      max_dives_before_service: 100,
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
        setValue("regulator_service_interval_months", Number(settings.regulator_service_interval_months ?? 12));
        setValue("bcd_service_interval_months", Number(settings.bcd_service_interval_months ?? 12));
        setValue("max_dives_before_service", Number(settings.max_dives_before_service ?? 100));
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
      regulator_service_interval_months: values.regulator_service_interval_months,
      bcd_service_interval_months: values.bcd_service_interval_months,
      max_dives_before_service: values.max_dives_before_service,
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
              <CardTitle>Service Intervals</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div>
                <Label>Regulator service interval (months)</Label>
                <Input type="number" {...register("regulator_service_interval_months")} />
              </div>
              <div>
                <Label>BCD service interval (months)</Label>
                <Input type="number" {...register("bcd_service_interval_months")} />
              </div>
              <div>
                <Label>Usage threshold before service (days rented)</Label>
                <Input type="number" {...register("max_dives_before_service")} />
              </div>
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