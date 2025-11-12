"use client";

import React from "react";
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
  const { theme, mode, font, setTheme, setMode, setFont } = useTheme();

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

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              toast.success("Appearance updated.");
            }}
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}