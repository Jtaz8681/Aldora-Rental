"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client"; // Changed from default to named import
import { useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import RecordPaymentDialog from "@/components/RecordPaymentDialog";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [customer, setCustomer] = useState<any>(null);
  const [rentals, setRentals] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;
      const { data: cust } = await supabase.from("customers").select("*").eq("user_id", user.id).eq("id", id).single();
      setCustomer(cust);
      const { data: r } = await supabase.from("rentals").select("*").eq("user_id", user.id).eq("customer_id", id).order("start_at", { ascending: false });
      setRentals(r || []);
      const { data: pays } = await supabase.from("payments").select("*").eq("user_id", user.id).eq("customer_id", id).order("created_at", { ascending: false }).limit(10);
      setPayments(pays || []);
    };
    load();
  }, [id]);

  if (!customer) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">Balance: {formatCurrency(customer.balance_due)}</p>
        </div>
        <Button onClick={() => setShowPaymentDialog(true)}>Record Payment</Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Rentals</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Start</TableHead>
              <TableHead>Expected End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rentals.map(r => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.start_at).toLocaleString()}</TableCell>
                <TableCell>{new Date(r.expected_end_at).toLocaleString()}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{formatCurrency(r.total_cost || 0)}</TableCell>
                <TableCell>
                  <Link className="underline text-sm" href={`/rentals/${r.id}`}>View</Link>
                </TableCell>
              </TableRow>
            ))}
            {rentals.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No rental history.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Recent Payments</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map(p => (
              <TableRow key={p.id}>
                <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                <TableCell>{formatCurrency(p.amount || 0)}</TableCell>
                <TableCell>{p.method || "-"}</TableCell>
                <TableCell>{p.note || "-"}</TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No payments recorded.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <RecordPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        customerId={id}
        customerName={customer.name}
        onRecorded={(newPayment) => {
          (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (newPayment) {
              setPayments(prev => [newPayment, ...prev].slice(0, 10));
            } else {
              const { data: pays } = await supabase
                .from("payments")
                .select("*")
                .eq("user_id", user.id)
                .eq("customer_id", id)
                .order("created_at", { ascending: false })
                .limit(10);
              setPayments(pays || []);
            }

            const { data: cust } = await supabase
              .from("customers")
              .select("*")
              .eq("user_id", user.id)
              .eq("id", id)
              .single();
            setCustomer(cust);
          })();
        }}
      />
    </div>
  );
}