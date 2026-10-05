"use client";

import { useState } from "react";
import type { LineObservationView } from "@/lib/readings/view";
import { cn } from "@/lib/cn";
import { PalmDiagram } from "./palm-diagram";
import { PhotoOverlay } from "./photo-overlay";

export function Visualization({
  readingId,
  hand,
  lines,
  hasImage,
}: {
  readingId: string;
  hand: "left" | "right";
  lines: LineObservationView[];
  hasImage: boolean;
}) {
  const [tab, setTab] = useState<"diagram" | "photo">("diagram");
  const tabs = [
    { id: "diagram" as const, label: "Palm diagram" },
    ...(hasImage ? [{ id: "photo" as const, label: "Your photo" }] : []),
  ];

  return (
    <div>
      {tabs.length > 1 ? (
        <div
          role="tablist"
          aria-label="Palm visualization"
          className="mb-6 inline-flex rounded-full bg-white/5 p-1"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                "min-h-11 rounded-full px-5 text-sm transition-colors",
                tab === t.id ? "bg-gold-300 text-night-950" : "text-mist hover:text-parchment",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={tabs.length > 1 ? `tab-${tab}` : undefined}
      >
        {tab === "diagram" ? (
          <PalmDiagram hand={hand} lines={lines} />
        ) : (
          <PhotoOverlay readingId={readingId} lines={lines} />
        )}
      </div>
    </div>
  );
}
