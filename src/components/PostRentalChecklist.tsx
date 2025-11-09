"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Checklist = Record<string, boolean>;

type Props = {
  gearInternalId: string;
  category: string;
  checklist: Checklist;
  onChecklistChange: (newChecklist: Checklist) => void;
};

export default function PostRentalChecklist({
  gearInternalId,
  category,
  checklist,
  onChecklistChange,
}: Props) {
  const handleCheckChange = (key: string, value: boolean) => {
    onChecklistChange({ ...checklist, [key]: value });
  };

  // Define a default set of checks based on category, or a general set
  const defaultChecks = {
    general_ok: "General Condition OK",
    regulator_ok: "Regulator breathes freely",
    regulator_ip_ok: "Regulator IP check OK",
    octopus_ok: "Octopus function OK",
    bcd_ok: "BCD inflates/deflates OK",
    holds_pressure_5min: "BCD holds pressure (5 min)",
    opv_ok: "OPV OK",
    power_inflator_ok: "Power inflator OK",
    computer_ok: "Dive computer powers on",
    computer_battery_ok: "Battery indicator OK",
    computer_screen_ok: "Screen legible",
    computer_buttons_ok: "Buttons work",
    wetsuit_ok: "Wetsuit no major tears",
    wetsuit_zipper_ok: "Wetsuit zipper OK",
  };

  return (
    <div className="border rounded p-3 space-y-2">
      <p className="font-medium text-sm">{gearInternalId} · {category}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {Object.entries(defaultChecks).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!checklist[key]}
              onCheckedChange={(v) => handleCheckChange(key, !!v)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}