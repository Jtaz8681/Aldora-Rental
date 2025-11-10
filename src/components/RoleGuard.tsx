"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Role = "owner" | "manager" | "dev" | "staff" | "technician" | null;

type Props = {
  allow: Role[]; // roles allowed to view children
  children: React.ReactNode;
  title?: string;
};

export default function RoleGuard({ allow, children, title }: Props) {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRole(null); setLoading(false); return; }
      const { data: roleData } = await supabase.rpc("get_my_role");
      const r = (roleData as Role) || "manager";
      setRole(r);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="text-center text-muted-foreground">Checking access...</div>;
  }

  if (!role || !allow.includes(role)) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>{title || "Access denied"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You do not have permission to view this page. Please contact a manager.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}