"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirm_password: z.string().min(6, "Confirm your password")
}).refine((vals) => vals.password === vals.confirm_password, {
  path: ["confirm_password"],
  message: "Passwords do not match"
});

type FormValues = z.infer<typeof schema>;

export default function SignupCard() {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (values: FormValues) => {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          role: "dev"
        }
      }
    });

    if (error) {
      toast.error("Sign up failed: " + error.message);
      throw error;
    }

    // If email confirmations are enabled, there may be no session yet.
    if (data.session) {
      toast.success("Account created. Redirecting...");
    } else {
      toast.success("Account created. Please check your email to confirm your address.");
    }
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input id="first_name" {...register("first_name")} placeholder="First name" />
          {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>}
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input id="last_name" {...register("last_name")} placeholder="Last name" />
          {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} placeholder="you@example.com" />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password")} placeholder="Create a password" />
          {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <Label htmlFor="confirm_password">Confirm Password</Label>
          <Input id="confirm_password" type="password" {...register("confirm_password")} placeholder="Repeat password" />
          {errors.confirm_password && <p className="text-xs text-destructive mt-1">{errors.confirm_password.message}</p>}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create Account"}
      </Button>

      <p className="text-xs text-muted-foreground mt-2">
        By creating an account, you agree to the terms of service.
      </p>
    </form>
  );
}