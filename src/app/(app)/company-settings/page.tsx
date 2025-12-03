"use client";

import React, { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CompanyLogoUpload from "@/components/CompanyLogoUpload";
import RoleGuard from "@/components/RoleGuard";
import { AlertTriangle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportDatabase = async () => {
    setIsExporting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("You must be logged in to perform this action.");
      setIsExporting(false);
      return;
    }

    try {
      // Invoke using full function URL as required
      const url = "https://dsnimoewqcyeegvedion.supabase.co/functions/v1/export-database";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          "Accept": "application/sql",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Export failed with status ${res.status}`);
      }

      const sqlText = await res.text();
      const blob = new Blob([sqlText], { type: "application/sql" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `database_dump_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);

      toast.success("Database export downloaded successfully.");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(`Export failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["owner", "dev"]}>
      <div className="max-w-xl mx-auto space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Development Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This tool exports a complete SQL dump of all tables. Use only during development and remove before production.
            </p>
            <Button
              variant="destructive"
              onClick={handleExportDatabase}
              disabled={isExporting}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Full Database (SQL)"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}