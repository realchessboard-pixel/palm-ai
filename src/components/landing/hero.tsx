import { T } from "@/components/i18n/i18n";
import { ButtonLink } from "@/components/ui/button";
import { PalmIllustration } from "@/components/palm/palm-illustration";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        className="starfield pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-20 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pt-20 md:pb-28">
        <div className="animate-fade-up text-center md:text-left">
          <p className="eyebrow">
            <T s="Palm · Kundli · Rashifal · in your language" />
          </p>
          <h1
            id="hero-title"
            className="mt-6 text-[2.6rem] leading-[1.05] font-medium text-parchment sm:text-6xl lg:text-7xl"
          >
            <T
              s="Your {0} and your stars, read the Indian way"
              v={[
                <span key={0} className="text-gold-gradient italic">
                  <T s="palm" />
                </span>,
              ]}
            />
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-mist md:mx-0">
            <T s="A warm palm reading from a photo of your hand, your free Kundli and Kundli Milan, today's rashifal and panchang — and readers to answer your questions." />
          </p>
          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center md:justify-start">
            <ButtonLink href="/read" size="lg">
              <T
                s="Read My Palm{0}"
                v={[
                  <svg key={0} viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                    <path
                      d="M4 10h11m-4-4 4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>,
                ]}
              />
            </ButtonLink>
            <ButtonLink href="/kundli" variant="secondary" size="lg">
              <T s="Free Kundli" />
            </ButtonLink>
          </div>
          <p className="mt-6 text-xs text-mist-dim">
            <T s="Free to start · Your photo stays private · For reflection, not prediction" />
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-[22rem] md:max-w-md">
          <PalmIllustration className="h-auto w-full" />
        </div>
      </div>
    </section>
  );
}
