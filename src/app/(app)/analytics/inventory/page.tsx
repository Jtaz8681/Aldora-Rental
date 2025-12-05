"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { formatCurrency } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell, LineChart, Line } from "recharts";

type GearPerformance = {
  gear_id: string;
  total_revenue: number;
  total_maintenance_cost: number;
  total_damage_cost: number;
  utilization_rate: number;
  roi: number;
  performance_score: number;
  total_rental_days: number;
  average_rental_duration: number;
  days_since_last_rental: number;
  demand_forecast: number;
  break_even_date: string | null;
  gear_items: {
    internal_id: string;
    category: string;
    brand: string;
    model: string;
    purchase_cost: number;
    current_value: number;
    purchase_date: string;
    status: string;
    depreciation_rate: number;
  } | null;
};

type CategoryPerformance = {
  category: string;
  total_gear: number;
  total_revenue: number;
  total_cost: number;
  average_roi: number;
  average_utilization: number;
  total_maintenance_cost: number;
};

type DepreciationData = {
  age_months: number;
  original_value: number;
  current_value: number;
  depreciation_rate: number;
  accumulated_depreciation: number;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function InventoryAnalyticsPage() {
  const [gearPerformance, setGearPerformance] = useState<GearPerformance[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [depreciationData, setDepreciationData] = useState<DepreciationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("90d");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("roi");

  useEffect(() => {
    const loadInventoryAnalytics = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const daysBack = timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
        const startDate = subDays(new Date(), daysBack).toISOString();

        // Load gear performance data
        const { data: performanceData } = await supabase
          .from("gear_performance")
          .select(`
            *,
            gear_items!inner(
              internal_id,
              category,
              brand,
              model,
              purchase_cost,
              current_value,
              purchase_date,
              status,
              depreciation_rate
            )
          `)
          .eq("user_id", user.id)
          .gte("updated_at", startDate)
          .order("total_revenue", { ascending: false });

        if (performanceData) {
          setGearPerformance(performanceData as GearPerformance[]);
        }

        // Calculate category performance
        if (performanceData) {
          const categoryMap = new Map<string, CategoryPerformance>();
          
          performanceData.forEach((gp: any) => {
            const category = gp.gear_items?.category || 'uncategorized';
            const current = categoryMap.get(category) || {
              category,
              total_gear: 0,
              total_revenue: 0,
              total_cost: 0,
              average_roi: 0,
              average_utilization: 0,
              total_maintenance_cost: 0
            };

            const totalCost = (gp.gear_items?.purchase_cost || 0) + 
                            (gp.total_maintenance_cost || 0) + 
                            (gp.total_damage_cost || 0);

            categoryMap.set(category, {
              ...current,
              total_gear: current.total_gear + 1,
              total_revenue: current.total_revenue + (gp.total_revenue || 0),
              total_cost: current.total_cost + totalCost,
              total_maintenance_cost: current.total_maintenance_cost + (gp.total_maintenance_cost || 0)
            });
          });

          const categories = Array.from(categoryMap.values()).map(cat => ({
            ...cat,
            average_roi: cat.total_cost > 0 ? ((cat.total_revenue - cat.total_cost) / cat.total_cost) * 100 : 0,
            average_utilization: categoryMap.get(cat.category)?.total_gear > 0 ? 
              performanceData.filter((gp: any) => gp.gear_items?.category === cat.category)
                .reduce((sum, gp) => sum + (gp.utilization_rate || 0), 0) / 
              performanceData.filter((gp: any) => gp.gear_items?.category === cat.category).length || 0 : 0
          }));

          setCategoryPerformance(categories.sort((a, b) => b.total_revenue - a.total_revenue));
        }

        // Generate depreciation analysis
        if (performanceData) {
          const depreciation: DepreciationData[] = performanceData.map((gp: any) => {
            const purchaseDate = new Date(gp.gear_items?.purchase_date || new Date());
            const currentDate = new Date();
            const ageInMonths = Math.floor((currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
            const originalValue = gp.gear_items?.purchase_cost || 0;
            const depreciationRate = gp.gear_items?.depreciation_rate || 0.1;
            const accumulatedDepreciation = originalValue * (1 - Math.pow(1 - depreciationRate, ageInMonths));
            const currentValue = originalValue - accumulatedDepreciation;

            return {
              age_months: ageInMonths,
              original_value: originalValue,
              current_value: currentValue,
              depreciation_rate: depreciationRate,
              accumulated_depreciation: accumulatedDepreciation
            };
          });
          setDepreciationData(depreciation);
        }

      } catch (error) {
        console.error("Error loading inventory analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInventoryAnalytics();
  }, [timeRange]);

  const filteredAndSortedGear = useMemo(() => {
    let filtered = gearPerformance;

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(g => g.gear_items?.category === categoryFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g => 
        g.gear_items?.internal_id?.toLowerCase().includes(term) ||
        g.gear_items?.brand?.toLowerCase().includes(term) ||
        g.gear_items?.model?.toLowerCase().includes(term) ||
        g.gear_items?.category?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "roi":
          return b.roi - a.roi;
        case "revenue":
          return b.total_revenue - a.total_revenue;
        case "utilization":
          return b.utilization_rate - a.utilization_rate;
        case "performance":
          return b.performance_score - a.performance_score;
        case "maintenance_cost":
          return a.total_maintenance_cost - b.total_maintenance_cost;
        default:
          return b.roi - a.roi;
      }
    });

    return sorted;
  }, [gearPerformance, categoryFilter, searchTerm, sortBy]);

  const topPerformers = useMemo(() => {
    return filteredAndSortedGear.slice(0, 10);
  }, [filteredAndSortedGear]);

  const underperformers = useMemo(() => {
    return gearPerformance
      .filter(g => g.roi < 0 || g.utilization_rate < 0.3)
      .sort((a, b) => a.roi - b.roi)
      .slice(0, 10);
  }, [gearPerformance]);

  const highMaintenanceItems = useMemo(() => {
    return gearPerformance
      .filter(g => g.total_maintenance_cost > 0)
      .sort((a, b) => b.total_maintenance_cost - a.total_maintenance_cost)
      .slice(0, 10);
  }, [gearPerformance]);

  const summaryStats = useMemo(() => {
    const totalGear = gearPerformance.length;
    const totalRevenue = gearPerformance.reduce((sum, g) => sum + g.total_revenue, 0);
    const totalMaintenanceCost = gearPerformance.reduce((sum, g) => sum + g.total_maintenance_cost, 0);
    const totalDamageCost = gearPerformance.reduce((sum, g) => sum + g.total_damage_cost, 0);
    const avgUtilization = totalGear > 0 ? gearPerformance.reduce((sum, g) => sum + g.utilization_rate, 0) / totalGear : 0;
    const avgROI = totalGear > 0 ? gearPerformance.reduce((sum, g) => sum + g.roi, 0) / totalGear : 0;
    const positiveROI = gearPerformance.filter(g => g.roi > 0).length;
    const breakEvenItems = gearPerformance.filter(g => g.break_even_date && new Date(g.break_even_date) <= new Date()).length;

    return {
      totalGear,
      totalRevenue,
      totalMaintenanceCost,
      totalDamageCost,
      avgUtilization,
      avgROI,
      positiveROI,
      breakEvenItems,
      roiPercentage: totalGear > 0 ? (positiveROI / totalGear) * 100 : 0
    };
  }, [gearPerformance]);

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading inventory analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory Performance Analytics</h1>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gearPerformance.length}</div>
            <p className="text-xs text-muted-foreground">Active gear items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.avgROI.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{summaryStats.roiPercentage.toFixed(1)}% positive ROI</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summaryStats.avgUtilization * 100).toFixed(1)}%</div>
            <Progress value={summaryStats.avgUtilization * 100} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Break-even Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.breakEvenItems}</div>
            <p className="text-xs text-muted-foreground">Paid for themselves</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Category Performance Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryPerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.category}: ${formatCurrency(entry.total_revenue)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total_revenue"
                    >
                      {categoryPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ROI vs Utilization Scatter Plot */}
            <Card>
              <CardHeader>
                <CardTitle>ROI vs Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="utilization_rate" 
                      name="Utilization" 
                      unit="%" 
                      domain={[0, 1]}
                      tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                    />
                    <YAxis 
                      dataKey="roi" 
                      name="ROI" 
                      unit="%" 
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value: any, name: string) => [
                        name === 'roi' ? `${value.toFixed(1)}%` : `${(value * 100).toFixed(1)}%`,
                        name === 'roi' ? 'ROI' : 'Utilization'
                      ]}
                    />
                    <Scatter 
                      name="Gear Items" 
                      data={gearPerformance.map(g => ({
                        utilization_rate: g.utilization_rate,
                        roi: g.roi,
                        gear_id: g.gear_items?.internal_id
                      }))} 
                      fill="#8884d8" 
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Category Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Items Count</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Avg ROI</TableHead>
                      <TableHead>Avg Utilization</TableHead>
                      <TableHead>Maintenance Costs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryPerformance.map((category) => (
                      <TableRow key={category.category}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {category.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{category.total_gear}</TableCell>
                        <TableCell>{formatCurrency(category.total_revenue)}</TableCell>
                        <TableCell className={category.average_roi >= 0 ? "text-green-600" : "text-red-600"}>
                          {category.average_roi.toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={category.average_utilization * 100} className="w-16" />
                            <span className="text-sm">{(category.average_utilization * 100).toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(category.total_maintenance_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>ROI</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Utilization</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPerformers.map((gear) => (
                        <TableRow key={gear.gear_id}>
                          <TableCell className="font-mono text-sm">
                            {gear.gear_items?.internal_id || gear.gear_id.slice(0, 8)}
                          </TableCell>
                          <TableCell className={gear.roi >= 0 ? "text-green-600" : "text-red-600"}>
                            {gear.roi.toFixed(1)}%
                          </TableCell>
                          <TableCell>{formatCurrency(gear.total_revenue)}</TableCell>
                          <TableCell>{(gear.utilization_rate * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Underperformers */}
            <Card>
              <CardHeader>
                <CardTitle>Underperforming Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>ROI</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Utilization</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {underperformers.map((gear) => (
                        <TableRow key={gear.gear_id}>
                          <TableCell className="font-mono text-sm">
                            {gear.gear_items?.internal_id || gear.gear_id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {gear.roi.toFixed(1)}%
                          </TableCell>
                          <TableCell>{formatCurrency(gear.total_revenue)}</TableCell>
                          <TableCell>{(gear.utilization_rate * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* High Maintenance Items */}
          <Card>
            <CardHeader>
              <CardTitle>High Maintenance Cost Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Maintenance Cost</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Maintenance % of Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {highMaintenanceItems.map((gear) => (
                      <TableRow key={gear.gear_id}>
                        <TableCell className="font-mono text-sm">
                          {gear.gear_items?.internal_id || gear.gear_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{gear.gear_items?.category}</TableCell>
                        <TableCell className="text-red-600">
                          {formatCurrency(gear.total_maintenance_cost)}
                        </TableCell>
                        <TableCell>{formatCurrency(gear.total_revenue)}</TableCell>
                        <TableCell>
                          {gear.total_revenue > 0 
                            ? ((gear.total_maintenance_cost / gear.total_revenue) * 100).toFixed(1)
                            : "N/A"
                          }%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Depreciation Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="age_months" 
                    name="Age" 
                    unit="months"
                    tickFormatter={(value) => `${value}m`}
                  />
                  <YAxis 
                    dataKey="accumulated_depreciation" 
                    name="Depreciation" 
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value: any, name: string) => [
                      name === 'accumulated_depreciation' ? formatCurrency(value) : `${value} months`,
                      name === 'accumulated_depreciation' ? 'Depreciation' : 'Age'
                    ]}
                  />
                  <Scatter 
                    name="Assets" 
                    data={depreciationData} 
                    fill="#8884d8" 
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Depreciation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {depreciationData.length > 0 
                      ? (depreciationData.reduce((sum, d) => sum + d.original_value, 0) / depreciationData.length).toFixed(0)
                      : "0"
                    }
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Original Value</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {depreciationData.length > 0 
                      ? (depreciationData.reduce((sum, d) => sum + d.accumulated_depreciation, 0) / depreciationData.length).toFixed(0)
                      : "0"
                    }
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Depreciation</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {depreciationData.length > 0 
                      ? (depreciationData.reduce((sum, d) => sum + d.age_months, 0) / depreciationData.length).toFixed(1)
                      : "0"
                    }
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Age (months)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search gear..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryPerformance.map(cat => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="roi">Sort by ROI</SelectItem>
                <SelectItem value="revenue">Sort by Revenue</SelectItem>
                <SelectItem value="utilization">Sort by Utilization</SelectItem>
                <SelectItem value="performance">Sort by Performance</SelectItem>
                <SelectItem value="maintenance_cost">Sort by Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Detailed Gear Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Gear Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Purchase Cost</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>ROI</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Maintenance Cost</TableHead>
                      <TableHead>Performance Score</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedGear.slice(0, 20).map((gear) => (
                      <TableRow key={gear.gear_id}>
                        <TableCell>
                          <div>
                            <div className="font-mono text-sm">{gear.gear_items?.internal_id || gear.gear_id.slice(0, 8)}</div>
                            <div className="text-xs text-muted-foreground">
                              {gear.gear_items?.brand} {gear.gear_items?.model}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {gear.gear_items?.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(gear.gear_items?.purchase_cost || 0)}</TableCell>
                        <TableCell>{formatCurrency(gear.total_revenue)}</TableCell>
                        <TableCell className={gear.roi >= 0 ? "text-green-600" : "text-red-600"}>
                          {gear.roi.toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={gear.utilization_rate * 100} className="w-16" />
                            <span className="text-sm">{(gear.utilization_rate * 100).toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(gear.total_maintenance_cost)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={gear.performance_score * 100} className="w-16" />
                            <span className="text-sm">{(gear.performance_score * 100).toFixed(0)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/gear/${gear.gear_id}`} className="text-sm underline">
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
