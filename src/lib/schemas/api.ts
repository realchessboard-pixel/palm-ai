import { z } from "zod";

/** Request schemas for every JSON API endpoint. */

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ message: "Please enter a valid email address." }));

export const PasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That password is too long.");

export const SignupSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().trim().max(80).optional(),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Please enter your password.").max(200),
});

export const IdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+$/i, "Invalid id");

export const ReadingIdBody = z.object({ readingId: IdSchema });

export const HandSchema = z.enum(["left", "right"]);

/** Multipart fields accompanying the uploaded image. */
export const AnalyzeFieldsSchema = z.object({
  hand: HandSchema,
  consent: z.literal("true", { message: "Please confirm consent to continue." }),
  trainingOptIn: z.enum(["true", "false"]).default("false"),
});

export const RazorpayVerifySchema = z.object({
  orderId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100),
  signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export const AccountUpdateSchema = z.object({
  trainingOptIn: z.boolean().optional(),
  name: z.string().trim().max(80).nullable().optional(),
});

export const DeleteAccountSchema = z.object({
  password: z.string().min(1).max(200),
  confirm: z.literal("DELETE"),
});
