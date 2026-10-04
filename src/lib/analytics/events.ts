import { z } from "zod";

/**
 * The complete list of product analytics events. Properties are restricted to
 * small, non-identifying values — never emails, names, images or free text.
 */
export const ANALYTICS_EVENTS = [
  "landing_page_view",
  "start_reading",
  "image_uploaded",
  "image_rejected",
  "analysis_started",
  "analysis_completed",
  "analysis_failed",
  "reading_viewed",
  "premium_clicked",
  "checkout_started",
  "purchase_completed",
  "report_downloaded",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

const PropertyValue = z.union([z.string().max(64), z.number().finite(), z.boolean()]);

export const AnalyticsEventSchema = z.object({
  name: z.enum(ANALYTICS_EVENTS),
  properties: z
    .record(z.string().regex(/^[a-zA-Z_]{1,32}$/), PropertyValue)
    .refine((p) => Object.keys(p).length <= 8, "Too many properties")
    .optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
