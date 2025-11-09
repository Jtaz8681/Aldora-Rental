"use client";

import React from "react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateCustomer: Customer;
  onConfirmNew: () => void;
  onViewExisting: (id: string) => void;
};

export default function DuplicateCustomerWarning({
  open,
  onOpenChange,
  duplicateCustomer,
  onConfirmNew,
  onViewExisting,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Possible Duplicate Customer</AlertDialogTitle>
          <AlertDialogDescription>
            A customer with similar details already exists.
            <div className="mt-4 p-3 border rounded bg-muted text-sm">
              <p className="font-semibold">{duplicateCustomer.name}</p>
              {duplicateCustomer.phone && <p>Phone: {duplicateCustomer.phone}</p>}
              {duplicateCustomer.email && <p>Email: {duplicateCustomer.email}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="outline" onClick={() => onViewExisting(duplicateCustomer.id)}>View Existing</Button>
          </AlertDialogAction>
          <AlertDialogAction onClick={onConfirmNew}>Add Anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}