"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { formatCurrency } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

type CustomerAnalytics = {
  customer_id: string;
  total_revenue: number;
  total_rentals_count: number;
  churn_risk_score: number;
  loyalty_score: number;
  rental_frequency: number;
  average_rental_duration: number;
  average_rental_value: number;
  last_activity_date: string;
  customers: {
    name: string;
    email: string;
    phone: string;
    customer_segment: string;
    customer_since: string;
  } | null;
};

type CustomerSegment = {
  segment: string;
  count: number;
  revenue: number;
  percentage: number;
};

type RetentionData = {
  month: string;
  new_customers: number;
  retained_customers: number;
  churned_customers: number;
  retention_rate: number;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function CustomerAnalyticsPage() {
  const [customerData, setCustomerData] = useState<CustomerAnalytics[]>([]);
  const [segmentData, setSegmentData] = useState<CustomerSegment[]>([]);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("90d");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("revenue");

  useEffect(() => {
    const loadCustomerAnalytics = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const daysBack = timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
        const startDate = subDays(new Date(), daysBack).toISOString();

        // Load customer analytics with customer details
        const { data: analyticsData } = await supabase
          .from("customer_analytics")
          .select(`
            *,
            customers!inner(
              name,
              email,
              phone,
              customer_segment,
              customer_since
            )
          `)
          .eq("user_id", user.id)
          .gte("updated_at", startDate)
          .order("total_revenue", { ascending: false });

        if (analyticsData) {
          setCustomerData(analyticsData as CustomerAnalytics[]);
        }

        // Load segment data
        const { data: customers } = await supabase
          .from("customers")
          .select("customer_segment, total_revenue_generated")
          .eq("user_id", user.id);

        if (customers) {
          const segmentMap = new Map<string, { count: number; revenue: number }>();
          
          customers.forEach(customer => {
            const segment = customer.customer_segment || 'unsegmented';
            const current = segmentMap.get(segment) || { count: 0, revenue: 0 };
            segmentMap.set(segment, {
              count: current.count + 1,
              revenue: current.revenue + (customer.total_revenue_generated || 0)
            });
          });

          const total = customers.length;
          const segments = Array.from(segmentMap.entries()).map(([segment, data]) => ({
            segment,
            count: data.count,
            revenue: data.revenue,
            percentage: total > 0 ? (data.count / total) * 100 : 0
          }));

          setSegmentData(segments);
        }

        // Load retention data (mock data for now - would come from analytics table)
        const mockRetentionData: RetentionData[] = [
          { month: "Jan", new_customers: 45, retained_customers: 180, churned_customers: 15, retention_rate: 92.3 },
          { month: "Feb", new_customers: 52, retained_customers: 185, churned_customers: 12, retention_rate: 93.9 },
          { month: "Mar", new_customers: 38, retained_customers: 195, churned_customers: 8, retention_rate: 96.1 },
          { month: "Apr", new_customers: 61, retained_customers: 203, churned_customers: 18, retention_rate: 91.8 },
          { month: "May", new_customers: 43, retained_customers: 210, churned_customers: 10, retention_rate: 95.5 },
          { month: "Jun", new_customers: 57, retained_customers: 218, churned_customers: 14, retention_rate: 94.0 },
        ];
        setRetentionData(mockRetentionData);

      } catch (error) {
        console.error("Error loading customer analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomerAnalytics();
  }, [timeRange]);

  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customerData;

    // Apply segment filter
    if (segmentFilter !== "all") {
      filtered = filtered.filter(c => c.customers?.customer_segment === segmentFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.customers?.name?.toLowerCase().includes(term) ||
        c.customers?.email?.toLowerCase().includes(term) ||
        c.customers?.phone?.includes(term)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return b.total_revenue - a.total_revenue;
        case "rentals":
          return b.total_rentals_count - a.total_rentals_count;
        case "loyalty":
          return b.loyalty_score - a.loyalty_score;
        case "churn_risk":
          return b.churn_risk_score - a.churn_risk_score;
        case "frequency":
          return b.rental_frequency - a.rental_frequency;
        default:
          return b.total_revenue - a.total_revenue;
      }
    });

    return sorted;
  }, [customerData, segmentFilter, searchTerm, sortBy]);

  const topPerformers = useMemo(() => {
    return filteredAndSortedCustomers.slice(0, 10);
  }, [filteredAndSortedCustomers]);

  const atRiskCustomers = useMemo(() => {
    return customerData
      .filter(c => c.churn_risk_score > 0.7)
      .sort((a, b) => b.churn_risk_score - a.churn_risk_score)
      .slice(0, 10);
  }, [customerData]);

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading customer analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Customer Analytics</h1>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="365d">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerData.length}</div>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue/Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customerData.length > 0 
                ? formatCurrency(customerData.reduce((sum, c) => sum + c.total_revenue, 0) / customerData.length)
                : formatCurrency(0)
              }
            </div>
            <p className="text-xs text-muted-foreground">Customer lifetime value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{atRiskCustomers.length}</div>
            <p className="text-xs text-muted-foreground">Churn risk &gt; 70%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Loyalty Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customerData.length > 0 
                ? (customerData.reduce((sum, c) => sum + c.loyalty_score, 0) / customerData.length * 100).toFixed(1)
                : "0"
              }%
            </div>
            <p className="text-xs text-muted-foreground">Customer satisfaction</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Customer Segments Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={segmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.segment}: ${entry.percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentage"
                    >
                      {segmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performers Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Customers by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topPerformers.map((c, i) => ({
                    name: c.customers?.name || `Customer ${i + 1}`,
                    revenue: c.total_revenue
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Segment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead>Customer Count</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Avg. Revenue/Customer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segmentData.map((segment) => (
                      <TableRow key={segment.segment}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {segment.segment}
                          </Badge>
                        </TableCell>
                        <TableCell>{segment.count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={segment.percentage} className="w-16" />
                            <span className="text-sm">{segment.percentage.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(segment.revenue)}</TableCell>
                        <TableCell>
                          {segment.count > 0 ? formatCurrency(segment.revenue / segment.count) : formatCurrency(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Retention Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={retentionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="new_customers" fill="#8884d8" name="New Customers" />
                  <Bar yAxisId="left" dataKey="churned_customers" fill="#FF8042" name="Churned Customers" />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="retention_rate" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    name="Retention Rate %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="occasional">Occasional</SelectItem>
                <SelectItem value="at-risk">At Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort by Revenue</SelectItem>
                <SelectItem value="rentals">Sort by Rentals</SelectItem>
                <SelectItem value="loyalty">Sort by Loyalty</SelectItem>
                <SelectItem value="churn_risk">Sort by Risk</SelectItem>
                <SelectItem value="frequency">Sort by Frequency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Detailed Customer Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Detailed Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Total Rentals</TableHead>
                      <TableHead>Avg. Rental Value</TableHead>
                      <TableHead>Rental Frequency</TableHead>
                      <TableHead>Loyalty Score</TableHead>
                      <TableHead>Churn Risk</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedCustomers.slice(0, 20).map((customer) => (
                      <TableRow key={customer.customer_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.customers?.name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{customer.customers?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {customer.customers?.customer_segment || 'unsegmented'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(customer.total_revenue)}</TableCell>
                        <TableCell>{customer.total_rentals_count}</TableCell>
                        <TableCell>{formatCurrency(customer.average_rental_value)}</TableCell>
                        <TableCell>{customer.rental_frequency.toFixed(1)}/month</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={customer.loyalty_score * 100} className="w-16" />
                            <span className="text-sm">{(customer.loyalty_score * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            customer.churn_risk_score > 0.7 ? "destructive" :
                            customer.churn_risk_score > 0.4 ? "secondary" : "default"
                          }>
                            {customer.churn_risk_score > 0.7 ? "High" :
                             customer.churn_risk_score > 0.4 ? "Medium" : "Low"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/customers/${customer.customer_id}`} className="text-sm underline">
                            View Details
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
