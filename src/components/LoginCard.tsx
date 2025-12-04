"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof LoginSchema>;

export default function LoginCard() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Fallback: call server-side password login and set client session
      const res = await fetch(`${window.location.origin}/api/auth/password-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error("Login failed: " + (payload.error || error.message));
        return;
      }
      const { access_token, refresh_token } = await res.json();
      const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
      if (setErr) {
        toast.error("Failed to set session: " + setErr.message);
        return;
      }
      toast.success("Signed in.");
      return;
    }

    toast.success("Signed in successfully");
    // SessionProvider will redirect to /dashboard on SIGNED_IN
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}