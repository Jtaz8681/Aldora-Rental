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
import { DEFAULT_CHECK_KEY, DEFAULT_CHECK_LABEL, ensureDefaultTemplate } from "@/lib/checklists";

type Category = {
  id: string;
  name: string;
  service_interval_months: number | null;
  usage_service_threshold: number | null;
  checklist_template_pre?: Record<string, string> | null;
  checklist_template_post?: Record<string, string> | null;
};

type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  service_interval_months: number | null;
  usage_service_threshold: number | null;
};

export default function GearTypeManagerFixed(): React.ReactElement {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // New category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatMonths, setNewCatMonths] = useState<number | "">("");
  const [newCatUsage, setNewCatUsage] = useState<number | "">("");

  // New subcategory form
  const [newSubName, setNewSubName] = useState("");

  // Checklist template editors (for selected category)
  const [preTemplate, setPreTemplate] = useState<Record<string, string>>({});
  const [postTemplate, setPostTemplate] = useState<Record<string, string>>({});
  const [newPreKey, setNewPreKey] = useState("");
  const [newPreLabel, setNewPreLabel] = useState("");
  const [newPostKey, setNewPostKey] = useState("");
  const [newPostLabel, setNewPostLabel] = useState("");

  // Category pricing map: category name -> price
  const [catPrices, setCatPrices] = useState<Record<string, number>>({});

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

    const { data: prices, error: pErr } = await supabase
      .from("category_pricing")
      .select("category, price")
      .eq("user_id", user.id);
    if (pErr) {
      toast.error("Failed to load category prices: " + pErr.message);
    } else {
      const map: Record<string, number> = {};
      (prices || []).forEach((row: any) => {
        map[row.category] = Number(row.price || 0);
      });
      setCatPrices(map);
    }

    const sel = (cats || []).find((c) => c.id === selectedCategoryId);
    setPreTemplate(ensureDefaultTemplate((sel?.checklist_template_pre as any) || {}));
    setPostTemplate(ensureDefaultTemplate((sel?.checklist_template_post as any) || {}));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sel = categories.find((c) => c.id === selectedCategoryId);
    setPreTemplate(ensureDefaultTemplate((sel?.checklist_template_pre as any) || {}));
    setPostTemplate(ensureDefaultTemplate((sel?.checklist_template_post as any) || {}));
  }, [selectedCategoryId, categories]);

  const currentSubcats = useMemo(
    () => subcategories.filter((s) => s.category_id === selectedCategoryId),
    [subcategories, selectedCategoryId]
  );

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
      .update({
        service_interval_months: months,
        usage_service_threshold: usage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update category: " + error.message);
      throw error;
    }
    toast.success("Category updated.");
    await loadData();
  };

  const deleteCategory = async (id: string, name?: string) => {
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
    if (name && catPrices[name] != null) {
      setCatPrices(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      await supabase
        .from("category_pricing")
        .delete()
        .eq("user_id", user.id)
        .eq("category", name);
    }
    toast.success("Category deleted.");
    await loadData();
  };

  const addSubcategory = async () => {
    const name = newSubName.trim();
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
      .insert({ user_id: user.id, category_id: selectedCategoryId, name });
    if (error) {
      toast.error("Failed to add subcategory: " + error.message);
      throw error;
    }
    setNewSubName("");
    toast.success("Subcategory added.");
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
        checklist_template_pre: ensureDefaultTemplate(preTemplate),
        checklist_template_post: ensureDefaultTemplate(postTemplate),
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
    setPreTemplate((prev) => ({ ...prev, [key]: label }));
    setNewPreKey("");
    setNewPreLabel("");
  };

  const removePreCheck = (key: string) => {
    if (key === DEFAULT_CHECK_KEY) return;
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
    setPostTemplate((prev) => ({ ...prev, [key]: label }));
    setNewPostKey("");
    setNewPostLabel("");
  };

  const removePostCheck = (key: string) => {
    if (key === DEFAULT_CHECK_KEY) return;
    const next = { ...postTemplate };
    delete next[key];
    setPostTemplate(next);
  };

  const updateCategoryPrice = async (categoryName: string, priceVal: number | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from("category_pricing")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", categoryName)
      .maybeSingle();

    if (priceVal == null) {
      if (existing?.id) {
        const { error } = await supabase
          .from("category_pricing")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", user.id);
        if (error) {
          toast.error("Failed to clear price: " + error.message);
          throw error;
        }
      }
      setCatPrices((prev) => {
        const next = { ...prev };
        delete next[categoryName];
        return next;
      });
      toast.success("Price cleared.");
      return;
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("category_pricing")
        .update({ price: priceVal, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("user_id", user.id);
      if (error) {
        toast.error("Failed to update price: " + error.message);
        throw error;
      }
    } else {
      const { error } = await supabase
        .from("category_pricing")
        .insert({ user_id: user.id, category: categoryName, price: priceVal });
      if (error) {
        toast.error("Failed to add price: " + error.message);
        throw error;
      }
    }

    setCatPrices((prev) => ({ ...prev, [categoryName]: Number(priceVal) }));
    toast.success("Category price saved.");
  };

  return (
    <div>
      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="text-sm font-medium mb-2">Add Category</div>
            <div className="grid grid-cols-[2fr,1fr,1fr,auto] gap-2 mb-3">
              <Input
                placeholder="Category name (e.g., BCD)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Months"
                value={newCatMonths === "" ? "" : String(newCatMonths)}
                onChange={(e) => setNewCatMonths(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Usage (days)"
                value={newCatUsage === "" ? "" : String(newCatUsage)}
                onChange={(e) => setNewCatUsage(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <Button variant="outline" onClick={addCategory}>
                Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Months</TableHead>
                  <TableHead>Usage (days)</TableHead>
                  <TableHead>Default Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id} className="align-top">
                    <TableCell>
                      <button className="font-mono underline" onClick={() => setSelectedCategoryId(cat.id)}>
                        {cat.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-24"
                        defaultValue={cat.service_interval_months ?? ""}
                        onBlur={(e) =>
                          updateCategory(
                            cat.id,
                            e.target.value === "" ? null : Number(e.target.value),
                            cat.usage_service_threshold
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-28"
                        defaultValue={cat.usage_service_threshold ?? ""}
                        onBlur={(e) =>
                          updateCategory(
                            cat.id,
                            cat.service_interval_months,
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-28"
                        defaultValue={catPrices[cat.name] ?? ""}
                        onBlur={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          updateCategoryPrice(cat.name, val);
                        }}
                        placeholder="$0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => deleteCategory(cat.id, cat.name)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No categories configured. Add your first category above.
                    </TableCell>
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
            <div className="grid grid-cols-[1.5fr,2fr,auto] gap-2 mb-3">
              <Select value={selectedCategoryId} onValueChange={(v) => setSelectedCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Subcategory name (e.g., Jacket Style BCD)"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
              />
              <Button variant="outline" onClick={addSubcategory} disabled={!selectedCategoryId}>
                Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentSubcats.map((sc) => (
                  <TableRow key={sc.id}>
                    <TableCell className="font-mono">{sc.name}</TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => deleteSubcategory(sc.id)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {selectedCategoryId && currentSubcats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                      No subcategories for this category yet.
                    </TableCell>
                  </TableRow>
                )}
                {!selectedCategoryId && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                      Select a category to view or add subcategories.
                    </TableCell>
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
          <div className="flex items-center justify-between">
            <Label className="text-sm">Category</Label>
            <div className="w-60">
              <Select value={selectedCategoryId} onValueChange={(v) => setSelectedCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-[1.5fr,2fr,auto] gap-2">
            <Input placeholder="key (e.g., bcd_inflate_ok)" value={newPreKey} onChange={(e) => setNewPreKey(e.target.value)} />
            <Input
              placeholder="Label (e.g., Inflates/deflates smoothly)"
              value={newPreLabel}
              onChange={(e) => setNewPreLabel(e.target.value)}
            />
            <Button variant="outline" onClick={addPreCheck} disabled={!selectedCategoryId}>
              Add
            </Button>
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
                  <TableCell>
                    {key !== DEFAULT_CHECK_KEY && (
                      <Button variant="destructive" size="sm" onClick={() => removePreCheck(key)}>
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {Object.keys(preTemplate).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    No pre-checks configured.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-end">
            <Button onClick={saveTemplates} disabled={!selectedCategoryId}>Save Templates</Button>
          </div>
        </CardContent>
      </Card>

      {/* Post-Check-In Checklist (Default for Category) */}
      <Card>
        <CardHeader>
          <CardTitle>Post-Check-In Checklist (Default for Category)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Category</Label>
            <div className="w-60">
              <Select value={selectedCategoryId} onValueChange={(v) => setSelectedCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-[1.5fr,2fr,auto] gap-2">
            <Input placeholder="key (e.g., regs_rinsed)" value={newPostKey} onChange={(e) => setNewPostKey(e.target.value)} />
            <Input placeholder="Label (e.g., Rinsed & cleaned)" value={newPostLabel} onChange={(e) => setNewPostLabel(e.target.value)} />
            <Button variant="outline" onClick={addPostCheck} disabled={!selectedCategoryId}>
              Add
            </Button>
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
                  <TableCell>
                    {key !== DEFAULT_CHECK_KEY && (
                      <Button variant="destructive" size="sm" onClick={() => removePostCheck(key)}>
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {Object.keys(postTemplate).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    No post-checks configured.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-end">
            <Button onClick={saveTemplates} disabled={!selectedCategoryId}>Save Templates</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}