"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  service_interval_months: number | null;
  usage_service_threshold: number | null;
};
type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  service_interval_months: number | null;
  usage_service_threshold: number | null;
};

const defaultCategorySeeds: string[] = [
  "BCD",
  "Regulator",
  "Fins",
  "Mask",
  "Snorkel",
  "Exposure Protection",
  "Wetsuit",
  "Drysuit",
  "Boots",
  "Gloves",
  "Hood",
  "Dive Computer",
  "Analog Gauges",
  "Compass",
  "Lights",
  "Primary Light",
  "Backup Light",
  "Underwater Camera",
  "Housing",
  "Strobe",
  "Tray/Arms",
  "Weights",
  "Weight System",
  "Tank",
  "Valve",
  "Octopus",
  "Alternate Air Source",
  "Regulator Hoses",
  "SPG (Pressure Gauge)",
  "BCD Inflator Hose",
  "Surface Marker Buoy (SMB)",
  "Reel/Spool",
  "Knife/Cutter",
  "Pointer",
  "Lift Bag",
  "DPV (Scooter)",
  "Rebreather Component",
  "BCD Accessories",
  "Regulator Accessories",
  "Camera Accessories",
  "Miscellaneous"
];

export default function GearTypeManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // New category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatMonths, setNewCatMonths] = useState<number | "">("");
  const [newCatUsage, setNewCatUsage] = useState<number | "">("");

  // New subcategory form
  const [newSubName, setNewSubName] = useState("");
  const [newSubMonths, setNewSubMonths] = useState<number | "">("");
  const [newSubUsage, setNewSubUsage] = useState<number | "">("");

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: cats, error: cErr } = await supabase
      .from("gear_categories")
      .select("id, name, service_interval_months, usage_service_threshold")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    if (cErr) {
      toast.error("Failed to load categories: " + cErr.message);
      return;
    }
    setCategories(cats || []);

    const { data: subs, error: sErr } = await supabase
      .from("gear_subcategories")
      .select("id, category_id, name, service_interval_months, usage_service_threshold")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    if (sErr) {
      toast.error("Failed to load subcategories: " + sErr.message);
      return;
    }
    setSubcategories(subs || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentSubcats = useMemo(
    () => subcategories.filter(s => s.category_id === selectedCategoryId),
    [subcategories, selectedCategoryId]
  );

  const seedDefaults = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (categories.length > 0) {
      toast.info("Categories already exist; seeding skipped.");
      return;
    }
    const rows = defaultCategorySeeds.map(name => ({
      user_id: user.id,
      name,
      service_interval_months: null,
      usage_service_threshold: null,
    }));
    const { error } = await supabase.from("gear_categories").insert(rows);
    if (error) {
      toast.error("Seeding failed: " + error.message);
      throw error;
    }
    toast.success("Default gear categories seeded.");
    await loadData();
  };

  const addCategory = async () => {
    const name = newCatName.trim();
    const months = newCatMonths === "" ? null : Number(newCatMonths);
    const usage = newCatUsage === "" ? null : Number(newCatUsage);
    if (!name) {
      toast.error("Category name is required.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("gear_categories")
      .insert({ user_id: user.id, name, service_interval_months: months, usage_service_threshold: usage });
    if (error) {
      toast.error("Failed to add category: " + error.message);
      throw error;
    }
    setNewCatName("");
    setNewCatMonths("");
    setNewCatUsage("");
    toast.success("Category added.");
    await loadData();
  };

  const updateCategory = async (id: string, months: number | null, usage: number | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("gear_categories")
      .update({ service_interval_months: months, usage_service_threshold: usage, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update category: " + error.message);
      throw error;
    }
    toast.success("Category updated.");
    await loadData();
  };

  const deleteCategory = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("gear_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to delete category: " + error.message);
      throw error;
    }
    if (selectedCategoryId === id) setSelectedCategoryId("");
    toast.success("Category deleted.");
    await loadData();
  };

  const addSubcategory = async () => {
    const name = newSubName.trim();
    const months = newSubMonths === "" ? null : Number(newSubMonths);
    const usage = newSubUsage === "" ? null : Number(newSubUsage);
    if (!selectedCategoryId) {
      toast.error("Select a category first.");
      return;
    }
    if (!name) {
      toast.error("Subcategory name is required.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("gear_subcategories")
      .insert({ user_id: user.id, category_id: selectedCategoryId, name, service_interval_months: months, usage_service_threshold: usage });
    if (error) {
      toast.error("Failed to add subcategory: " + error.message);
      throw error;
    }
    setNewSubName("");
    setNewSubMonths("");
    setNewSubUsage("");
    toast.success("Subcategory added.");
    await loadData();
  };

  const updateSubcategory = async (id: string, months: number | null, usage: number | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("gear_subcategories")
      .update({ service_interval_months: months, usage_service_threshold: usage, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update subcategory: " + error.message);
      throw error;
    }
    toast.success("Subcategory updated.");
    await loadData();
  };

  const deleteSubcategory = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("gear_subcategories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to delete subcategory: " + error.message);
      throw error;
    }
    toast.success("Subcategory deleted.");
    await loadData();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gear Types & Default Service Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={seedDefaults}>Seed common scuba gear categories</Button>
          <span className="text-xs text-muted-foreground">Adds a comprehensive list (BCD, Regulator, Fins, Computers, Lights, Tanks, etc.).</span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium mb-2">Categories</div>
            <div className="grid grid-cols-[2fr,1fr,1fr,auto] gap-2 mb-3">
              <Input placeholder="Category name (e.g., BCD)" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
              <Input type="number" placeholder="Months" value={newCatMonths === "" ? "" : String(newCatMonths)} onChange={(e) => setNewCatMonths(e.target.value === "" ? "" : Number(e.target.value))} />
              <Input type="number" placeholder="Usage (days)" value={newCatUsage === "" ? "" : String(newCatUsage)} onChange={(e) => setNewCatUsage(e.target.value === "" ? "" : Number(e.target.value))} />
              <Button variant="outline" onClick={addCategory}>Add</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Months</TableHead>
                  <TableHead>Usage (days)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(cat => (
                  <TableRow key={cat.id} className="align-top">
                    <TableCell>
                      <button className="font-mono underline" onClick={() => setSelectedCategoryId(cat.id)}>{cat.name}</button>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-24"
                        defaultValue={cat.service_interval_months ?? ""}
                        onBlur={(e) => updateCategory(cat.id, e.target.value === "" ? null : Number(e.target.value), cat.usage_service_threshold)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-28"
                        defaultValue={cat.usage_service_threshold ?? ""}
                        onBlur={(e) => updateCategory(cat.id, cat.service_interval_months, e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => deleteCategory(cat.id)}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No categories configured.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Subcategories</div>
            <div className="grid grid-cols-[1.5fr,1.5fr,1fr,1fr,auto] gap-2 mb-3">
              <Select value={selectedCategoryId} onValueChange={(v) => setSelectedCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Subcategory name (e.g., Jacket Style BCD)" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} />
              <Input type="number" placeholder="Months" value={newSubMonths === "" ? "" : String(newSubMonths)} onChange={(e) => setNewSubMonths(e.target.value === "" ? "" : Number(e.target.value))} />
              <Input type="number" placeholder="Usage (days)" value={newSubUsage === "" ? "" : String(newSubUsage)} onChange={(e) => setNewSubUsage(e.target.value === "" ? "" : Number(e.target.value))} />
              <Button variant="outline" onClick={addSubcategory}>Add</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Months</TableHead>
                  <TableHead>Usage (days)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentSubcats.map(sc => (
                  <TableRow key={sc.id}>
                    <TableCell className="font-mono">{sc.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-24"
                        defaultValue={sc.service_interval_months ?? ""}
                        onBlur={(e) => updateSubcategory(sc.id, e.target.value === "" ? null : Number(e.target.value), sc.usage_service_threshold)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-28"
                        defaultValue={sc.usage_service_threshold ?? ""}
                        onBlur={(e) => updateSubcategory(sc.id, sc.service_interval_months, e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => deleteSubcategory(sc.id)}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {selectedCategoryId && currentSubcats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No subcategories for this category.</TableCell>
                  </TableRow>
                )}
                {!selectedCategoryId && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Select a category to view subcategories.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}