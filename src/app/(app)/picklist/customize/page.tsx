"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PickList from "@/components/PickList";
import { PickListSettings, savePickListSettings, loadPickListSettings, DEFAULT_PICKLIST_SETTINGS } from "@/lib/picklist";

const schema = z.object({
  titleText: z.string().min(1, "Title is required"),
  showCategory: z.boolean(),
  showPricePerDay: z.boolean(),
  showBrand: z.boolean().optional(),
  showModel: z.boolean().optional(),
  showSize: z.boolean().optional(),
  showSerialNumber: z.boolean().optional(),
  showHomeLocation: z.boolean().optional(),
  layout: z.enum(["standard-table", "detailed-table", "cards"]),
  logoUrl: z.string().optional(),
  noteText: z.string().optional(),
});

export default function CustomizePickListPage() {
  // Use stable, server-safe defaults to avoid hydration mismatch
  const { register, handleSubmit, setValue, watch, reset } = useForm<PickListSettings>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_PICKLIST_SETTINGS,
  });

  // After mount, load saved settings from localStorage and migrate legacy layout
  useEffect(() => {
    const loaded = loadPickListSettings();
    const migrated = {
      ...loaded,
      layout:
        (loaded.layout as any) === "table"
          ? "standard-table"
          : (loaded.layout as any) === "cards"
          ? "cards"
          : loaded.layout,
    };
    reset(migrated);
  }, [reset]);

  const settings = watch();

  // Provide preview dates only after mount to avoid SSR time/locale mismatch
  const [sampleStart, setSampleStart] = useState<string>("");
  const [sampleEnd, setSampleEnd] = useState<string>("");
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(Date.now() + 86400000);
    setSampleStart(now.toISOString());
    setSampleEnd(tomorrow.toISOString());
  }, []);

  const onSubmit = (values: PickListSettings) => {
    savePickListSettings(values);
    toast.success("Pick list settings saved");
  };

  // Sample data for preview (static values are safe for SSR)
  const previewItems = useMemo(
    () => [
      { internal_id: "REG-123", category: "Regulator", price: 25, brand: "Scubapro", model: "MK25", size: "M", serial_number: "SN-00123", home_location: "Bay A" },
      { internal_id: "BCD-055", category: "BCD", price: 20, brand: "AquaLung", model: "Wave", size: "L", serial_number: "SN-00456", home_location: "Bay B" },
      { internal_id: "MASK-777", category: "Mask", price: 5, brand: "Cressi", model: "Panoramic", size: "One Size", serial_number: "SN-00890", home_location: "Bay C" },
    ],
    []
  );

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Customize Pick List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="titleText">Title</Label>
            <Input id="titleText" {...register("titleText")} placeholder="Pick List" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!!settings.showCategory}
                onCheckedChange={(v) => setValue("showCategory", !!v)}
              />
              <span className="text-sm">Show Category</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!!settings.showPricePerDay}
                onCheckedChange={(v) => setValue("showPricePerDay", !!v)}
              />
              <span className="text-sm">Show Price per Day</span>
            </div>
          </div>

          <div>
            <Label>Additional Details</Label>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!settings.showBrand} onCheckedChange={(v) => setValue("showBrand", !!v)} />
                Brand
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!settings.showModel} onCheckedChange={(v) => setValue("showModel", !!v)} />
                Model
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!settings.showSize} onCheckedChange={(v) => setValue("showSize", !!v)} />
                Size
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!settings.showSerialNumber} onCheckedChange={(v) => setValue("showSerialNumber", !!v)} />
                Serial Number
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!settings.showHomeLocation} onCheckedChange={(v) => setValue("showHomeLocation", !!v)} />
                Home Location
              </label>
            </div>
          </div>

          <div>
            <Label>Layout Template</Label>
            <Select
              value={settings.layout}
              onValueChange={(val) => setValue("layout", val as "standard-table" | "detailed-table" | "cards")}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard-table">Standard Table (Full Page)</SelectItem>
                <SelectItem value="detailed-table">Detailed Table (Full Page)</SelectItem>
                <SelectItem value="cards">Cards (Full Page)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              All templates are optimized for Letter/A4 paper sizes when printing.
            </p>
          </div>

          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" {...register("logoUrl")} placeholder="https://example.com/logo.png" />
            <p className="text-xs text-muted-foreground mt-1">
              Provide a hosted image URL to display your logo at the top of the pick list.
            </p>
          </div>

          <div>
            <Label htmlFor="noteText">Footer Note</Label>
            <Textarea id="noteText" {...register("noteText")} placeholder="Additional notes to display at the bottom of the pick list" />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit(onSubmit)}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <PickList
            customerName="John Diver"
            startAt={sampleStart}
            endAt={sampleEnd}
            items={previewItems}
            total={previewItems.reduce((s, i) => s + i.price, 0)}
            settings={settings as PickListSettings}
          />
        </CardContent>
      </Card>
    </div>
  );
}