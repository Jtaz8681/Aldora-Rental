"use client";

import React from "react";
import RoleGuard from "@/components/RoleGuard";
import GearTypeManager from "@/components/GearTypeManager";
import GearTypeManagerFixed from "@/components/GearTypeManagerFixed";

export default function SettingsPage() {
  return (
    <RoleGuard allow={["owner", "manager", "dev"]} title="Settings">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>

        <div className="mx-auto max-w-screen-md space-y-6">
          <GearTypeManagerFixed />
        </div>
      </div>
    </RoleGuard>
  );
}