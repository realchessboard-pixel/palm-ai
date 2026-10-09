import { T } from "@/components/i18n/i18n";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">404</p>
      <h1 className="mt-3 text-3xl">
        <T s="We couldn't find that page" />
      </h1>
      <p className="mt-3 text-mist">
        <T s="It may have been deleted, or the link may be private to someone else." />
      </p>
      <ButtonLink href="/" className="mt-8">
        <T s="Back home" />
      </ButtonLink>
    </div>
  );
}
