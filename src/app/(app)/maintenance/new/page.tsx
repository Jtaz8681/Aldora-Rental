"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import MaintenanceTicketForm from "@/components/MaintenanceTicketForm";
import RoleGuard from "@/components/RoleGuard";

export default function MaintenanceNewPage() {
  return (
    <RoleGuard allow={["owner", "manager", "technician", "staff"]} title="Maintenance">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold">Create Maintenance Ticket</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>New Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <MaintenanceTicketForm />
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}