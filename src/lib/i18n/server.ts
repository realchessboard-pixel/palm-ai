import "server-only";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, isLanguage, parseLanguage, type Language } from "./languages";

/** The visitor's language: an explicit ?lang= wins, then the saved choice, then English. */
export async function getLanguage(explicit?: string | null): Promise<Language> {
  if (isLanguage(explicit)) return explicit;
  const saved = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  return parseLanguage(saved);
}

/** Whether the visitor has chosen a language yet (to show the first-visit picker). */
export async function hasChosenLanguage(): Promise<boolean> {
  return isLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value);
}

/** Same as getLanguage, for API routes: read the cookie from the request itself. */
export function languageFromRequest(request: {
  cookies: { get(name: string): { value: string } | undefined };
}): Language {
  return parseLanguage(request.cookies.get(LANGUAGE_COOKIE)?.value);
}
