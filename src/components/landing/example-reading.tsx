import { SectionHeading } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export function ExampleReading() {
  return (
    <section aria-labelledby="example-title" className="px-4 py-20 sm:px-6">
      <SectionHeading
        id="example-title"
        eyebrow="Example reading"
        title="What a reading feels like"
        description="An illustrative excerpt — your reading is written from the features seen in your own palm."
      />
      <figure className="card mx-auto mt-12 max-w-3xl overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4 sm:px-8">
          <p className="text-sm text-mist">Right hand · Basic reading</p>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-mist">Sample</span>
        </div>
        <div className="space-y-7 px-6 py-7 sm:px-8">
          <h3 className="text-2xl leading-snug text-gold-200 sm:text-3xl">
            A thoughtful mind with a quietly independent nature
          </h3>
          <div>
            <h4 className="text-xl text-parchment">The way you think</h4>
            <div className="reading-prose mt-2 text-parchment/90">
              <p>
                Your Head Line, the Mastishka Rekha, is one of the clearer features of your palm.
                Traditionally, a long line with a gentle downward curve is read as imagination held
                in balance by practical sense — someone who enjoys turning an idea over before
                acting on it.
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-xl text-parchment">Something interesting about you</h4>
            <div className="reading-prose mt-2 text-parchment/90">
              <p>
                There is an interesting balance in this palm. A full Shukra Parvat speaks of warmth
                and affection, while your heart line suggests you take your time before becoming
                truly close to someone. Traditionally, this is read as a heart that is generous but
                chooses carefully.
              </p>
            </div>
          </div>
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
