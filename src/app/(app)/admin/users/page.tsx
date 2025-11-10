"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import RoleGuard from "@/components/RoleGuard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  updated_at?: string | null;
  email: string | null;
};

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Managers/Owners/Devs can view all via secure RPC; others see their own profile
    const { data, error } = await supabase.rpc("list_profiles_with_email");

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

  const createUser = async () => {
    if (!newFirst.trim() || !newLast.trim() || !newEmail.trim() || !newPassword.trim() || !newRole.trim()) {
      toast.error("All fields are required.");
      return;
    }
    setCreating(true);
    const { error, data } = await supabase.functions.invoke("create-user", {
      body: { first_name: newFirst.trim(), last_name: newLast.trim(), email: newEmail.trim(), password: newPassword, role: newRole }
    });
    if (error) {
      toast.error("Failed to create user: " + error.message);
      setCreating(false);
      return;
    }
    toast.success("User created.");
    setNewFirst(""); setNewLast(""); setNewEmail(""); setNewPassword(""); setNewRole("staff");
    await load();
    setCreating(false);
  };

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
            <CardTitle>Add User</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>First Name</Label>
              <Input value={newFirst} onChange={(e) => setNewFirst(e.target.value)} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={newLast} onChange={(e) => setNewLast(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div>
              <Label>Temporary Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={createUser} disabled={creating}>Create User</Button>
            </div>
          </CardContent>
        </Card>

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
                {profiles.map(p => {
                  const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
                  const display = fullName || p.email || "Unknown";
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{display}</TableCell>
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
                  );
                })}
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