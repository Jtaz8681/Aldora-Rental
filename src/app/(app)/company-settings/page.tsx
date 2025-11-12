"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CompanyLogoUpload from "@/components/CompanyLogoUpload";
import RoleGuard from "@/components/RoleGuard";

const FormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  logo_url: z.string().url().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof FormSchema>;

export default function CompanySettingsPage() {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: "", logo_url: "" },
  });

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("id, name, logo_url")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (error) {
        toast.error("Failed to load company settings: " + error.message);
        return;
      }
      const s = data?.[0];
      if (s) {
        setValue("name", s.name || "");
        setValue("logo_url", s.logo_url || "");
      }
    };
    load();
  }, [setValue]);

  const onUploaded = (url: string) => {
    setValue("logo_url", url);
  };

  const onSubmit = async (values: FormValues) => {
    // Upsert: keep a single row by updating the latest or inserting one if none exists
    const { data: existing, error: loadErr } = await supabase
      .from("company_settings")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (loadErr) {
      toast.error("Error preparing save: " + loadErr.message);
      return;
    }

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from("company_settings")
        .update({
          name: values.name,
          logo_url: values.logo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id);
      if (error) {
        toast.error("Failed to save: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("company_settings")
        .insert({
          name: values.name,
          logo_url: values.logo_url || null,
        });
      if (error) {
        toast.error("Failed to save: " + error.message);
        return;
      }
    }

    toast.success("Company settings saved");
  };

  return (
    <RoleGuard allowedRoles={["owner"]}>
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Company Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" placeholder="Your company name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <CompanyLogoUpload onUploaded={onUploaded} />

            <div className="grid gap-2">
              <Label htmlFor="logo_url">Logo URL (auto-filled)</Label>
              <Input id="logo_url" {...register("logo_url")} readOnly />
              {errors.logo_url && <p className="text-sm text-destructive">{errors.logo_url.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </RoleGuard>
  );
}