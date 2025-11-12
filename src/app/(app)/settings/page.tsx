"use client";

import React from "react";
import RoleGuard from "@/components/RoleGuard";
import GearTypeManagerFixed from "@/components/GearTypeManagerFixed";
import ThemeSettings from "@/components/ThemeSettings";

export default function SettingsPage() {
  return (
    <RoleGuard allow={["owner", "manager", "dev"]} title="Settings">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>

        <div className="mx-auto max-w-screen-md space-y-6">
          <ThemeSettings />
          <GearTypeManagerFixed />
        </div>
      </div>
    </RoleGuard>
  );
}