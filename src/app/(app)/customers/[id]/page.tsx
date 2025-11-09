"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client"; // Changed from default to named import
import { useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [customer, setCustomer] = useState<any>(null);
  const [rentals, setRentals] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;
      const { data: cust } = await supabase.from("customers").select("*").eq("user_id", user.id).eq("id", id).single();
      setCustomer(cust);
      const { data: r } = await supabase.from("rentals").select("*").eq("user_id", user.id).eq("customer_id", id).order("start_at", { ascending: false });
      setRentals(r || []);
    };
    load();
  }, [id]);

  if (!customer) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{customer.name}</h1>
      <p className="text-sm text-muted-foreground">Balance: ${Number(customer.balance_due || 0).toFixed(2)}</p>

      <div>
        <h2 className="text-lg font-semibold mb-2">Rentals</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Start</TableHead>
              <TableHead>Expected End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rentals.map(r => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.start_at).toLocaleString()}</TableCell>
                <TableCell>{new Date(r.expected_end_at).toLocaleString()}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>${Number(r.total_cost || 0).toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {rentals.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No rental history.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}