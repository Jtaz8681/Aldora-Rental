"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Row = {
  id: string;
  category: string;
  price: number;
};

export default function CategoryPricingForm() {
  const [rows, setRows] = useState<Row[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newPrice, setNewPrice] = useState<number>(0);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("category_pricing")
      .select("id, category, price")
      .eq("user_id", user.id)
      .order("category");
    if (error) {
      toast.error("Failed to load category pricing: " + error.message);
      return;
    }
    setRows((data || []).map(d => ({ id: d.id, category: d.category, price: Number(d.price) })));
  };

  useEffect(() => {
    load();
  }, []);

  const addRow = async () => {
    const category = newCategory.trim();
    const price = Number(newPrice || 0);
    if (!category) {
      toast.error("Category is required.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("category_pricing")
      .insert({ user_id: user.id, category, price });
    if (error) {
      toast.error("Failed to add category: " + error.message);
      throw error;
    }
    toast.success("Category price added.");
    setNewCategory("");
    setNewPrice(0);
    await load();
  };

  const updatePrice = async (id: string, price: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("category_pricing")
      .update({ price, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update price: " + error.message);
      throw error;
    }
    toast.success("Price updated.");
    await load();
  };

  const deleteRow = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("category_pricing")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to delete category: " + error.message);
      throw error;
    }
    toast.success("Category removed.");
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[2fr,1fr,auto] gap-2 mb-3">
          <div>
            <Label className="text-xs">Category</Label>
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="BCD, Regulator, Wetsuit..." />
          </div>
          <div>
            <Label className="text-xs">Default Price</Label>
            <Input type="number" step="0.01" value={newPrice.toString()} onChange={(e) => setNewPrice(Number(e.target.value || 0))} />
          </div>
          <div className="flex items-end">
            <Button onClick={addRow} variant="outline">Add</Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Default Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.category}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-32"
                    value={r.price.toString()}
                    onChange={(e) => updatePrice(r.id, Number(e.target.value || 0))}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="destructive" size="sm" onClick={() => deleteRow(r.id)}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">No categories configured.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}