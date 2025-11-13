"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  userId: string;
  displayName: string;
  onDone: () => void;
};

export default function ActionsCell({ userId, displayName, onDone }: Props) {
  const [busy, setBusy] = useState(false);

  const deleteUser = async () => {
    if (!window.confirm(`Delete ${displayName}? This removes their account permanently.`)) return;

    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("You must be logged in.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.functions.invoke("manage-user", {
      body: { action: "delete", user_id: userId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      setBusy(false);
      return;
    }

    toast.success("User deleted.");
    setBusy(false);
    onDone();
  };

  return (
    <div className="flex justify-end">
      <Button variant="destructive" size="sm" disabled={busy} onClick={deleteUser}>
        Delete
      </Button>
    </div>
  );
}