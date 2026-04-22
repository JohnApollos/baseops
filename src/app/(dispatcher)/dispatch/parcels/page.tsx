"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParcelStatusBadge } from "@/components/dispatch/parcel-status-badge";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import type { ParcelStatus } from "@/types";

// ============================================================
// Parcels List — table view of all parcels in the organization.
// ============================================================

const demoParcels = [
  { id: "1", tracking_code: "BOP-2025-00001", sender: "Jumia Kenya", recipient: "Peter Kamau", address: "Kilimani, Nairobi", weight: 2.5, status: "in_transit" as ParcelStatus, driver: "James Ochieng" },
  { id: "2", tracking_code: "BOP-2025-00002", sender: "Amazon KE", recipient: "Grace Muthoni", address: "Karen, Nairobi", weight: 1.0, status: "assigned" as ParcelStatus, driver: "Mary Akinyi" },
  { id: "3", tracking_code: "BOP-2025-00003", sender: "Masoko", recipient: "John Otieno", address: "Langata, Nairobi", weight: 5.0, status: "received" as ParcelStatus, driver: "—" },
  { id: "4", tracking_code: "BOP-2025-00004", sender: "Glovo", recipient: "Ann Wairimu", address: "South B, Nairobi", weight: 0.5, status: "delivered" as ParcelStatus, driver: "James Ochieng" },
  { id: "5", tracking_code: "BOP-2025-00005", sender: "Sky Garden", recipient: "David Mwangi", address: "Embakasi, Nairobi", weight: 3.2, status: "failed" as ParcelStatus, driver: "Mary Akinyi" },
  { id: "6", tracking_code: "BOP-2025-00006", sender: "Shopify KE", recipient: "Lucy Njeri", address: "Roysambu, Nairobi", weight: 1.8, status: "in_transit" as ParcelStatus, driver: "James Ochieng" },
  { id: "7", tracking_code: "BOP-2025-00007", sender: "Copia", recipient: "Moses Kipchoge", address: "Kasarani, Nairobi", weight: 4.0, status: "received" as ParcelStatus, driver: "—" },
];

export default function ParcelsListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Parcels</h1>
          <p className="text-muted-foreground">
            {demoParcels.length} parcels in your organization.
          </p>
        </div>
        <Link href="/dispatch/parcels/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Parcel
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking Code</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead className="hidden md:table-cell">Address</TableHead>
              <TableHead className="hidden sm:table-cell">Weight</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Driver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoParcels.map((parcel) => (
              <TableRow key={parcel.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-code text-primary text-sm">
                  {parcel.tracking_code}
                </TableCell>
                <TableCell className="text-sm">{parcel.sender}</TableCell>
                <TableCell className="text-sm font-medium">
                  {parcel.recipient}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {parcel.address}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm font-code">
                  {parcel.weight} kg
                </TableCell>
                <TableCell>
                  <ParcelStatusBadge status={parcel.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {parcel.driver}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
