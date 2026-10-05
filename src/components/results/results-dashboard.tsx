import Link from "next/link";
import { DeleteReadingButton } from "@/components/account/delete-reading-button";
import { AdSlot, type AdMode } from "@/components/ads/ad-slot";
import { ButtonLink } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { Alert, Card } from "@/components/ui/misc";
import { lineTitle, mountTitle, readingMessages } from "@/lib/i18n/reading-messages";
import { narrativeFor } from "@/lib/readings/narrative-view";
import type { ReadingView } from "@/lib/readings/view";
import { SECTION_IDS } from "@/lib/schemas/palm-interpretation";
import { AnalysisDetails } from "./analysis-details";
import { InterpretationPending } from "./interpretation-pending";
import { LanguageSelector } from "./language-selector";
import { PremiumPanel } from "./premium-panel";
import { ReadingNarrativeView } from "./reading-narrative";
import { Prose, SectionCard } from "./section-card";
import { TranslationLoader } from "./translation-loader";
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
  const lang = reading.language;
  const t = readingMessages(lang);
  const interpretation = reading.interpretation;
  const date = new Date(reading.createdAt).toLocaleDateString(lang, { dateStyle: "long" });
  const main = interpretation ? narrativeFor(interpretation) : null;
  const sections = interpretation
    ? interpretation.sections
        .filter((s) => !main?.usedSections.includes(s.id))
        .sort((a, b) => SECTION_IDS.indexOf(a.id) - SECTION_IDS.indexOf(b.id))
    : [];
  const hasDetailed =
    interpretation !== null &&
    (sections.length > 0 ||
      interpretation.lines.length > 0 ||
      interpretation.mounts.length > 0 ||
      interpretation.fingers !== null ||
      interpretation.markings !== null);

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <header className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div lang={lang}>
            <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">{date}</p>
            <h1 className="mt-2 text-4xl text-parchment sm:text-5xl">{t.yourPalmReading}</h1>
            <p className="mt-2 text-mist">
              {reading.hand === "left" ? t.leftHand : t.rightHand} ·{" "}
              {reading.premium ? t.detailedReading : t.basicReading}
            </p>
          </div>
          {!sample && interpretation ? <LanguageSelector value={lang} label={t.language} /> : null}
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
        {reading.translationPending && !interpretationPending ? (
          <TranslationLoader readingId={reading.id} language={lang} messages={t} />
        ) : null}
      </header>

      {interpretationPending ? (
        <InterpretationPending readingId={reading.id} />
      ) : main ? (
        <ReadingNarrativeView narrative={main.narrative} messages={t} lang={lang} />
      ) : null}

      <Card as="section" className="space-y-6" aria-labelledby="palm-map-title">
        <h2 id="palm-map-title" lang={lang} className="text-2xl">
          {t.palmMap}
        </h2>
        <Visualization
          readingId={reading.id}
          hand={reading.hand}
          lines={reading.lines}
          hasImage={reading.hasImage}
        />
      </Card>

      {hasDetailed && interpretation ? (
        <section lang={lang} aria-labelledby="detailed-title" className="space-y-8">
          <h2 id="detailed-title" className="text-3xl">
            {t.detailedTitle}
          </h2>

          {sections.length > 0 ? (
            <div className="space-y-4">
              {sections.map((section) => (
                <SectionCard key={section.id} section={section} lang={lang} />
              ))}
            </div>
          ) : null}

          {interpretation.lines.length > 0 ? (
            <section aria-labelledby="lines-title" className="space-y-4">
              <h3 id="lines-title" className="text-2xl">
                {t.linesTitle}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {interpretation.lines.map((line) => (
                  <article key={line.line} className="card rounded-3xl p-6">
                    <h4 className="text-xl text-gold-200">{lineTitle(lang, line.line)}</h4>
                    <Prose text={line.summary} className="mt-3" />
                    {line.details ? (
                      <Prose text={line.details} className="mt-3 text-base text-parchment/75" />
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {interpretation.mounts.length > 0 ? (
            <section aria-labelledby="mounts-title" className="space-y-4">
              <h3 id="mounts-title" className="text-2xl">
                {t.mountsTitle}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {interpretation.mounts.map((mount) => (
                  <article key={mount.mount} className="card rounded-3xl p-6">
                    <h4 className="text-lg text-gold-200">{mountTitle(lang, mount.mount)}</h4>
                    <Prose text={mount.summary} className="mt-2" />
                    <Prose text={mount.details} className="mt-2 text-base text-parchment/75" />
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {interpretation.fingers || interpretation.markings ? (
            <div className="grid gap-4 md:grid-cols-2">
              {interpretation.fingers ? (
                <Card as="article">
                  <h3 className="text-xl text-gold-200">{t.fingersTitle}</h3>
                  <Prose text={interpretation.fingers.summary} className="mt-3" />
                  <Prose
                    text={interpretation.fingers.details}
                    className="mt-3 text-base text-parchment/75"
                  />
                </Card>
              ) : null}
              {interpretation.markings ? (
                <Card as="article">
                  <h3 className="text-xl text-gold-200">{t.markingsTitle}</h3>
                  <Prose text={interpretation.markings.summary} className="mt-3" />
                  <Prose
                    text={interpretation.markings.details}
                    className="mt-3 text-base text-parchment/75"
                  />
                </Card>
              ) : null}
            </div>
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

      <AnalysisDetails reading={reading} messages={t} />

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

      <div className="space-y-3">
        {lang !== "en" ? (
          <p lang={lang} className="text-sm leading-relaxed text-mist">
            {t.traditionNote}
          </p>
        ) : null}
        <Disclaimer />
      </div>
    </div>
  );
}
