import { msg } from "@/lib/i18n/msg";
import { T } from "@/components/i18n/i18n";
import { getT } from "@/lib/i18n/server";
import { SectionHeading } from "@/components/ui/misc";

const features = [
  {
    title: msg("The four major lines"),
    body: msg(
      "Heart, head, life and fate lines — their length, curvature, depth, breaks and forks, where visible.",
    ),
  },
  {
    title: msg("Parvats & hand shape"),
    body: msg(
      "The seven parvats (mounts) and their planets — Guru, Shani, Surya, Budha, Shukra, Chandra and Mangal — with your hand's shape.",
    ),
  },
  {
    title: msg("Rooted in Indian tradition"),
    body: msg(
      "Read through Hasta Samudrika Shastra and explained like a thoughtful palm reader would — in ten languages.",
    ),
  },
  {
    title: msg("Grounded, never invented"),
    body: msg(
      "Only what can actually be seen in your photo is interpreted. Nothing is made up about lines that weren't visible.",
    ),
  },
  {
    title: msg("Private by design"),
    body: msg(
      "Your photo is stored privately, never public, never used for training without your explicit opt-in.",
    ),
  },
  {
    title: msg("Works beautifully on mobile"),
    body: msg(
      "A guided camera with a palm outline helps you capture a clear, well-lit photo in seconds.",
    ),
  },
];

export async function Features() {
  const tx = await getT();
  return (
    <section aria-labelledby="features-title" className="px-4 py-20 sm:px-6">
      <SectionHeading
        id="features-title"
        eyebrow={tx("What you get")}
        title={tx("A thoughtful, modern palm reading")}
        description={tx("Traditional palmistry, explored with care — and clear about what it is.")}
      />
      <ul className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.title} className="glass rounded-3xl p-6">
            <span
              className="block h-px w-10 bg-gradient-to-r from-gold-300 to-transparent"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-sans text-base font-semibold text-parchment">
              <T s={feature.title} />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              <T s={feature.body} />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
