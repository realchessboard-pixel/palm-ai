import { SectionHeading } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export function ExampleReading() {
  return (
    <section aria-labelledby="example-title" className="px-4 py-20 sm:px-6">
      <SectionHeading
        id="example-title"
        eyebrow="Example reading"
        title="What a reading looks like"
        description="An illustrative excerpt — your reading is built from the features detected in your own photo."
      />
      <figure className="card mx-auto mt-12 max-w-3xl overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4 sm:px-8">
          <p className="text-sm text-mist">
            Right hand · <span className="text-parchment">Image analysis confidence: 84%</span>
          </p>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-mist">Sample</span>
        </div>
        <div className="space-y-6 px-6 py-7 sm:px-8">
          <div>
            <h3 className="text-2xl text-gold-200">Your Head Line</h3>
            <p className="mt-2 leading-relaxed text-parchment/90">
              Traditional palmistry associates a long head line with a gentle downward curve with
              imagination balanced by practical thinking — someone who enjoys turning ideas over
              before acting on them.
            </p>
          </div>
          <div>
            <h3 className="text-2xl text-gold-200">Love &amp; Relationships</h3>
            <p className="mt-2 leading-relaxed text-parchment/90">
              A heart line that curves up toward the index finger is traditionally read as warmth
              and openness in relationships, paired with high ideals about the people you let close.
            </p>
          </div>
          <figcaption className="flex flex-wrap gap-2 text-xs text-mist">
            <span className="text-mist-dim">Based on:</span>
            {["Head line · long, moderate curve", "Heart line · curved", "Mount of Jupiter"].map(
              (tag) => (
                <span key={tag} className="rounded-full border border-white/10 px-2.5 py-1">
                  {tag}
                </span>
              ),
            )}
          </figcaption>
        </div>
      </figure>
      <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <ButtonLink href="/example" variant="secondary" size="lg">
          See a full example
        </ButtonLink>
        <ButtonLink href="/read" size="lg">
          Read My Palm
        </ButtonLink>
      </div>
    </section>
  );
}
