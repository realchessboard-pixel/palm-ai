import { NextResponse, type NextRequest } from "next/server";
import { ensureGuestKey, getActorFromRequest } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { AppError, withErrorHandling } from "@/lib/http/errors";
import { analyzePalm } from "@/lib/pipeline/analyze";
import { AnalyzeFieldsSchema } from "@/lib/schemas/api";
import { clientIp, enforceRateLimit } from "@/lib/security/rate-limit";

// Vision calls can take a while; allow up to two minutes on platforms that honour this.
export const maxDuration = 120;

const MULTIPART_OVERHEAD = 64 * 1024;

/**
 * Stage 1: validate + sanitise the uploaded photo, store it privately, and
 * extract observable palm features with the vision model.
 */
export const POST = withErrorHandling("palm.analyze", async (request: NextRequest) => {
  const env = getEnv();
  const actor = await getActorFromRequest(request);
  await enforceRateLimit(
    "analyze",
    actor.user ? `user:${actor.user.id}` : `ip:${clientIp(request)}`,
  );

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > env.MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD) throw new AppError("IMAGE_TOO_LARGE");
  if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    throw new AppError("VALIDATION_ERROR", { message: "Please upload a photo of your palm." });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError("VALIDATION_ERROR", {
      message: "We couldn't read the upload. Please try again.",
    });
  }

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    throw new AppError("IMAGE_INVALID", { message: "Please choose a photo of your palm." });
  }
  if (file.size > env.MAX_UPLOAD_BYTES) throw new AppError("IMAGE_TOO_LARGE");

  const fields = AnalyzeFieldsSchema.parse({
    hand: form.get("hand"),
    consent: form.get("consent"),
    trainingOptIn: form.get("trainingOptIn") ?? undefined,
  });

  const guest = actor.user ? null : ensureGuestKey(request, actor);
  const result = await analyzePalm({
    image: Buffer.from(await file.arrayBuffer()),
    hand: fields.hand,
    trainingOptIn: fields.trainingOptIn === "true" || Boolean(actor.user?.trainingOptIn),
    userId: actor.user?.id ?? null,
    guestKeyHash: guest?.guestKeyHash ?? null,
  });

  const response = NextResponse.json(result, { status: 201 });
  return guest ? guest.apply(response) : response;
});
