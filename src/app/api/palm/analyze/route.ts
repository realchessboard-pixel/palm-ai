import { NextResponse, type NextRequest } from "next/server";
import { ensureGuestKey, getActorFromRequest } from "@/lib/auth/actor";
import { getEnv } from "@/lib/config/env";
import { AppError, withErrorHandling } from "@/lib/http/errors";
import { PipelineTimer } from "@/lib/perf/timing";
import { analyzePalm } from "@/lib/pipeline/analyze";
import { runOnce } from "@/lib/pipeline/idempotency";
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

  const timer = new PipelineTimer("analyze");
  const parseStarted = performance.now();
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
    hand: form.get("hand") ?? undefined,
    consent: form.get("consent"),
    trainingOptIn: form.get("trainingOptIn") ?? undefined,
    requestId: form.get("requestId") ?? undefined,
    role: form.get("role") ?? undefined,
    partnerConsent: form.get("partnerConsent") ?? undefined,
  });
  const partner = fields.role === "partner";

  const guest = actor.user ? null : ensureGuestKey(request, actor);
  const image = Buffer.from(await file.arrayBuffer());
  timer.add("upload_parse", performance.now() - parseStarted);
  // A repeat of a request this actor already sent returns the first run's result.
  // (A brand-new guest has no stable identity yet; the client guards that case.)
  const scope = actor.user
    ? `user:${actor.user.id}`
    : actor.guestKeyHash
      ? `guest:${actor.guestKeyHash}`
      : null;
  const result = await runOnce(scope, fields.requestId, () =>
    analyzePalm({
      timer,
      image,
      hand: fields.hand,
      // A partner's photo is never used for training: only they could agree to that.
      trainingOptIn:
        !partner && (fields.trainingOptIn === "true" || Boolean(actor.user?.trainingOptIn)),
      role: fields.role,
      userId: actor.user?.id ?? null,
      guestKeyHash: guest?.guestKeyHash ?? null,
    }),
  );

  const response = NextResponse.json(result, { status: 201 });
  return guest ? guest.apply(response) : response;
});
