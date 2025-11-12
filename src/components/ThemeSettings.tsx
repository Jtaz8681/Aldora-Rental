"use client";

import React, { useState, useEffect } from "react";
import useTheme from "@/hooks/use-theme";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const THEME_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "shallow", label: "Shallow Ocean" },
  { value: "deep", label: "Deep Ocean" },
  { value: "sunrise", label: "Sun Rise" },
  { value: "sunset", label: "Sun Set" },
  { value: "aldora", label: "Aldora" },
  { value: "custom", label: "Custom" },
] as const;

const FONT_OPTIONS = [
  "Montserrat Regular",
  "Geist Sans",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Trebuchet MS",
  "Verdana",
];

export default function ThemeSettings(): React.ReactElement {
  const { theme, mode, font, customColors, setTheme, setMode, setFont, setCustomColors } = useTheme();
  const [bg, setBg] = useState(customColors.background);
  const [primary, setPrimary] = useState(customColors.primary);
  const [accent, setAccent] = useState(customColors.accent);
  const [destructive, setDestructive] = useState(customColors.destructive);

  useEffect(() => {
    setBg(customColors.background);
    setPrimary(customColors.primary);
    setAccent(customColors.accent);
    setDestructive(customColors.destructive);
  }, [customColors]);

  const saveCustom = () => {
    setCustomColors({
      background: bg,
      primary,
      accent,
      destructive,
    });
    toast.success("Custom theme saved.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-[1fr,2fr] items-center">
          <Label>Theme</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose theme" />
            </SelectTrigger>
            <SelectContent>
              {THEME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr,2fr] items-center">
          <Label>Mode</Label>
          <div className="flex items-center gap-3">
            <Switch checked={mode === "dark"} onCheckedChange={(checked) => setMode(checked ? "dark" : "light")} />
            <span className="text-sm text-muted-foreground">{mode === "dark" ? "Dark" : "Light"}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr,2fr] items-center">
          <Label>Font</Label>
          <Select value={font} onValueChange={(v) => setFont(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {theme === "custom" && (
          <div className="space-y-4">
            <div className="text-sm font-medium">Custom Theme</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 border rounded p-3">
                <Label className="text-sm">Background</Label>
                <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-9 w-14 cursor-pointer rounded" />
              </div>
              <div className="flex items-center justify-between gap-3 border rounded p-3">
                <Label className="text-sm">Primary Button</Label>
                <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-14 cursor-pointer rounded" />
              </div>
              <div className="flex items-center justify-between gap-3 border rounded p-3">
                <Label className="text-sm">Accent</Label>
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-14 cursor-pointer rounded" />
              </div>
              <div className="flex items-center justify-between gap-3 border rounded p-3">
                <Label className="text-sm">Destructive</Label>
                <input type="color" value={destructive} onChange={(e) => setDestructive(e.target.value)} className="h-9 w-14 cursor-pointer rounded" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={saveCustom}>Save Custom Theme</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}