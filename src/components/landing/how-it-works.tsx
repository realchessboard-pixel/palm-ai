import { msg } from "@/lib/i18n/msg";
import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import { SectionHeading } from "@/components/ui/misc";

const steps = [
  {
    title: msg("Photograph your palm"),
    body: msg(
      "Show us your right palm: take a photo with our palm guide or upload one you already have.",
    ),
    icon: "M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  },
  {
    title: msg("Your palm is studied"),
    body: msg(
      "First we carefully note only what can be seen: the shape of your hand, your fingers, the major lines and the parvats (mounts).",
    ),
    icon: "M3 12h3l3-7 4 14 3-7h5",
  },
  {
    title: msg("Receive your reading"),
    body: msg(
      "Those observations are read through traditional Indian palmistry, Hasta Samudrika Shastra — warmly, personally, and in your language.",
    ),
    icon: "M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h5",
  },
];

export async function HowItWorks() {
  const tx = await getT();
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="scroll-mt-20 px-4 py-20 sm:px-6"
    >
      <SectionHeading
        id="how-title"
        eyebrow={tx("How it works")}
        title={tx("Three simple steps")}
        description={tx(
          "Observation first, interpretation second. We separate the two so the reading never describes lines that weren't actually seen.",
        )}
      />
      <ol className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="card relative rounded-3xl p-7">
            <span
              className="absolute top-6 right-6 font-display text-5xl text-white/5"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-gold-400/25 bg-gold-400/10 text-gold-300">
              <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
                <path
                  d={step.icon}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h3 className="mt-5 text-xl text-parchment">
              <span className="sr-only">
                <T s="Step {0}:" v={[index + 1]} />
              </span>
              <T s={step.title} />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              <T s={step.body} />
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
