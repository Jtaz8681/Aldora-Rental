"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users2, Package, TrendingUp, ArrowRight } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your rental business performance
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Users2 className="h-8 w-8 text-blue-600 mr-3" />
            <div className="grid gap-1">
              <CardTitle className="text-xl">Customer Analytics</CardTitle>
              <CardDescription>
                Analyze customer behavior, rental patterns, and demographics
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View detailed insights about your customers including rental frequency, 
              preferences, revenue contribution, and customer lifetime value.
            </p>
            <Link href="/analytics/customers">
              <Button className="w-full">
                View Customer Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Package className="h-8 w-8 text-green-600 mr-3" />
            <div className="grid gap-1">
              <CardTitle className="text-xl">Inventory Analytics</CardTitle>
              <CardDescription>
                Track equipment performance, utilization rates, and maintenance needs
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Monitor your inventory performance including utilization rates, 
              revenue per item, maintenance costs, and depreciation tracking.
            </p>
            <Link href="/analytics/inventory">
              <Button className="w-full">
                View Inventory Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analytics Overview
          </CardTitle>
          <CardDescription>
            Key performance indicators for your rental business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">24.5%</div>
              <div className="text-sm text-muted-foreground">Inventory Utilization</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">$12,450</div>
              <div className="text-sm text-muted-foreground">Monthly Revenue</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">156</div>
              <div className="text-sm text-muted-foreground">Active Customers</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">4.8</div>
              <div className="text-sm text-muted-foreground">Avg. Rental Days</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
