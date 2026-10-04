import Link from "next/link";
import { DeleteReadingButton } from "@/components/account/delete-reading-button";
import { AdSlot, type AdMode } from "@/components/ads/ad-slot";
import { ButtonLink } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { Alert, Card } from "@/components/ui/misc";
import { lineLabel, mountLabel } from "@/lib/palmistry/features";
import type { ReadingView } from "@/lib/readings/view";
import { SECTION_IDS } from "@/lib/schemas/palm-interpretation";
import { ConfidenceMeter } from "./confidence-meter";
import { InterpretationPending } from "./interpretation-pending";
import { PremiumPanel } from "./premium-panel";
import { BasedOn, Paragraphs, SectionCard } from "./section-card";
import { Visualization } from "./visualization";

export interface ResultsDashboardProps {
  reading: ReadingView;
  priceLabel: string;
  paymentsEnabled: boolean;
  signedIn: boolean;
  /** Public sample page: show a sample banner and hide account/purchase actions. */
  sample?: boolean;
  /** Analysis is done but the interpretation is still being written (shown progressively). */
  interpretationPending?: boolean;
  /** Ads for free readings: "off" (default) or a development placeholder. */
  adMode?: AdMode;
}

export function ResultsDashboard({
  reading,
  priceLabel,
  paymentsEnabled,
  signedIn,
  sample = false,
  interpretationPending = false,
  adMode = "off",
}: ResultsDashboardProps) {
  const interpretation = reading.interpretation;
  const date = new Date(reading.createdAt).toLocaleDateString("en", { dateStyle: "long" });
  const sections = interpretation
    ? [...interpretation.sections].sort(
        (a, b) => SECTION_IDS.indexOf(a.id) - SECTION_IDS.indexOf(b.id),
      )
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <header className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">{date}</p>
          <h1 className="mt-2 text-4xl text-parchment sm:text-5xl">Your Palm Reading</h1>
          <p className="mt-2 text-mist">
            {reading.hand === "left" ? "Left" : "Right"} hand analyzed
            {reading.premium ? " · Detailed reading" : " · Basic reading"}
          </p>
        </div>
        {sample ? (
          <Alert tone="info" title="Sample reading">
            This example is generated from built-in sample palm features to show what a full report
            looks like.
          </Alert>
        ) : null}
        {reading.isDemo ? (
          <Alert tone="warning" title="Demo mode">
            This reading uses built-in sample palm features, not an analysis of your photo, because
            no AI provider is configured on this server.
          </Alert>
        ) : null}
        {reading.handCheck?.strongMismatch && !sample ? (
          <Alert tone="warning" title="Please confirm your photo">
            You selected your {reading.hand} hand, but the photo may show a{" "}
            {reading.handCheck.detected} hand (photos from front cameras are often mirrored). This
            reading uses your selection — your {reading.hand} hand. If you uploaded the other hand
            by mistake,{" "}
            <Link href="/read" className="underline underline-offset-2">
              start a new reading
            </Link>
            .
          </Alert>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
          <ConfidenceMeter value={reading.analysisConfidence} />
          {interpretationPending ? (
            <InterpretationPending readingId={reading.id} />
          ) : interpretation ? (
            <div className="glass rounded-3xl p-6">
              <h2 className="text-2xl text-gold-200">{interpretation.overview.headline}</h2>
              <p className="mt-2 leading-relaxed text-parchment/85">
                {interpretation.overview.summary}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <Card as="section" className="space-y-6">
        <h2 className="text-2xl">Palm visualization</h2>
        <Visualization
          readingId={reading.id}
          hand={reading.hand}
          lines={reading.lines}
          hasImage={reading.hasImage}
        />
      </Card>

      {reading.features.length > 0 ? (
        <section aria-labelledby="findings-title">
          <h2 id="findings-title" className="text-2xl">
            Major findings
          </h2>
          <p className="mt-1 text-sm text-mist">
            Features the AI could see, with its confidence in each observation.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {reading.features.slice(0, 12).map((f) => (
              <li
                key={f.key}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm"
              >
                <span className="text-parchment">{f.label}</span>
                <span className="ml-2 text-xs text-mist">{Math.round(f.confidence * 100)}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {interpretation && interpretation.lines.length > 0 ? (
        <section aria-labelledby="lines-title" className="space-y-4">
          <h2 id="lines-title" className="text-2xl">
            Your major lines
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {interpretation.lines.map((line) => (
              <article
                key={line.line}
                className="card rounded-3xl p-6"
                aria-labelledby={`line-${line.line}`}
              >
                <h3 id={`line-${line.line}`} className="text-xl text-gold-200">
                  Your {lineLabel(line.line)}
                </h3>
                <p className="mt-3 leading-relaxed text-parchment/90">{line.summary}</p>
                {line.details ? (
                  <div className="mt-3 text-sm">
                    <Paragraphs text={line.details} />
                  </div>
                ) : null}
                <div className="mt-4">
                  <BasedOn keys={line.basedOn} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {sections.length > 0 ? (
        <section aria-label="Reading" className="space-y-4">
          {sections.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </section>
      ) : null}

      {interpretation && interpretation.mounts.length > 0 ? (
        <section aria-labelledby="mounts-title" className="space-y-4">
          <h2 id="mounts-title" className="text-2xl">
            Palm mounts
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {interpretation.mounts.map((mount) => (
              <article key={mount.mount} className="card rounded-3xl p-6">
                <h3 className="text-lg text-gold-200">{mountLabel(mount.mount)}</h3>
                <p className="mt-2 leading-relaxed text-parchment/90">{mount.summary}</p>
                <p className="mt-2 text-sm leading-relaxed text-mist">{mount.details}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {interpretation?.fingers || interpretation?.markings ? (
        <section className="grid gap-4 md:grid-cols-2" aria-label="Fingers and markings">
          {interpretation.fingers ? (
            <Card as="article">
              <h2 className="text-xl text-gold-200">Fingers &amp; thumb</h2>
              <p className="mt-3 leading-relaxed text-parchment/90">
                {interpretation.fingers.summary}
              </p>
              <div className="mt-3 text-sm">
                <Paragraphs text={interpretation.fingers.details} />
              </div>
              <div className="mt-4">
                <BasedOn keys={interpretation.fingers.basedOn} />
              </div>
            </Card>
          ) : null}
          {interpretation.markings ? (
            <Card as="article">
              <h2 className="text-xl text-gold-200">Markings</h2>
              <p className="mt-3 leading-relaxed text-parchment/90">
                {interpretation.markings.summary}
              </p>
              <div className="mt-3 text-sm">
                <Paragraphs text={interpretation.markings.details} />
              </div>
            </Card>
          ) : null}
        </section>
      ) : null}

      {reading.locked && !interpretationPending ? (
        <>
          {/* Free results only, after the reading itself — never during analysis or loading. */}
          {sample ? null : <AdSlot placement="free-reading-result" mode={adMode} />}
          <PremiumPanel
            readingId={reading.id}
            locked={reading.locked}
            priceLabel={priceLabel}
            paymentsEnabled={paymentsEnabled}
            paymentState={reading.paymentState}
          />
        </>
      ) : null}

      {sample ? (
        <div className="text-center">
          <ButtonLink href="/read" size="lg">
            Read My Palm
          </ButtonLink>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {reading.premium && !interpretationPending ? (
            <ButtonLink
              href={`/api/readings/${reading.id}/report`}
              prefetch={false}
              variant="primary"
            >
              Download PDF report
            </ButtonLink>
          ) : null}
          <ButtonLink href="/read" variant="secondary">
            Read another palm
          </ButtonLink>
          {signedIn ? (
            <ButtonLink href="/readings" variant="ghost">
              All your readings
            </ButtonLink>
          ) : null}
          <DeleteReadingButton readingId={reading.id} redirectTo={signedIn ? "/readings" : "/"} />
        </div>
      )}

      {!signedIn && !sample ? (
        <Alert tone="info" title="Keep this reading">
          This reading is linked to this browser only.{" "}
          <Link
            href={`/signup?next=/readings/${reading.id}`}
            className="text-gold-300 underline underline-offset-2"
          >
            Create a free account
          </Link>{" "}
          to save it to your reading history.
        </Alert>
      ) : null}

      <Disclaimer />
    </div>
  );
}
