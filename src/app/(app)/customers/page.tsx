"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  balance_due: number;
  rentals: { count: number }[];
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, email, balance_due, rentals(count)") // Fetch phone, email, and rental count
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCustomers(data || []);
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customers</h1>
        <Link href="/customers/new"><Button>Add Customer</Button></Link>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Number of Rentals</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.phone || "-"}</TableCell>
                <TableCell>{c.email || "-"}</TableCell>
                <TableCell>{c.rentals[0]?.count || 0}</TableCell>
                <TableCell>${Number(c.balance_due || 0).toFixed(2)}</TableCell>
                <TableCell className="space-x-2">
                  <Link href={`/customers/${c.id}`} className="text-sm underline">View</Link>
                  <Link href={`/customers/${c.id}/edit`} className="text-sm underline">Edit</Link>
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No customers found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}