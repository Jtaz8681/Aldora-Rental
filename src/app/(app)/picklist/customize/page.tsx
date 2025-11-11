"use client";

import React, { useMemo } from "react";
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
import { PickListSettings, savePickListSettings, loadPickListSettings } from "@/lib/picklist";

const schema = z.object({
  titleText: z.string().min(1, "Title is required"),
  showCategory: z.boolean(),
  showPricePerDay: z.boolean(),
  layout: z.enum(["table", "cards"]),
  logoUrl: z.string().optional(),
  noteText: z.string().optional(),
});

export default function CustomizePickListPage() {
  const defaults = loadPickListSettings();

  const { register, handleSubmit, setValue, watch } = useForm<PickListSettings>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const settings = watch();

  const onSubmit = (values: PickListSettings) => {
    savePickListSettings(values);
    toast.success("Pick list settings saved");
  };

  // Sample data for preview
  const previewItems = useMemo(
    () => [
      { internal_id: "REG-123", category: "Regulator", price: 25 },
      { internal_id: "BCD-055", category: "BCD", price: 20 },
      { internal_id: "MASK-777", category: "Mask", price: 5 },
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
            <Label>Layout</Label>
            <Select
              value={settings.layout}
              onValueChange={(val) => setValue("layout", val as "table" | "cards")}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="cards">Cards</SelectItem>
              </SelectContent>
            </Select>
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
            startAt={new Date().toISOString()}
            endAt={new Date(Date.now() + 86400000).toISOString()}
            items={previewItems}
            total={previewItems.reduce((s, i) => s + i.price, 0)}
            settings={settings as PickListSettings}
          />
        </CardContent>
      </Card>
    </div>
  );
}