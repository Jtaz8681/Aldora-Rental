"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button"; // Import Button
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import ReportDamageDialog from "@/components/ReportDamageDialog"; // Import the new component

type Rental = {
  id: string;
  customer_id: string;
  start_at: string;
  expected_end_at: string;
  signed_at: string | null;
  signature_data_url: string | null;
  total_cost: number;
  status: string;
  created_at: string;
  customers: { name: string; email: string | null; phone: string | null } | null;
};

type DamageReport = {
  id: string;
  damage_type: string | null;
  severity: string | null;
  estimate_cost: number | null;
  notes: string | null;
  photos: string[] | null;
  rental_item_id: string; // Added rental_item_id to type
};

type RentalItem = {
  id: string;
  gear_id: string;
  price: number;
  pre_checklist: Record<string, boolean>;
  post_checklist: Record<string, boolean>;
  inspected_by: string | null;
  inspected_at: string | null;
  gear_items: {
    internal_id: string;
    friendly_name: string | null;
    category: string;
    sub_type: string | null;
    brand: string | null;
    model: string | null;
    size: string | null;
    photos: string[] | null;
  } | null;
  damage_reports: DamageReport[]; // Using the updated DamageReport type
};

export default function RentalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rentalId = params?.id as string;
  const [rental, setRental] = useState<Rental | null>(null);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showReportDamageDialog, setShowReportDamageDialog] = useState(false);
  const [selectedGearForDamage, setSelectedGearForDamage] = useState<{ rentalItemId: string; gearId: string; gearInternalId: string } | null>(null);

  const loadRentalData = async () => {
    if (!rentalId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: rentalData, error: rentalError } = await supabase
      .from("rentals")
      .select(`
          *,
          customers(name, email, phone)
        `)
      .eq("user_id", user.id)
      .eq("id", rentalId)
      .single();

    if (rentalError || !rentalData) {
      console.error("Error fetching rental:", rentalError);
      router.push("/rentals"); // Redirect if rental not found
      return;
    }
    setRental(rentalData);

    const { data: itemsData, error: itemsError } = await supabase
      .from("rental_items")
      .select(`
          *,
          gear_items(internal_id, friendly_name, category, sub_type, brand, model, size, photos),
          damage_reports(id, damage_type, severity, estimate_cost, notes, photos, rental_item_id)
        `)
      .eq("user_id", user.id)
      .eq("rental_id", rentalId);

    if (itemsError) {
      console.error("Error fetching rental items:", itemsError);
    }
    setRentalItems(itemsData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadRentalData();
  }, [rentalId]);

  const handleReportDamageClick = (rentalItemId: string, gearId: string, gearInternalId: string) => {
    setSelectedGearForDamage({ rentalItemId, gearId, gearInternalId });
    setShowReportDamageDialog(true);
  };

  const deleteDamageReport = async (damageReportId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("damage_reports")
      .delete()
      .eq("id", damageReportId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to delete damage report: " + error.message);
      throw error;
    }

    toast.success("Damage report deleted.");
    await loadRentalData();
  };

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

  const renderChecklist = (checklist: Record<string, boolean>) => (
    <div className="grid grid-cols-2 gap-1 text-xs">
      {Object.entries(checklist).map(([key, value]) => (
        <div key={key} className="flex items-center gap-1">
          {value ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
          <span className="capitalize">{key.replace(/_/g, " ")}</span>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading rental details...</div>;
  }

  if (!rental) {
    return <div className="text-center text-destructive">Rental not found.</div>;
  }

  const isOverdue = (rental.status === "active" || rental.status === "checked-out") && new Date(rental.expected_end_at).getTime() < Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rental Details</h1>
        <Link href={`/returns`} className="text-sm underline">Process Return</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rental Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p><strong>Customer:</strong> <Link href={`/customers/${rental.customer_id}`} className="underline">{rental.customers?.name || "N/A"}</Link></p>
          {rental.customers?.email && <p><strong>Email:</strong> {rental.customers.email}</p>}
          {rental.customers?.phone && <p><strong>Phone:</strong> {rental.customers.phone}</p>}
          <p><strong>Start Date:</strong> {format(new Date(rental.start_at), 'PPP p')}</p>
          <div><strong>Expected End Date:</strong> {format(new Date(rental.expected_end_at), 'PPP p')} {isOverdue && <Badge variant="destructive" className="ml-2">Overdue</Badge>}</div>
          <div><strong>Status:</strong> <Badge variant={statusVariant(rental.status)}>{rental.status}</Badge></div>
          <p><strong>Total Cost:</strong> ${Number(rental.total_cost || 0).toFixed(2)}</p>
          {rental.signed_at && <p><strong>Signed At:</strong> {format(new Date(rental.signed_at), 'PPP p')}</p>}
          {rental.signature_data_url && (
            <div>
              <strong>Signature:</strong>
              <img src={rental.signature_data_url} alt="Customer Signature" className="w-48 h-auto border rounded mt-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rented Gear Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gear ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price/Day</TableHead>
                <TableHead>Pre-Checklist</TableHead>
                <TableHead>Post-Checklist</TableHead>
                <TableHead>Damage Reports</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentalItems.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No gear items for this rental.</TableCell></TableRow>
              )}
              {rentalItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link href={`/gear/${item.gear_id}/edit`} className="underline">
                      {item.gear_items?.internal_id || "N/A"}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.gear_items?.friendly_name || ""}</p>
                  </TableCell>
                  <TableCell>{item.gear_items?.category || "N/A"}</TableCell>
                  <TableCell>${Number(item.price || 0).toFixed(2)}</TableCell>
                  <TableCell>{renderChecklist(item.pre_checklist)}</TableCell>
                  <TableCell>
                    {item.inspected_at ? (
                      <>
                        {renderChecklist(item.post_checklist)}
                        <p className="text-xs text-muted-foreground mt-1">Inspected by {item.inspected_by || "N/A"} on {format(new Date(item.inspected_at), 'PPP')}</p>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not returned yet</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.damage_reports && item.damage_reports.length > 0 ? (
                      <div className="space-y-1">
                        {item.damage_reports.map(dr => (
                          <div key={dr.id} className="border rounded p-1 text-xs">
                            <div><strong>Type:</strong> {dr.damage_type || "N/A"}</div>
                            <div><strong>Severity:</strong> <Badge variant={dr.severity === "Critical" ? "destructive" : "secondary"}>{dr.severity || "N/A"}</Badge></div>
                            {dr.estimate_cost && <div><strong>Estimate:</strong> ${Number(dr.estimate_cost).toFixed(2)}</div>}
                            {dr.notes && <div><strong>Notes:</strong> {dr.notes}</div>}
                            {dr.photos && dr.photos.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {dr.photos.map((photo, idx) => (
                                  <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                                    <img src={photo} alt={`Damage photo ${idx + 1}`} className="w-8 h-8 object-cover rounded" />
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className="flex justify-end mt-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete damage report?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove this report.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteDamageReport(dr.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">No damage reported</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReportDamageClick(item.id, item.gear_id, item.gear_items?.internal_id || "N/A")}
                    >
                      Report Damage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedGearForDamage && (
        <ReportDamageDialog
          open={showReportDamageDialog}
          onOpenChange={setShowReportDamageDialog}
          rentalId={rental.id}
          gearId={selectedGearForDamage.gearId}
          gearInternalId={selectedGearForDamage.gearInternalId}
          rentalItemId={selectedGearForDamage.rentalItemId} // Passed rentalItemId
          onReported={loadRentalData} // Refresh data after reporting damage
        />
      )}
    </div>
  );
}