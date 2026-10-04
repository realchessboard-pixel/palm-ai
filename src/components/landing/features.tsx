import { SectionHeading } from "@/components/ui/misc";

const features = [
  {
    title: "The four major lines",
    body: "Heart, head, life and fate lines — their length, curvature, depth, breaks and forks, where visible.",
  },
  {
    title: "Mounts & hand shape",
    body: "The seven traditional mounts, your palm's proportions and the classic elemental hand types.",
  },
  {
    title: "Honest confidence scores",
    body: "We show how confident the image analysis is — never a fake “accuracy” for the reading itself.",
  },
  {
    title: "Grounded interpretations",
    body: "Each insight lists the observed features it draws on. Nothing is invented about lines that weren't seen.",
  },
  {
    title: "Private by design",
    body: "Your photo is stored privately, never public, never used for training without your explicit opt-in.",
  },
  {
    title: "Works beautifully on mobile",
    body: "A guided camera with a palm outline helps you capture a clear, well-lit photo in seconds.",
  },
];

export function Features() {
  return (
    <section aria-labelledby="features-title" className="px-4 py-20 sm:px-6">
      <SectionHeading
        id="features-title"
        eyebrow="What you get"
        title="A thoughtful, modern palm reading"
        description="Traditional palmistry, explored with care — and clear about what it is."
      />
      <ul className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.title} className="glass rounded-3xl p-6">
            <span
              className="block h-px w-10 bg-gradient-to-r from-gold-300 to-transparent"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-sans text-base font-semibold text-parchment">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-mist">{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
