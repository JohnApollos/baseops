"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  organizationSchema,
  vehicleSchema,
  type OrganizationFormData,
  type VehicleFormData,
} from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Building2,
  Truck,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

// ============================================================
// Onboarding — 3-step flow
// Step 1: Name your organization + slug
// Step 2: Add your first vehicle
// Step 3: Confirmation / redirect to dashboard
// ============================================================

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // ----- Step 1: Organization Form -----
  const orgForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: "", slug: "" },
  });

  // ----- Step 2: Vehicle Form -----
  const vehicleForm = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { registration_plate: "", type: "van" },
  });

  // Auto-generate slug from org name
  function handleNameChange(value: string) {
    orgForm.setValue("name", value);
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    orgForm.setValue("slug", slug);
  }

  // ----- Step 1 Submit: Create Organization -----
  async function handleOrgSubmit(data: OrganizationFormData) {
    setIsLoading(true);
    const supabase = createClient();

    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: data.name, slug: data.slug })
      .select("id")
      .single();

    if (orgError) {
      toast.error(orgError.message);
      setIsLoading(false);
      return;
    }

    // Link the current user to this org
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("profiles")
        .update({ org_id: org.id })
        .eq("id", user.id);
    }

    setOrgId(org.id);
    setIsLoading(false);
    setStep(2);
    toast.success("Organization created!");
  }

  // ----- Step 2 Submit: Add First Vehicle -----
  async function handleVehicleSubmit(data: VehicleFormData) {
    if (!orgId) return;
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("vehicles").insert({
      org_id: orgId,
      registration_plate: data.registration_plate,
      type: data.type,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Mark user as onboarded
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarded_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    setIsLoading(false);
    setStep(3);
    toast.success("Vehicle added! You're all set.");
  }

  // ----- Step 3: Skip vehicle and finish -----
  async function handleSkipVehicle() {
    setIsLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarded_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    setIsLoading(false);
    setStep(3);
  }

  // ----- Step 3: Go to dashboard -----
  function handleFinish() {
    router.push("/dispatch");
    router.refresh();
  }

  // ---- Step indicator ----
  const steps = [
    { num: 1, label: "Organization", icon: Building2 },
    { num: 2, label: "First Vehicle", icon: Truck },
    { num: 3, label: "Ready", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                step >= s.num
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s.num ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                s.num
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 transition-all ${
                  step > s.num ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ----- STEP 1: Organization ----- */}
      {step === 1 && (
        <Card className="border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Name your organization
            </CardTitle>
            <CardDescription>
              This is the logistics company or delivery business you&apos;re
              setting up.
            </CardDescription>
          </CardHeader>
          <form onSubmit={orgForm.handleSubmit(handleOrgSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Company Name</Label>
                <Input
                  id="org-name"
                  placeholder="QuickShip Logistics"
                  {...orgForm.register("name")}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                {orgForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {orgForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">URL Slug</Label>
                <Input
                  id="org-slug"
                  placeholder="quickship"
                  className="font-code"
                  {...orgForm.register("slug")}
                />
                {orgForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">
                    {orgForm.formState.errors.slug.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Your unique identifier: baseops.app/
                  <span className="font-code">
                    {orgForm.watch("slug") || "your-slug"}
                  </span>
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continue
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* ----- STEP 2: First Vehicle ----- */}
      {step === 2 && (
        <Card className="border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Add your first vehicle
            </CardTitle>
            <CardDescription>
              Register a vehicle to your fleet. You can add more later.
            </CardDescription>
          </CardHeader>
          <form onSubmit={vehicleForm.handleSubmit(handleVehicleSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-plate">Registration Plate</Label>
                <Input
                  id="reg-plate"
                  placeholder="KDA 123A"
                  className="font-code uppercase"
                  {...vehicleForm.register("registration_plate")}
                />
                {vehicleForm.formState.errors.registration_plate && (
                  <p className="text-sm text-destructive">
                    {vehicleForm.formState.errors.registration_plate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-type">Vehicle Type</Label>
                <Select
                  defaultValue="van"
                  onValueChange={(value) =>
                    vehicleForm.setValue(
                      "type",
                      value as "motorcycle" | "van" | "truck"
                    )
                  }
                >
                  <SelectTrigger id="vehicle-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motorcycle">🏍️ Motorcycle</SelectItem>
                    <SelectItem value="van">🚐 Van</SelectItem>
                    <SelectItem value="truck">🚚 Truck</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Add Vehicle
              </Button>
            </CardFooter>
          </form>
          <div className="px-6 pb-6">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleSkipVehicle}
            >
              Skip for now
            </Button>
          </div>
        </Card>
      )}

      {/* ----- STEP 3: Ready ----- */}
      {step === 3 && (
        <Card className="border-border/50 shadow-2xl text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-xl">You&apos;re all set!</CardTitle>
            <CardDescription>
              Your organization is ready. Head to your dispatch dashboard to
              start managing deliveries.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleFinish} className="w-full">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
