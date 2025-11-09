"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import Link from "next/link";

type Gear = { id: string; internal_id: string; category: string };
type Projection = { gear: Gear; nextDue: Date; daysAway: number };

type Props = {
  projections: Projection[];
};

export default function ServiceScheduleCalendar({ projections }: Props) {
  const [rangeDays, setRangeDays] = React.useState<number>(30);
  const [selected, setSelected] = React.useState<Date | undefined>(() => {
    const nearest = [...projections].sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime())[0];
    return nearest ? nearest.nextDue : undefined;
  });

  const withinRange = projections.filter((p) => p.daysAway >= 0 && p.daysAway <= rangeDays);
  const selectedDayKey = selected ? format(selected, "yyyy-MM-dd") : null;

  const itemsForSelectedDay = withinRange.filter((p) => format(p.nextDue, "yyyy-MM-dd") === selectedDayKey);

  const groupedByDate: Record<string, Projection[]> = {};
  for (const p of withinRange) {
    const key = format(p.nextDue, "yyyy-MM-dd");
    groupedByDate[key] = [...(groupedByDate[key] || []), p];
  }
  const uniqueDates = Object.keys(groupedByDate).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Schedule Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show next</span>
              <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Calendar
              mode="single"
              selected={selected}
              onSelect={setSelected}
              className="rounded-md border"
            />
          </div>

          <div className="space-y-3">
            <div className="text-sm">
              {selected ? (
                <span className="text-muted-foreground">Due on {format(selected, "PPP")}</span>
              ) : (
                <span className="text-muted-foreground">Select a date to view items due</span>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gear</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Days Away</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(itemsForSelectedDay || []).map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">
                      <Link href={`/gear/${p.gear.id}`} className="underline">
                        {p.gear.internal_id}
                      </Link>
                    </TableCell>
                    <TableCell>{p.gear.category}</TableCell>
                    <TableCell>{p.daysAway}</TableCell>
                  </TableRow>
                ))}
                {(itemsForSelectedDay || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      {selected ? "No items due on this date." : "Pick a date to see items due."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div>
              <div className="text-sm font-medium mb-2">Upcoming due dates</div>
              <div className="space-y-2">
                {uniqueDates.map((d) => (
                  <div key={d} className="border rounded p-2">
                    <div className="text-xs text-muted-foreground mb-1">{format(new Date(d), "PPP")}</div>
                    <div className="grid sm:grid-cols-2 gap-1">
                      {groupedByDate[d].map((p, i) => (
                        <div key={i} className="text-sm">
                          <Link href={`/gear/${p.gear.id}`} className="font-mono underline">{p.gear.internal_id}</Link> <span className="text-muted-foreground">({p.gear.category})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {uniqueDates.length === 0 && (
                  <div className="text-sm text-muted-foreground">No services due in the selected range.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}