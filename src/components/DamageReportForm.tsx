"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DamageEntry = { 
  hasDamage: boolean; 
  type?: string; 
  severity?: string; 
  photosCsv?: string; 
  notes?: string; 
  estimate?: number 
};

type Props = {
  damage: DamageEntry;
  onDamageChange: (newDamage: DamageEntry) => void;
};

export default function DamageReportForm({ damage, onDamageChange }: Props) {
  const handleFieldChange = (field: keyof DamageEntry, value: any) => {
    onDamageChange({ ...damage, [field]: value });
  };

  return (
    <div className="border-t pt-2">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox 
          checked={damage.hasDamage} 
          onCheckedChange={(v) => handleFieldChange("hasDamage", !!v)} 
        />
        Damage Found
      </label>
      {damage.hasDamage && (
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          <div>
            <Label>Type</Label>
            <Input 
              value={damage.type || ""} 
              onChange={(e) => handleFieldChange("type", e.target.value)} 
              placeholder="e.g., Scratch, Leak, Broken"
            />
          </div>
          <div>
            <Label>Severity</Label>
            <select 
              className="border rounded px-2 py-2 w-full" 
              value={damage.severity || "Functional"} 
              onChange={(e) => handleFieldChange("severity", e.target.value)}
            >
              <option>Cosmetic</option>
              <option>Functional</option>
              <option>Critical</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Photo URLs (comma-separated)</Label>
            <Input 
              value={damage.photosCsv || ""} 
              onChange={(e) => handleFieldChange("photosCsv", e.target.value)} 
              placeholder="https://..." 
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Input 
              value={damage.notes || ""} 
              onChange={(e) => handleFieldChange("notes", e.target.value)} 
              placeholder="Detailed description of damage"
            />
          </div>
          <div>
            <Label>Estimated Repair Cost</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={damage.estimate ?? ""} 
              onChange={(e) => handleFieldChange("estimate", Number(e.target.value))} 
            />
          </div>
        </div>
      )}
    </div>
  );
}