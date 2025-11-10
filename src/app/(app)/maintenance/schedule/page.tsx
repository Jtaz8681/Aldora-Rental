"use client";

import React, { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ServiceScheduleCalendar from "@/components/ServiceScheduleCalendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Projection = {
  gear: { id: string; internal_id: string; category: string };
  nextDue: Date;
  daysAway: number;
};

export default function MaintenanceSchedulePage() {
  const [projections, setProjections] = useState<Projection[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from("service_settings")
        .select("regulator_service_interval_months, bcd_service_interval_months")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const regulatorMonths = Number(settings?.regulator_service_interval_months ?? 12);
      const bcdMonths = Number(settings?.bcd_service_interval_months ?? 12);

      const { data: gearData, error: gErr } = await supabase
        .from("gear_items")
        .select("id, internal_id, category, date_added, purchase_date, service_interval_months")
        .eq("user_id", user.id);

      if (gErr) {
        toast.error("Failed to load gear: " + gErr.message);
        return;
      }

      const { data: tData } = await supabase
        .from("maintenance_tickets")
        .select("id, gear_id, status, updated_at")
        .eq("user_id", user.id);

      const projectionsCalc: Projection[] = [];
      for (const g of gearData || []) {
        const months = Number((g as any).service_interval_months ?? 0);
        if (months <= 0) continue;

        const lastCompleted = (tData || [])
          .filter(t => t.gear_id === g.id && t.status === "completed" && t.updated_at)
          .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0];

        const anchorStr = (lastCompleted?.updated_at as string | undefined) || (g.purchase_date as string | null) || (g.date_added as string | null) || null;
        if (!anchorStr) continue;

        const nextDue = new Date(anchorStr);
        nextDue.setMonth(nextDue.getMonth() + months);
        const daysAway = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        projectionsCalc.push({
          gear: {
            id: g.id,
            internal_id: (g.internal_id as string | null) ?? g.id.slice(0, 8),
            category: g.category as string,
          },
          nextDue,
          daysAway,
        });
      }

      projectionsCalc.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
      setProjections(projectionsCalc);
    })();
  }, []);

  const filteredProjections = useMemo(
    () => projections.filter(p => categoryFilter === "all" ? true : p.gear.category.toLowerCase().includes(categoryFilter)),
    [projections, categoryFilter]
  );

  return (
    <RoleGuard allow={["owner", "manager", "technician", "staff"]} title="Maintenance">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold">Service Schedule</h1>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm flex items-center gap-2">
              <span>Filter:</span>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="reg">Regulators</option>
                <option value="bcd">BCDs</option>
              </select>
            </label>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceScheduleCalendar projections={filteredProjections} />
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}