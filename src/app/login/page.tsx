"use client";

import React from "react";
import Link from "next/link";
import LoginCard from "@/components/LoginCard";
import CompanyBrand from "@/components/CompanyBrand";

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <CompanyBrand />
        <h1 className="text-xl font-semibold mb-4 text-center">Gear Management System</h1>
        <LoginCard />
        <p className="mt-4 text-xs text-center text-muted-foreground">
          Need access? Contact your administrator. Want a Demo use the following demo login. demo1@mail.com DemoPassword1 
        </p>
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs underline text-muted-foreground">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}