// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisProgress } from "@/components/reading-flow/analysis-progress";
import { PhotoReview } from "@/components/reading-flow/photo-review";
import { ReadingFlow } from "@/components/reading-flow/reading-flow";
import { InterpretationPending } from "@/components/results/interpretation-pending";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { issue } from "@/lib/image/quality";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import type { Language } from "@/lib/i18n/languages";
import { buildReadingView } from "@/lib/readings/build-view";

const push = vi.fn();
const refresh = vi.fn();
// Like Next's, the router object is stable across renders.
const router = { push, refresh, replace: vi.fn(), prefetch: vi.fn() };
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/read",
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
});
afterEach(() => {
  searchParams = new URLSearchParams();
  localStorage.clear();
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function readingView(
  premium: boolean,
  extra: { language?: Language; translationPending?: boolean } = {},
) {
  const analysis = sampleAnalysis("right");
  return buildReadingView({
    ...extra,
    reading: {
      id: "r1",
      hand: "RIGHT",
      status: "COMPLETE",
      createdAt: new Date("2026-10-01T12:00:00Z"),
      isDemo: false,
      imageKey: "palms/2026/10/x.jpg",
      analysisConfidence: 0.87,
      rejectionReason: null,
    },
    analysis,
    interpretation: composeRuleBasedReading(analysis),
    premium,
  });
}

describe("reading flow", () => {
  it("goes straight to the right-palm photo step, with no hand choice", () => {
    render(<ReadingFlow />);
    expect(screen.getByRole("heading", { name: "Show us your right palm" })).toBeInTheDocument();
    expect(screen.getByText(/Place your right hand clearly inside the frame/)).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/left hand|which hand/i);
    expect(screen.getByRole("button", { name: /Take photo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose from gallery" })).toBeInTheDocument();
  });

  it("rejects unsupported file types with a helpful message", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ReadingFlow />);
    const input = screen.getByLabelText("Upload a palm photo");
    await user.upload(input, new File(["%PDF-1.4"], "palm.pdf", { type: "application/pdf" }));
    expect(
      await screen.findByText("Please upload a JPG, JPEG, PNG or WebP image."),
    ).toBeInTheDocument();
  });

  it("blocks unusable photos and explains why", () => {
    render(
      <PhotoReview
        previewUrl="blob:x"
        issues={[issue("too_dark", "block")]}
        onRetake={vi.fn()}
        onUse={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Your palm is too dark. Try taking the photo in brighter light."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use photo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retake" })).toBeEnabled();
  });

  it("requires consent and keeps training opt-in off by default", async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    render(<PhotoReview previewUrl="blob:x" issues={[]} onRetake={vi.fn()} onUse={onUse} />);

    await user.click(screen.getByRole("button", { name: "Use photo" }));
    expect(onUse).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Please confirm to continue.");

    await user.click(screen.getByLabelText(/This is my hand/));
    await user.click(screen.getByRole("button", { name: "Use photo" }));
    expect(onUse).toHaveBeenCalledWith({ trainingOptIn: false });
  });

  it("shows real progress stages: the single vision pass runs its three steps together", () => {
    const { rerender } = render(<AnalysisProgress phase="analyzing" />);
    const items = () =>
      within(screen.getByRole("list", { name: "Analysis progress" })).getAllByRole("listitem");
    expect(items().map((s) => s.textContent)).toEqual([
      "Examining your palm (in progress)",
      "Identifying major lines (in progress)",
      "Reading palm features (in progress)",
      "4Preparing your interpretation",
    ]);
    expect(screen.getByRole("heading", { name: "Examining your palm…" })).toBeInTheDocument();

    rerender(<AnalysisProgress phase="analyzed" />);
    expect(items().map((s) => s.textContent)).toEqual([
      "✓Examining your palm (complete)",
      "✓Identifying major lines (complete)",
      "✓Reading palm features (complete)",
      "Preparing your interpretation (in progress)",
    ]);
    expect(
      screen.getByRole("heading", { name: "Preparing your interpretation…" }),
    ).toBeInTheDocument();
  });

  it("does not advance progress on a timer", () => {
    vi.useFakeTimers();
    try {
      render(<AnalysisProgress phase="analyzing" />);
      act(() => vi.advanceTimersByTime(60_000));
      expect(screen.getByText(/Preparing your interpretation/).closest("li")).not.toHaveTextContent(
        "in progress",
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("results dashboard", () => {
  it("reads like a palm reading, not a technical report", () => {
    render(
      <ResultsDashboard
        reading={readingView(false)}
        priceLabel="₹35"
        paymentsEnabled
        signedIn={false}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Your Palm Reading" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Right hand · Basic reading/)).toBeInTheDocument();
    const reading = screen.getByRole("article", { name: /mind/i });
    for (const name of [
      "The way you think",
      "The way you care",
      "Your natural strengths",
      "Your career nature",
    ]) {
      expect(within(reading).getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(within(reading).getByText("Something interesting about you")).toBeInTheDocument();
    // No scores, citations or AI language in the reading itself.
    expect(reading.textContent).not.toMatch(/confidence|Feature emphasis|%|\bAI\b/i);
    expect(reading.textContent).not.toContain("Based on:");
    expect(document.body.textContent).not.toMatch(/prediction accuracy|Image Analysis Confidence/i);
    // Long-form text is justified.
    expect(reading.querySelector(".reading-prose p")).not.toBeNull();
  });

  it("keeps technical details in a collapsed Analysis details section", () => {
    render(
      <ResultsDashboard
        reading={readingView(false)}
        priceLabel="₹35"
        paymentsEnabled
        signedIn={false}
      />,
    );
    const details = screen.getByText("Analysis details").closest("details")!;
    expect(details).not.toHaveAttribute("open");
    expect(details.textContent).toContain("Overall image clarity · 87%");
    expect(details.textContent).toMatch(/Head line · \d+%/);
  });

  it("free readings show the main reading and an unlock option, without the detailed reading", () => {
    render(
      <ResultsDashboard
        reading={readingView(false)}
        priceLabel="₹35"
        paymentsEnabled
        signedIn={false}
      />,
    );
    expect(
      screen.queryByRole("heading", { name: "Your detailed reading" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /parvats/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unlock Detailed Reading — ₹35" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Download PDF report" })).not.toBeInTheDocument();
    expect(screen.getByText(/Create a free account/)).toBeInTheDocument();
  });

  it("detailed readings show every section, lines with their rekha, parvats, and the PDF", () => {
    render(
      <ResultsDashboard reading={readingView(true)} priceLabel="₹35" paymentsEnabled signedIn />,
    );
    expect(screen.getByText(/Right hand · Detailed reading/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your detailed reading" })).toBeInTheDocument();
    for (const name of ["Love & Relationships", "Money & Success", "Life Path", "Challenges"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Heart Line · Hridaya Rekha" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The parvats (mounts) of your palm" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Shukra Parvat · Mount of Venus" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download PDF report" })).toHaveAttribute(
      "href",
      "/api/readings/r1/report",
    );
    expect(
      screen.queryByRole("button", { name: /Unlock Detailed Reading/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Based on:")).not.toBeInTheDocument();
  });

  it("mentions a likely left-hand photo only quietly, inside Analysis details", () => {
    const view = readingView(false);
    view.handCheck = {
      canonical: "right",
      detected: "left",
      detectedConfidence: 0.95,
      mismatch: true,
      strongMismatch: true,
    };
    render(<ResultsDashboard reading={view} priceLabel="₹35" paymentsEnabled signedIn={false} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const details = screen.getByText("Analysis details").closest("details")!;
    expect(details.textContent).toMatch(/might show a left hand/);
    expect(screen.getByText(/Right hand · Basic reading/)).toBeInTheDocument();
  });

  it("shows headings in the reader's language and offers the language selector", () => {
    render(
      <ResultsDashboard
        reading={readingView(false, { language: "hi" })}
        priceLabel="₹35"
        paymentsEnabled
        signedIn={false}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "आपकी हस्तरेखा" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "आपके सोचने का ढंग" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /mind/i })).toHaveAttribute("lang", "hi");
    const select = screen.getByLabelText("भाषा");
    expect(select).toHaveValue("hi");
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual([
      "English",
      "हिन्दी",
      "বাংলা",
      "मराठी",
      "తెలుగు",
      "தமிழ்",
      "ગુજરાતી",
      "ಕನ್ನಡ",
      "മലയാളം",
      "ਪੰਜਾਬੀ",
      "ଓଡ଼ିଆ",
      "Deutsch",
      "Español",
      "Français",
      "Português",
      "Italiano",
      "Bahasa Indonesia",
      "日本語",
      "한국어",
    ]);
  });

  it("switching language changes the URL (the reading is never re-analysed) and is remembered", async () => {
    const user = userEvent.setup();
    render(
      <ResultsDashboard
        reading={readingView(false)}
        priceLabel="₹35"
        paymentsEnabled
        signedIn={false}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Language"), "de");
    expect(push).toHaveBeenCalledWith("/read?lang=de", { scroll: false });
    expect(localStorage.getItem("palmai.language")).toBe("de");
  });

  it("requests a missing translation once, then refreshes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ translated: 12 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <ResultsDashboard
        reading={readingView(false, { language: "ja", translationPending: true })}
        priceLabel="₹35"
        paymentsEnabled
        signedIn={false}
      />,
    );
    expect(screen.getAllByText("鑑定を翻訳しています…").length).toBeGreaterThan(0);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls.find(([u]) => String(u).includes("/translation"))!;
    expect(url).toBe("/api/readings/r1/translation");
    expect(JSON.parse(String(init.body))).toEqual({ language: "ja" });
  });

  it("explains that the diagram is illustrative", () => {
    render(
      <ResultsDashboard
        reading={readingView(false)}
        priceLabel="₹35"
        paymentsEnabled
        signedIn={false}
      />,
    );
    expect(screen.getByText(/line positions are illustrative/)).toBeInTheDocument();
  });
});

describe("progressive results", () => {
  it("shows the palm map and analysis details while the interpretation is written", () => {
    const view = readingView(false);
    view.status = "ANALYZED";
    view.interpretation = null;
    render(
      <ResultsDashboard
        reading={view}
        priceLabel="₹35"
        paymentsEnabled
        signedIn={false}
        interpretationPending
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Preparing your interpretation…" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your palm map" })).toBeInTheDocument();
    expect(screen.getByText("Analysis details")).toBeInTheDocument();
    // Nothing to buy or download until the reading exists.
    expect(screen.queryByRole("button", { name: /Unlock/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Download PDF report" })).not.toBeInTheDocument();
  });

  it("requests the interpretation, waits while another request is writing it, then refreshes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "CONFLICT", message: "busy" } }), {
          status: 409,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ readingId: "r1", status: "COMPLETE" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<InterpretationPending readingId="r1" />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      await act(() => vi.advanceTimersByTimeAsync(3_000));
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ readingId: "r1" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("quietly retries temporary failures before bothering the user", async () => {
    const busy = () =>
      new Response(JSON.stringify({ error: { code: "AI_UNAVAILABLE", message: "busy" } }), {
        status: 503,
      });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(busy())
      .mockResolvedValueOnce(busy())
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "COMPLETE" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<InterpretationPending readingId="r1" />);
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers a retry when the interpretation fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: "NOT_FOUND", message: "Please try again." } }),
          { status: 404 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "COMPLETE" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<InterpretationPending readingId="r1" />);
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
