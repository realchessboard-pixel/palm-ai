import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { DELETE as deleteAccount, PATCH as updateAccount } from "@/app/api/account/route";
import { GET as listReadings } from "@/app/api/readings/route";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { sha256 } from "@/lib/auth/crypto";
import { db } from "@/lib/db";
import { hasTestDatabase, resetDatabase } from "../helpers/db";
import { CookieJar, json, makeRequest } from "../helpers/http";

const ctx = { params: Promise.resolve({}) };

async function signUp(
  jar: CookieJar,
  email = "user@example.com",
  password = "correct horse battery",
) {
  const res = await signup(
    makeRequest("/api/auth/signup", { json: { email, password }, jar }),
    ctx,
  );
  jar.absorb(res);
  return res;
}

describe.skipIf(!hasTestDatabase)("authentication", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates an account, hashes the password and starts a session", async () => {
    const jar = new CookieJar();
    const res = await signUp(jar, "  New.User@Example.com ");
    expect(res.status).toBe(201);
    expect((await json(res)).user).toMatchObject({ email: "new.user@example.com" });

    const user = await db.user.findUniqueOrThrow({ where: { email: "new.user@example.com" } });
    expect(user.passwordHash).toMatch(/^scrypt\$/);
    expect(user.passwordHash).not.toContain("correct horse");

    const token = jar.get(SESSION_COOKIE)!;
    expect(token).toBeTruthy();
    const session = await db.session.findUniqueOrThrow({ where: { tokenHash: sha256(token) } });
    expect(session.userId).toBe(user.id);
    // Only the hash is stored.
    expect(await db.session.count({ where: { tokenHash: token } })).toBe(0);

    const cookie = res.headers.getSetCookie().join(";");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it("rejects invalid signup input with field errors", async () => {
    const res = await signup(
      makeRequest("/api/auth/signup", { json: { email: "nope", password: "short" } }),
      ctx,
    );
    expect(res.status).toBe(400);
    const body = await json<{ error: { code: string; details: { fields: { path: string }[] } } }>(
      res,
    );
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fields.map((f) => f.path).sort()).toEqual(["email", "password"]);
  });

  it("refuses duplicate emails", async () => {
    await signUp(new CookieJar());
    const res = await signUp(new CookieJar());
    expect(res.status).toBe(409);
  });

  it("logs in with the right password and rejects the wrong one with the same message", async () => {
    await signUp(new CookieJar());
    const bad = await login(
      makeRequest("/api/auth/login", {
        json: { email: "user@example.com", password: "wrong password!" },
      }),
      ctx,
    );
    const unknown = await login(
      makeRequest("/api/auth/login", {
        json: { email: "ghost@example.com", password: "wrong password!" },
      }),
      ctx,
    );
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect((await json(bad)).error).toEqual((await json(unknown)).error);

    const jar = new CookieJar();
    const ok = await login(
      makeRequest("/api/auth/login", {
        json: { email: "USER@example.com", password: "correct horse battery" },
        jar,
      }),
      ctx,
    );
    expect(ok.status).toBe(200);
    jar.absorb(ok);
    expect(jar.get(SESSION_COOKIE)).toBeTruthy();
  });

  it("rate limits repeated login attempts", async () => {
    let last: Response | undefined;
    for (let i = 0; i < 12; i++) {
      last = await login(
        makeRequest("/api/auth/login", {
          json: { email: "user@example.com", password: "x" },
          headers: { "x-forwarded-for": "203.0.113.9" },
        }),
        ctx,
      );
    }
    expect(last!.status).toBe(429);
    expect(last!.headers.get("retry-after")).toBeTruthy();
  });

  it("requires authentication for protected endpoints and ends the session on logout", async () => {
    const anonymous = await listReadings(makeRequest("/api/readings"), ctx);
    expect(anonymous.status).toBe(401);

    const jar = new CookieJar();
    await signUp(jar);
    expect((await listReadings(makeRequest("/api/readings", { jar }), ctx)).status).toBe(200);

    const out = await logout(makeRequest("/api/auth/logout", { method: "POST", jar }), ctx);
    expect(out.status).toBe(200);
    expect(await db.session.count()).toBe(0);
    // The old token no longer works even if a client keeps sending it.
    expect((await listReadings(makeRequest("/api/readings", { jar }), ctx)).status).toBe(401);
  });

  it("rejects forged or expired session tokens", async () => {
    const jar = new CookieJar();
    await signUp(jar);
    await db.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await listReadings(makeRequest("/api/readings", { jar }), ctx)).status).toBe(401);

    const forged = await listReadings(
      makeRequest("/api/readings", { headers: { cookie: `${SESSION_COOKIE}=${"a".repeat(43)}` } }),
      ctx,
    );
    expect(forged.status).toBe(401);
  });

  it("updates privacy preferences and deletes the account only with the password", async () => {
    const jar = new CookieJar();
    await signUp(jar);
    const patched = await updateAccount(
      makeRequest("/api/account", { method: "PATCH", json: { trainingOptIn: true }, jar }),
      ctx,
    );
    expect((await json(patched)).account).toMatchObject({ trainingOptIn: true });

    const wrong = await deleteAccount(
      makeRequest("/api/account", {
        method: "DELETE",
        json: { password: "not it at all", confirm: "DELETE" },
        jar,
      }),
      ctx,
    );
    expect(wrong.status).toBe(403);
    expect(await db.user.count()).toBe(1);

    const ok = await deleteAccount(
      makeRequest("/api/account", {
        method: "DELETE",
        json: { password: "correct horse battery", confirm: "DELETE" },
        jar,
      }),
      ctx,
    );
    expect(ok.status).toBe(200);
    expect(await db.user.count()).toBe(0);
    expect(await db.session.count()).toBe(0);
  });
});
