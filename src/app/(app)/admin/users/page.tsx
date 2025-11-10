"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import RoleGuard from "@/components/RoleGuard";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  updated_at?: string | null;
};

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Managers/Owners can view all via secure RPC; others see their own profile
    const { data, error } = await supabase.rpc("list_profiles_for_admin");

    if (error) {
      toast.error("Failed to load users: " + error.message);
      return;
    }
    const list = (data || []) as Profile[];
    list.sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    });
    setProfiles(list);
  };

  useEffect(() => {
    load();
  }, []);

  const updateRole = async (id: string, role: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update role: " + error.message);
      throw error;
    }
    toast.success("Role updated.");
    await load();
  };

  const roleOptions = ["owner", "manager", "dev", "technician", "staff"];

  return (
    <RoleGuard allow={["owner", "manager", "dev"]} title="Users & Roles">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Users & Roles</h1>
        <Card>
          <CardHeader>
            <CardTitle>Manage Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.first_name || p.last_name ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : p.id}
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(v) => updateRole(p.id, v)}
                        value={(p.role || "manager")}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {profiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}