// ============================================================
// BaseOps — Zod Validation Schemas
// ============================================================
// Every form in the app is validated using these schemas.
// They are co-located here for reuse across client and server.
// ============================================================

import { z } from "zod/v4";

// ----- Auth Schemas -----

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;

// ----- Onboarding Schemas -----

export const organizationSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters.")
    .max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, numbers, and hyphens only."
    ),
});
export type OrganizationFormData = z.infer<typeof organizationSchema>;

export const vehicleSchema = z.object({
  registration_plate: z
    .string()
    .min(2, "Registration plate is required.")
    .max(20),
  type: z.enum(["motorcycle", "van", "truck"]),
});
export type VehicleFormData = z.infer<typeof vehicleSchema>;

// ----- Parcel Schemas -----

export const parcelSchema = z.object({
  sender_name: z.string().min(2, "Sender name is required."),
  sender_address: z.string().min(5, "Sender address is required."),
  recipient_name: z.string().min(2, "Recipient name is required."),
  recipient_address: z.string().min(5, "Recipient address is required."),
  recipient_phone: z
    .string()
    .min(10, "A valid phone number is required.")
    .max(15),
  weight_kg: z.number().min(0.1, "Weight must be at least 0.1 kg.").max(1000),
  notes: z.string().optional(),
  assigned_driver_id: z.string().uuid().optional(),
  assigned_vehicle_id: z.string().uuid().optional(),
});
export type ParcelFormData = z.infer<typeof parcelSchema>;

// ----- Team Invite Schema -----

export const inviteSchema = z.object({
  email: z.email("Please enter a valid email address."),
  role: z.enum(["dispatcher", "driver"]),
  full_name: z.string().min(2, "Name is required.").optional(),
});
export type InviteFormData = z.infer<typeof inviteSchema>;

// ----- Delivery Event Schema -----

export const deliveryEventSchema = z.object({
  parcel_id: z.string().uuid(),
  event_type: z.enum(["picked_up", "attempted", "delivered", "failed"]),
  notes: z.string().optional(),
  coords: z
    .tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])
    .optional(),
});
export type DeliveryEventFormData = z.infer<typeof deliveryEventSchema>;
