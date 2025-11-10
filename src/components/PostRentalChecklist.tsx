"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ensureDefaultTemplate } from "@/lib/checklists";

type Checklist = Record<string, boolean>;

type Props = {
  gearInternalId: string;
  category: string;
  checklist: Checklist;
  onChecklistChange: (newChecklist: Checklist) => void;
  template?: Record<string, string>; // key -> label
};

export default function PostRentalChecklist({
  gearInternalId,
  category,
  checklist,
  onChecklistChange,
  template = {},
}: Props) {
  const handleCheckChange = (key: string, value: boolean) => {
    onChecklistChange({ ...checklist, [key]: value });
  };

  const entries = Object.entries(ensureDefaultTemplate(template));

  return (
    <div className="border rounded p-3 space-y-2">
      <p className="font-medium text-sm">{gearInternalId} · {category}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {entries.length > 0 ? (
          entries.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!checklist[key]}
                onCheckedChange={(v) => handleCheckChange(key, !!v)}
              />
              {label}
            </label>
          ))
        ) : (
          <Label className="text-xs text-muted-foreground">No checklist configured for this category.</Label>
        )}
      </div>
    </div>
  );
}