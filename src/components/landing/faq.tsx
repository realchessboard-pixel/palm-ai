import { SectionHeading } from "@/components/ui/misc";

export const FAQ_ITEMS = [
  {
    q: "Is an AI palm reading accurate?",
    a: "Palmistry is a cultural tradition, not a science, so no palm reading — human or AI — can accurately predict your future. What we measure is how confidently the AI could see features in your photo. The reading itself is for entertainment and reflection.",
  },
  {
    q: "Which hand does PalmAI read?",
    a: "Your right hand. PalmAI follows the traditional practice of reading the right palm, so just show us your right palm — there's no need to choose.",
  },
  {
    q: "How do I take a good palm photo?",
    a: "Use bright, even light (daylight near a window is ideal), open your hand with fingers relaxed and slightly apart, and hold the camera directly above your palm so the whole hand fits in the frame.",
  },
  {
    q: "What happens to my photo?",
    a: "It's re-encoded without metadata and stored privately. Only you can view it, and you can delete it — or your entire account — at any time. We never use it to train AI models without your explicit opt-in.",
  },
  {
    q: "What's included for free?",
    a: "Every reading includes your full main reading: the way you think, the way you care, your natural strengths, your career nature and something interesting about you. The detailed reading adds love, money, life path, strengths and challenges in depth, every major line, the parvats (mounts), fingers and thumb, markings, and a downloadable PDF.",
  },
  {
    q: "Will the reading tell me about my health or lifespan?",
    a: "No. We deliberately never make medical, lifespan, pregnancy or guaranteed financial claims. Palmistry cannot tell you these things.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <SectionHeading id="faq-title" eyebrow="FAQ" title="Questions, answered honestly" />
      <div className="mx-auto mt-12 max-w-3xl space-y-3">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="group card rounded-2xl px-6 py-1 open:pb-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-parchment [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-gold-300 transition-transform group-open:rotate-45"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <p className="leading-relaxed text-mist">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
