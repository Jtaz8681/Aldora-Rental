"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

type GearItem = {
  id: string;
  status: string;
};

type Customer = {
  id: string;
  balance_due: number;
};

type Rental = {
  id: string;
  customer_id: string;
  start_at: string;
  expected_end_at: string;
  status: string;
  total_cost: number | null;
  customers: { name: string } | null;
};

export default function DashboardPage() {
  const [totalGear, setTotalGear] = useState(0);
  const [availableGear, setAvailableGear] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [activeRentalsCount, setActiveRentalsCount] = useState(0);
  const [totalBalanceDue, setTotalBalanceDue] = useState(0);
  const [recentRentals, setRecentRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch Gear Data
      const { data: gearData, error: gearError } = await supabase
        .from("gear_items")
        .select("id, status")
        .eq("user_id", user.id);
      if (gearError) console.error("Error fetching gear:", gearError);
      setTotalGear(gearData?.length || 0);
      setAvailableGear(gearData?.filter(g => g.status === "Available").length || 0);

      // Fetch Customer Data
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, balance_due")
        .eq("user_id", user.id);
      if (customerError) console.error("Error fetching customers:", customerError);
      setTotalCustomers(customerData?.length || 0);
      setTotalBalanceDue(customerData?.reduce((sum, c) => sum + Number(c.balance_due || 0), 0) || 0);

      // Fetch Rental Data
      const { data: rentalData, error: rentalError } = await supabase
        .from("rentals")
        .select("id, customer_id, start_at, expected_end_at, status, total_cost, customers(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5); // Get recent rentals
      if (rentalError) console.error("Error fetching rentals:", rentalError);
      setActiveRentalsCount(rentalData?.filter(r => r.status === "active" || r.status === "checked-out").length || 0);
      setRecentRentals(rentalData || []);

      setLoading(false);
    };

    loadDashboardData();
  }, []);

  const statusVariant = (status: string) => {
    switch (status) {
      case "returned": return "secondary";
      case "checked-out": return "default";
      case "overdue": return "destructive";
      case "draft": return "outline";
      case "active": return "default";
      default: return "outline";
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gear Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGear}</div>
            <p className="text-xs text-muted-foreground">
              {availableGear} available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              ${totalBalanceDue.toFixed(2)} outstanding balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRentalsCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently checked out
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Rentals</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Expected End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentRentals.map(r => {
              const overdue = (r.status === "active" || r.status === "checked-out") && new Date(r.expected_end_at).getTime() < Date.now();
              return (
                <TableRow key={r.id}>
                  <TableCell>{r.customers?.name || "N/A"}</TableCell>
                  <TableCell>{format(new Date(r.start_at), 'PPP')}</TableCell>
                  <TableCell className={overdue ? "text-destructive" : ""}>
                    {format(new Date(r.expected_end_at), 'PPP')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>
                      {overdue ? "Overdue" : r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>${Number(r.total_cost || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Link href={`/customers/${r.customer_id}`} className="text-sm underline">View Customer</Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {recentRentals.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No recent rentals found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}