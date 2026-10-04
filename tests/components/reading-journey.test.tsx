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
import { buildReadingView } from "@/lib/readings/build-view";

const push = vi.fn();
const refresh = vi.fn();
// Like Next's, the router object is stable across renders.
const router = { push, refresh, replace: vi.fn(), prefetch: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/read",
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function readingView(premium: boolean) {
  const analysis = sampleAnalysis("right");
  return buildReadingView({
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
  it("requires choosing a hand before continuing to the photo step", async () => {
    const user = userEvent.setup();
    render(<ReadingFlow />);
    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /Left hand/ }));
    expect(screen.getByRole("radio", { name: /Left hand/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(continueButton);

    expect(screen.getByRole("heading", { name: "Add a photo of your palm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Take photo/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose from gallery" })).toBeInTheDocument();
  });

  it("rejects unsupported file types with a helpful message", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ReadingFlow />);
    await user.click(screen.getByRole("radio", { name: /Right hand/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

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
  it("labels confidence as image analysis, never prediction accuracy", () => {
    render(
      <ResultsDashboard
        reading={readingView(false)}
        priceLabel="$4.99"
        paymentsEnabled
        signedIn={false}
      />,
    );
    expect(screen.getByText("Image Analysis Confidence")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/prediction accuracy/i);
    expect(
      screen.getByRole("heading", { level: 1, name: "Your Palm Reading" }),
    ).toBeInTheDocument();
  });

  it("free readings show the basics and an unlock option, without premium sections", () => {
    render(
      <ResultsDashboard
        reading={readingView(false)}
        priceLabel="$4.99"
        paymentsEnabled
        signedIn={false}
      />,
    );
    expect(screen.getByRole("heading", { name: "Personality" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Career" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your Heart line" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Palm mounts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Money & Success" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock full report · $4.99" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Download PDF report" })).not.toBeInTheDocument();
    expect(screen.getByText(/Create a free account/)).toBeInTheDocument();
  });

  it("premium readings show every section and the PDF download", () => {
    render(
      <ResultsDashboard reading={readingView(true)} priceLabel="$4.99" paymentsEnabled signedIn />,
    );
    for (const name of [
      "Love & Relationships",
      "Money & Success",
      "Life Path",
      "Strengths",
      "Challenges",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Palm mounts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download PDF report" })).toHaveAttribute(
      "href",
      "/api/readings/r1/report",
    );
    expect(screen.queryByRole("button", { name: /Unlock full report/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("Based on:").length).toBeGreaterThan(3);
  });

  it("warns (without changing the hand) when the model strongly disagrees with the selection", () => {
    const view = readingView(false);
    view.handCheck = {
      canonical: "right",
      detected: "left",
      detectedConfidence: 0.95,
      mismatch: true,
      strongMismatch: true,
    };
    render(<ResultsDashboard reading={view} priceLabel="$4.99" paymentsEnabled signedIn={false} />);
    expect(screen.getByText("Please confirm your photo")).toBeInTheDocument();
    expect(
      screen.getByText(/You selected your right hand, but the photo may show a left hand/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Right hand analyzed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "start a new reading" })).toHaveAttribute(
      "href",
      "/read",
    );
  });

  it("shows no hand warning when the model agrees or is unsure", () => {
    const view = readingView(false);
    view.handCheck = {
      canonical: "right",
      detected: "left",
      detectedConfidence: 0.3,
      mismatch: true,
      strongMismatch: false,
    };
    render(<ResultsDashboard reading={view} priceLabel="$4.99" paymentsEnabled signedIn={false} />);
    expect(screen.queryByText("Please confirm your photo")).not.toBeInTheDocument();
  });

  it("explains that the diagram is illustrative", () => {
    render(
      <ResultsDashboard
        reading={readingView(false)}
        priceLabel="$4.99"
        paymentsEnabled
        signedIn={false}
      />,
    );
    expect(screen.getByText(/line positions are illustrative/)).toBeInTheDocument();
  });
});

describe("progressive results", () => {
  it("shows the palm map and findings while the interpretation is written", () => {
    const view = readingView(false);
    view.status = "ANALYZED";
    view.interpretation = null;
    render(
      <ResultsDashboard
        reading={view}
        priceLabel="$4.99"
        paymentsEnabled
        signedIn={false}
        interpretationPending
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Preparing your interpretation…" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Palm visualization" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Major findings" })).toBeInTheDocument();
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

  it("offers a retry when the interpretation fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: "AI_UNAVAILABLE", message: "Please try again." } }),
          { status: 503 },
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
