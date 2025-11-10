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
  "Dive Computer",
  "Lights",
  "Tank",
  "Weights"
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

  // NEW: checklist template editors
  const [preTemplate, setPreTemplate] = useState<Record<string, string>>({});
  const [postTemplate, setPostTemplate] = useState<Record<string, string>>({});
  const [newPreKey, setNewPreKey] = useState("");
  const [newPreLabel, setNewPreLabel] = useState("");
  const [newPostKey, setNewPostKey] = useState("");
  const [newPostLabel, setNewPostLabel] = useState("");

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: cats, error: cErr } = await supabase
      .from("gear_categories")
      .select("id, name, service_interval_months, usage_service_threshold, checklist_template_pre, checklist_template_post")
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

    // Populate template editors when a category is selected
    const sel = (cats || []).find(c => c.id === selectedCategoryId);
    setPreTemplate((sel?.checklist_template_pre as any) || {});
    setPostTemplate((sel?.checklist_template_post as any) || {});
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const sel = categories.find(c => c.id === selectedCategoryId);
    setPreTemplate((sel?.checklist_template_pre as any) || {});
    setPostTemplate((sel?.checklist_template_post as any) || {});
  }, [selectedCategoryId, categories]);

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

    // Insert base categories
    const baseRows = defaultCategorySeeds.map(name => ({
      user_id: user.id,
      name,
      service_interval_months: null,
      usage_service_threshold: null,
      checklist_template_pre: {},
      checklist_template_post: {},
    }));
    const { data: insertedCats, error: catsErr } = await supabase.from("gear_categories").insert(baseRows).select("id, name");
    if (catsErr) {
      toast.error("Seeding categories failed: " + catsErr.message);
      throw catsErr;
    }

    // Helper to find inserted IDs
    const getCatId = (nm: string) => insertedCats?.find(c => c.name === nm)?.id;

    // Define example subcategories
    const subRows: any[] = [
      // BCD subcategories
      { user_id: user.id, category_id: getCatId("BCD"), name: "Jacket Style BCD" },
      { user_id: user.id, category_id: getCatId("BCD"), name: "Back-Inflation BCD" },
      { user_id: user.id, category_id: getCatId("BCD"), name: "Wing (with Backplate & Harness)" },
      // Regulator subcategories
      { user_id: user.id, category_id: getCatId("Regulator"), name: "First Stage" },
      { user_id: user.id, category_id: getCatId("Regulator"), name: "Primary Second Stage" },
      { user_id: user.id, category_id: getCatId("Regulator"), name: "Alternate Air Source (Octopus)" },
      { user_id: user.id, category_id: getCatId("Regulator"), name: "Low-Pressure Inflator Hose" },
      { user_id: user.id, category_id: getCatId("Regulator"), name: "Submersible Pressure Gauge (SPG)" },
    ].filter(r => r.category_id);

    if (subRows.length) {
      const { error: subsErr } = await supabase.from("gear_subcategories").insert(subRows);
      if (subsErr) {
        toast.error("Seeding subcategories failed: " + subsErr.message);
        throw subsErr;
      }
    }

    // Set sensible default checklist templates for BCD and Regulator
    const bcdId = getCatId("BCD");
    const regId = getCatId("Regulator");
    if (bcdId) {
      await supabase.from("gear_categories")
        .update({
          checklist_template_pre: {
            bcd_inflate_ok: "Inflates/deflates smoothly",
            holds_pressure_5min: "Holds pressure (5 min)",
            opv_ok: "OPV releases properly",
            power_inflator_ok: "Power inflator works",
          },
          checklist_template_post: {
            bcd_rinsed: "Rinsed & cleaned",
            holds_pressure_5min: "Holds pressure (5 min)",
            hose_inspected: "Hoses inspected",
            visual_ok: "Visual check OK",
          }
        })
        .eq("id", bcdId)
        .eq("user_id", user.id);
    }
    if (regId) {
      await supabase.from("gear_categories")
        .update({
          checklist_template_pre: {
            regulator_breathes_ok: "Breathes freely",
            ip_check_ok: "Intermediate pressure OK",
            octopus_ok: "Octopus function OK",
            spg_ok: "SPG reads correctly",
            lp_inflator_hose_ok: "LP inflator hose OK",
          },
          checklist_template_post: {
            regs_rinsed: "Rinsed & cleaned",
            mouthpiece_ok: "Mouthpiece good",
            spg_ok: "SPG reads correctly",
          }
        })
        .eq("id", regId)
        .eq("user_id", user.id);
    }

    toast.success("Seeded gear categories, subcategories, and default checklist templates.");
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

  const saveTemplates = async () => {
    if (!selectedCategoryId) {
      toast.error("Select a category to edit templates.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("gear_categories")
      .update({
        checklist_template_pre: preTemplate,
        checklist_template_post: postTemplate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedCategoryId)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to save templates: " + error.message);
      throw error;
    }
    toast.success("Templates saved.");
    await loadData();
  };

  const addPreCheck = () => {
    const key = newPreKey.trim();
    const label = newPreLabel.trim();
    if (!key || !label) {
      toast.error("Provide both key and label for pre-check.");
      return;
    }
    setPreTemplate(prev => ({ ...prev, [key]: label }));
    setNewPreKey("");
    setNewPreLabel("");
  };
  const removePreCheck = (key: string) => {
    const next = { ...preTemplate };
    delete next[key];
    setPreTemplate(next);
  };
  const addPostCheck = () => {
    const key = newPostKey.trim();
    const label = newPostLabel.trim();
    if (!key || !label) {
      toast.error("Provide both key and label for post-check.");
      return;
    }
    setPostTemplate(prev => ({ ...prev, [key]: label }));
    setNewPostKey("");
    setNewPostLabel("");
  };
  const removePostCheck = (key: string) => {
    const next = { ...postTemplate };
    delete next[key];
    setPostTemplate(next);
  };

  return (
    <>
      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="text-sm font-medium mb-2">Add Category</div>
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
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No categories configured. Add your first category above.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Subcategories */}
      <Card>
        <CardHeader>
          <CardTitle>Subcategories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="text-sm font-medium mb-2">Add Subcategory</div>
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
              <Button variant="outline" onClick={addSubcategory} disabled={!selectedCategoryId}>Add</Button>
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
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No subcategories for this category yet.</TableCell>
                  </TableRow>
                )}
                {!selectedCategoryId && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Select a category to view or add subcategories.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pre-Checkout Checklist (Default for Category) */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Checkout Checklist (Default for Category)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[1.5fr,2fr,auto] gap-2">
            <Input placeholder="key (e.g., bcd_inflate_ok)" value={newPreKey} onChange={(e) => setNewPreKey(e.target.value)} />
            <Input placeholder="Label (e.g., Inflates/deflates smoothly)" value={newPreLabel} onChange={(e) => setNewPreLabel(e.target.value)} />
            <Button variant="outline" onClick={addPreCheck}>Add</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(preTemplate).map(([key, label]) => (
                <TableRow key={key}>
                  <TableCell className="font-mono">{key}</TableCell>
                  <TableCell>{label}</TableCell>
                  <TableCell><Button variant="destructive" size="sm" onClick={() => removePreCheck(key)}>Remove</Button></TableCell>
                </TableRow>
              ))}
              {Object.keys(preTemplate).length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">No pre-checks configured.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-end">
            <Button onClick={saveTemplates}>Save Templates</Button>
          </div>
        </CardContent>
      </Card>

      {/* Post-Check-In Checklist (Default for Category) */}
      <Card>
        <CardHeader>
          <CardTitle>Post-Check-In Checklist (Default for Category)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[1.5fr,2fr,auto] gap-2">
            <Input placeholder="key (e.g., regs_rinsed)" value={newPostKey} onChange={(e) => setNewPostKey(e.target.value)} />
            <Input placeholder="Label (e.g., Rinsed & cleaned)" value={newPostLabel} onChange={(e) => setNewPostLabel(e.target.value)} />
            <Button variant="outline" onClick={addPostCheck}>Add</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(postTemplate).map(([key, label]) => (
                <TableRow key={key}>
                  <TableCell className="font-mono">{key}</TableCell>
                  <TableCell>{label}</TableCell>
                  <TableCell><Button variant="destructive" size="sm" onClick={() => removePostCheck(key)}>Remove</Button></TableCell>
                </TableRow>
              ))}
              {Object.keys(postTemplate).length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">No post-checks configured.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-end">
            <Button onClick={saveTemplates}>Save Templates</Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}