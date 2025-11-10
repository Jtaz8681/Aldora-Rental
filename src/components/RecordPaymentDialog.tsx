"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  method: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
  onRecorded?: (newPayment?: any) => void;
};

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  onRecorded,
}: Props) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: inserted, error: insertErr } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        customer_id: customerId,
        amount: values.amount,
        method: (values.method ?? "").trim(),
        note: (values.note ?? "").trim(),
      })
      .select("*")
      .single();

    if (insertErr) {
      toast.error("Failed to record payment: " + insertErr.message);
      throw insertErr;
    }

    await supabase
      .rpc("increment_customer_balance", {
        p_user_id: user.id,
        p_customer_id: customerId,
        p_amount: -Math.abs(values.amount),
      });

    toast.success("Payment recorded");
    reset();
    onOpenChange(false);
    onRecorded?.(inserted);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Apply a payment to {customerName || "this customer"} and reduce their balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" step="0.01" {...register("amount")} />
            {errors.amount && <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <Label htmlFor="method">Method</Label>
            <Input id="method" placeholder="Cash, Card, Transfer..." {...register("method")} />
          </div>
          <div>
            <Label htmlFor="note">Note</Label>
            <Input id="note" placeholder="Any reference or details" {...register("note")} />
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Save Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}