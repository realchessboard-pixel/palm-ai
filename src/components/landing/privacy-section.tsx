import Link from "next/link";

const points = [
  "Photos are stored privately and are only viewable by you through an authenticated link.",
  "We re-encode every upload and strip location and camera metadata.",
  "Your palm images are never used to train AI models unless you explicitly opt in.",
  "Delete a single reading, or your whole account and all data, at any time.",
];

export function PrivacySection() {
  return (
    <section aria-labelledby="privacy-title" className="px-4 py-20 sm:px-6">
      <div className="glass mx-auto grid max-w-5xl gap-10 rounded-[2rem] p-8 sm:p-12 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">Privacy</p>
          <h2 id="privacy-title" className="mt-3 text-3xl leading-tight sm:text-4xl">
            Your palm is personal. We treat it that way.
          </h2>
          <p className="mt-4 text-mist">
            Hand images are sensitive personal data. We collect only what the reading needs.
          </p>
          <Link
            href="/privacy"
            className="mt-6 inline-block text-sm text-gold-300 underline-offset-4 hover:underline"
          >
            Read our privacy policy
          </Link>
        </div>
        <ul className="space-y-4">
          {points.map((point) => (
            <li key={point} className="flex gap-3 text-parchment/90">
              <svg
                viewBox="0 0 20 20"
                className="mt-0.5 size-5 shrink-0 text-gold-300"
                aria-hidden="true"
              >
                <path
                  d="M5 10.5l3 3 7-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
