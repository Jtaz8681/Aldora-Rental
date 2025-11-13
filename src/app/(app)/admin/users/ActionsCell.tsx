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
  const [busy, setBusy] = useState<null | "suspend" | "unsuspend" | "delete">(null);

  const call = async (action: "suspend" | "unsuspend" | "delete") => {
    setBusy(action);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("You must be logged in.");
      setBusy(null);
      return;
    }
    const { error } = await supabase.functions.invoke("manage-user", {
      body: { action, user_id: userId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) {
      toast.error(`${action === "delete" ? "Delete" : action === "suspend" ? "Suspend" : "Unsuspend"} failed: ${error.message}`);
      setBusy(null);
      return;
    }
    toast.success(`${action === "delete" ? "User deleted" : action === "suspend" ? "User suspended" : "User unsuspended"}.`);
    setBusy(null);
    onDone();
  };

  const confirmAndRun = (action: "suspend" | "unsuspend" | "delete") => {
    const msg =
      action === "delete"
        ? `Delete ${displayName}? This removes their account permanently.`
        : action === "suspend"
          ? `Suspend ${displayName}? They will be unable to sign in.`
          : `Unsuspend ${displayName}? They will be able to sign in again.`;
    if (!window.confirm(msg)) return;
    void call(action);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => confirmAndRun("suspend")}>
        Suspend
      </Button>
      <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => confirmAndRun("unsuspend")}>
        Unsuspend
      </Button>
      <Button variant="destructive" size="sm" disabled={busy !== null} onClick={() => confirmAndRun("delete")}>
        Delete
      </Button>
    </div>
  );
}