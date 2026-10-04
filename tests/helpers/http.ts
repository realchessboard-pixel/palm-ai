import { NextRequest } from "next/server";

const BASE = "http://localhost:3000";

export class CookieJar {
  private cookies = new Map<string, string>();

  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  absorb(response: Response): void {
    for (const raw of response.headers.getSetCookie()) {
      const [pair, ...attrs] = raw.split(";");
      const [name, ...rest] = pair.split("=");
      const value = rest.join("=");
      const expired = attrs.some(
        (a) => /max-age=0/i.test(a) || /expires=thu, 01 jan 1970/i.test(a),
      );
      if (!value || expired) this.cookies.delete(name.trim());
      else this.cookies.set(name.trim(), value);
    }
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }
}

export function makeRequest(
  path: string,
  init: {
    method?: string;
    json?: unknown;
    body?: BodyInit;
    headers?: Record<string, string>;
    jar?: CookieJar;
  } = {},
): NextRequest {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  if (init.jar) headers.set("cookie", init.jar.header());
  return new NextRequest(new URL(path, BASE), {
    method: init.method ?? (init.json !== undefined || init.body ? "POST" : "GET"),
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
}

export function params<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) };
}

export async function json<T = Record<string, unknown>>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
