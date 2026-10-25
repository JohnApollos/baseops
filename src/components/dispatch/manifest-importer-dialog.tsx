"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { PaymentMethod } from "@/types";

interface ParsedManifestRow {
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  sender_name: string;
  sender_address: string;
  weight_kg: number;
  cod_amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  isValid: boolean;
  validationError?: string;
}

interface ManifestImporterDialogProps {
  orgId: string;
  onImportComplete: () => void;
}

export function ManifestImporterDialog({ orgId, onImportComplete }: ManifestImporterDialogProps) {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedManifestRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function parseCSV(text: string) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    // Check if first row is header
    const hasHeader = lines[0].toLowerCase().includes("recipient") || lines[0].toLowerCase().includes("phone");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const rows: ParsedManifestRow[] = dataLines.map((line, idx) => {
      // Split by comma or tab
      const cols = line.split(/[,\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ""));

      // Expected format:
      // RecipientName, Phone, Address, SenderName, WeightKg, CODAmount, PaymentMethod, Notes
      const recipient_name = cols[0] || `Customer #${idx + 1}`;
      const recipient_phone = cols[1] || "";
      const recipient_address = cols[2] || "Nairobi CBD";
      const sender_name = cols[3] || "Merchant Central";
      const weight_kg = Math.max(0.1, Number(cols[4]) || 1.0);
      const cod_amount = Math.max(0, Number(cols[5]) || 0);
      const rawPaymentMethod = (cols[6] || "cash").toLowerCase();
      const payment_method: PaymentMethod = ["cash", "mpesa", "prepaid"].includes(rawPaymentMethod)
        ? (rawPaymentMethod as PaymentMethod)
        : "cash";
      const notes = cols[7] || "Merchant bulk delivery";

      let isValid = true;
      let validationError = "";

      if (!recipient_phone || recipient_phone.length < 8) {
        isValid = false;
        validationError = "Invalid phone number";
      }

      return {
        recipient_name,
        recipient_phone,
        recipient_address,
        sender_name,
        sender_address: "Nairobi Logistics Hub",
        weight_kg,
        cod_amount,
        payment_method,
        notes,
        isValid,
        validationError,
      };
    });

    setParsedRows(rows);
  }

  function handlePasteExample() {
    const sample = `Recipient Name,Phone,Delivery Address,Merchant Sender,Weight (kg),COD (KES),Payment Method,Notes
Jane Muthoni,0712345678,Westlands Mpaka Rd,Glamour Boutique,1.5,3500,mpesa,Ring door bell
Kevin Omondi,0723456789,Kilimani Wood Avenue,Nairobi Electronics,3.0,12500,cash,Call on arrival
Amina Hassan,0734567890,Eastleigh 12th St,Somali Fabrics,2.0,4200,mpesa,Shop #14
Brian Kiprop,0798765432,Karen Hardy Close,Safari Gear,5.2,8900,cash,Gate B`;
    setRawText(sample);
    parseCSV(sample);
  }

  async function handleBulkImport() {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid manifest rows to import.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const now = new Date().toISOString();
      const batchParcels = validRows.map((r, i) => {
        const tracking_code = `BOP-${Date.now().toString(36).toUpperCase()}-${(i + 1).toString().padStart(3, "0")}`;
        return {
          org_id: orgId,
          tracking_code,
          sender_name: r.sender_name,
          sender_address: r.sender_address,
          recipient_name: r.recipient_name,
          recipient_phone: r.recipient_phone,
          recipient_address: r.recipient_address,
          weight_kg: r.weight_kg,
          cod_amount: r.cod_amount,
          collected_amount: 0.0,
          payment_method: r.payment_method,
          reconciliation_status: "pending",
          status: "received",
          notes: r.notes,
          created_at: now,
        };
      });

      const { error } = await supabase.from("parcels").insert(batchParcels);
      if (error) throw error;

      toast.success(`Successfully imported ${batchParcels.length} parcels into dispatch!`);
      setOpen(false);
      setRawText("");
      setParsedRows([]);
      onImportComplete();
    } catch (err: unknown) {
      toast.error("Import failed: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const totalCOD = parsedRows.filter((r) => r.isValid).reduce((sum, r) => sum + r.cod_amount, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
          <Upload className="mr-2 h-4 w-4" />
          Import Manifest (CSV)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Bulk Merchant Manifest Ingestion
          </DialogTitle>
          <DialogDescription>
            Paste daily CSV/Excel manifest rows from social commerce merchants. Automatically provisions tracking codes and COD settlement metrics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto py-2">
          {parsedRows.length === 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Format: Recipient Name, Phone, Address, Sender, Weight (kg), COD (KES), Payment Method, Notes</span>
                <button
                  type="button"
                  onClick={handlePasteExample}
                  className="text-primary hover:underline font-medium"
                >
                  Paste Example Manifest
                </button>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  parseCSV(e.target.value);
                }}
                placeholder="Paste CSV rows here..."
                rows={8}
                className="w-full rounded-lg border bg-muted/20 p-3 font-code text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {validCount} Ready to Import
                  </span>
                  {parsedRows.length - validCount > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      {parsedRows.length - validCount} Invalid Rows
                    </span>
                  )}
                </div>
                <div className="font-semibold text-primary">
                  Total Expected COD: KES {totalCOD.toLocaleString()}
                </div>
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Recipient</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Expected COD</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-medium">{row.recipient_name}</TableCell>
                        <TableCell className="font-code">{row.recipient_phone}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{row.recipient_address}</TableCell>
                        <TableCell className="font-code font-semibold">
                          KES {row.cod_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="uppercase">{row.payment_method}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <span className="text-success flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="h-3 w-3" /> Valid
                            </span>
                          ) : (
                            <span className="text-destructive flex items-center gap-1 text-[11px]" title={row.validationError}>
                              <AlertTriangle className="h-3 w-3" /> {row.validationError}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <button
                type="button"
                onClick={() => {
                  setParsedRows([]);
                  setRawText("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear and paste different manifest
              </button>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 flex justify-between sm:justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={validCount === 0 || isSubmitting}
            onClick={handleBulkImport}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ingesting Manifest...
              </>
            ) : (
              `Import ${validCount} Parcels (KES ${totalCOD.toLocaleString()})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
