"use client";

import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { track } from "@/lib/analytics/client";
import { ApiClientError, postJson } from "@/lib/api-client";

export type ClientAdMode = "off" | "test" | "gam";

/* Minimal typing for Google Publisher Tag's rewarded ads. */
interface GptEvent {
  slot: unknown;
  makeRewardedVisible?: () => void;
  isEmpty?: boolean;
}
interface GoogleTag {
  cmd: Array<() => void>;
  defineOutOfPageSlot(unit: string, format: unknown): { addService(s: unknown): unknown } | null;
  enums: { OutOfPageFormat: { REWARDED: unknown } };
  pubads(): { addEventListener(name: string, cb: (e: GptEvent) => void): void };
  enableServices(): void;
  display(slot: unknown): void;
  destroySlots(slots?: unknown[]): void;
}
declare global {
  interface Window {
    googletag?: GoogleTag;
  }
}

const TEST_AD_SECONDS = 15;

function loadGpt(): Promise<GoogleTag> {
  return new Promise((resolve, reject) => {
    window.googletag = window.googletag ?? ({ cmd: [] } as unknown as GoogleTag);
    if (!document.getElementById("gpt-js")) {
      const s = document.createElement("script");
      s.id = "gpt-js";
      s.async = true;
      s.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
      s.onerror = () => reject(new Error("blocked"));
      document.head.appendChild(s);
    }
    window.googletag.cmd.push(() => resolve(window.googletag!));
  });
}

/**
 * The visitor's own choice: watch one short ad for one extra free palm reading
 * today. `onRewarded` runs only after the ad finished and the server recorded it.
 */
export function RewardedAd({
  mode,
  adUnit,
  onRewarded,
}: {
  mode: ClientAdMode;
  adUnit?: string | null;
  onRewarded: () => void;
}) {
  const tx = useT();
  const [state, setState] = useState<"idle" | "loading" | "playing" | "saving">("idle");
  const [left, setLeft] = useState(TEST_AD_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  if (mode === "off") return null;

  async function claim() {
    setState("saving");
    try {
      await postJson("/api/ads/reward", {});
      track("rewarded_ad_completed", { mode });
      onRewarded();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : tx("Please try again."));
      setState("idle");
    }
  }

  function playTest() {
    setState("playing");
    let n = TEST_AD_SECONDS;
    setLeft(n);
    timer.current = setInterval(() => {
      n -= 1;
      setLeft(n);
      if (n <= 0) {
        clearInterval(timer.current!);
        void claim();
      }
    }, 1000);
  }

  async function playGam() {
    setState("loading");
    try {
      const gt = await loadGpt();
      const slot = gt.defineOutOfPageSlot(adUnit!, gt.enums.OutOfPageFormat.REWARDED);
      if (!slot) {
        setError(tx("Ads aren't supported on this browser. Please come back tomorrow."));
        setState("idle");
        return;
      }
      slot.addService(gt.pubads());
      let granted = false;
      gt.pubads().addEventListener("rewardedSlotReady", (e) => {
        setState("playing");
        e.makeRewardedVisible?.();
      });
      gt.pubads().addEventListener("rewardedSlotGranted", () => {
        granted = true;
      });
      gt.pubads().addEventListener("rewardedSlotClosed", () => {
        gt.destroySlots([slot]);
        if (granted) void claim();
        else setState("idle");
      });
      gt.pubads().addEventListener("slotRenderEnded", (e) => {
        if (e.slot === slot && e.isEmpty) {
          setError(tx("No ad is available right now. Please try again later."));
          setState("idle");
        }
      });
      gt.enableServices();
      gt.display(slot);
    } catch {
      setError(tx("The ad couldn't load (an ad blocker may be on). Please try again later."));
      setState("idle");
    }
  }

  return (
    <div className="paper-card space-y-3 p-5">
      <p className="font-medium">
        <T s="Want 1 more free palm reading today?" />
      </p>
      <p className="text-sm text-mist">
        <T s="Watch one short ad and your reading starts right after. It's your choice — you can also just come back tomorrow." />
      </p>
      {error ? (
        <Alert tone="error">
          <T s={error} />
        </Alert>
      ) : null}
      {state === "playing" && mode === "test" ? (
        <div
          role="status"
          className="rounded-2xl border border-dashed border-[var(--rule)] p-6 text-center"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase">
            <T s="Test ad" />
          </p>
          <p className="mt-2 text-sm text-mist">
            <T s="No real ad is shown in test mode." />
          </p>
          <p className="mt-3 text-2xl tabular-nums">{left}s</p>
        </div>
      ) : (
        <Button
          variant="secondary"
          disabled={state !== "idle"}
          onClick={() => {
            setError(null);
            track("rewarded_ad_started", { mode });
            if (mode === "test") playTest();
            else void playGam();
          }}
        >
          {state === "idle" ? tx("▶ Watch a short ad for 1 more reading") : tx("Loading…")}
        </Button>
      )}
    </div>
  );
}
