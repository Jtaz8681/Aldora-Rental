"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function UserSettingsPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .limit(1)
        .maybeSingle();

      setFirstName(profile?.first_name || "");
      setLastName(profile?.last_name || "");
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (error) {
      toast.error("Failed to save profile: " + error.message);
      setSaving(false);
      throw error;
    }
    toast.success("Profile saved.");
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">User Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>First Name <span className="text-destructive">*</span></Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Last Name <span className="text-destructive">*</span></Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}