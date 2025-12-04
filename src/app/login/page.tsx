"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoginCard from "@/components/LoginCard";
import SignupCard from "@/components/SignupCard";
import CompanyBrand from "@/components/CompanyBrand";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const router = useRouter();

  const enableDevBypass = () => {
    try {
      localStorage.setItem("DEV_AUTH", "true");
      window.location.href = "/dashboard";
    } catch {
      router.replace("/dashboard");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <CompanyBrand />
        <h1 className="text-xl font-semibold mb-4 text-center">Gear Management System</h1>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <Button
            variant={mode === "login" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("login")}
          >
            Login
          </Button>
          <Button
            variant={mode === "signup" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("signup")}
          >
            Sign Up
          </Button>
          <Button variant="secondary" size="sm" onClick={enableDevBypass}>
            DEV
          </Button>
        </div>

        {mode === "login" ? <LoginCard /> : <SignupCard />}

        <p className="mt-4 text-xs text-center text-muted-foreground">
          Need access? Contact your administrator.
        </p>
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs underline text-muted-foreground">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}