import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
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
          <Badge>
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
              <path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6z" fill="currentColor" />
            </svg>
            AI-powered palmistry
          </Badge>
          <h1
            id="hero-title"
            className="mt-6 text-[2.6rem] leading-[1.05] font-medium text-parchment sm:text-6xl lg:text-7xl"
          >
            Discover What Your <span className="text-gold-gradient italic">Palm</span> Reveals
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-mist md:mx-0">
            Upload a clear photo of your palm and explore a personalized palmistry reading powered
            by AI.
          </p>
          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center md:justify-start">
            <ButtonLink href="/read" size="lg">
              Read My Palm
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                <path
                  d="M4 10h11m-4-4 4 4-4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary" size="lg">
              How It Works
            </ButtonLink>
          </div>
          <p className="mt-6 text-xs text-mist-dim">
            Free basic reading · Your photo stays private · For entertainment &amp; reflection
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-[22rem] md:max-w-md">
          <PalmIllustration className="h-auto w-full animate-float drop-shadow-[0_30px_60px_rgba(124,105,232,0.25)]" />
        </div>
      </div>
    </section>
  );
}
