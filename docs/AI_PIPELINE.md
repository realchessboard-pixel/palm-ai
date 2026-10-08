# AI Pipeline

AstroVidya never asks a model to "tell my future". The pipeline separates **observation** from **interpretation**, validates every model output against strict schemas, and mechanically filters anything that is ungrounded or unsafe before it is stored.

```
photo ──▶ Stage 1: vision extraction ──▶ PalmAnalysis (strict JSON, confidences)
                                             │
                     quality gate ◀──────────┤  (palm visible? usable? ≥3 features?)
                                             ▼
             palmistry rules engine (src/lib/palmistry) ──▶ matched rules
                                             │
                                             ▼
          Stage 2: interpretation (text only — no image) ──▶ PalmInterpretation
                                             │
             grounding filter ──▶ safety filter ──▶ re-validate ──▶ store
```

## Stage 1: vision extraction

| Item     | Location                                                   |
| -------- | ---------------------------------------------------------- |
| Prompt   | `src/prompts/palm-analysis.ts` (`ANALYSIS_PROMPT_VERSION`) |
| Schema   | `src/lib/schemas/palm-analysis.ts` → `PalmAnalysisSchema`  |
| Pipeline | `src/lib/pipeline/analyze.ts`                              |

The system prompt establishes that the model is "analyzing a photograph for traditional palmistry feature extraction". It:

- must only report features that are reasonably visible;
- must not infer hidden lines;
- must make no medical, legal, financial or guaranteed future predictions;
- must return JSON matching the schema, which is generated from Zod with `z.toJSONSchema` and embedded in the prompt.

What the model records:

- `imageQuality`: score, `usable`, `palmVisible` plus its confidence, and issue codes such as `too_dark` or `back_of_hand`.
- `palmShape`: proportion and width-to-length ratio.
- `fingers`: relative length, spacing, index vs ring, and the thumb's size, setting and angle.
- `lines.{life, head, heart, fate}`. For each line:
  - visible?, confidence;
  - length, curvature, depth, breaks, forks, intersections, markings;
  - an approximate path, with optional normalised points and their own confidence.
- `mounts.{venus, jupiter, saturn, apollo, mercury, mars, moon}`: prominence plus confidence.
- `markings[]`: type, location and confidence.
- `overallConfidence`.

Anti-hallucination rules enforced by the **schema**, not just the prompt:

- Any feature may be the literal `"insufficient_visibility"` instead of an object.
- A line with `visible: false` **must** have every attribute `null` and every list empty. If the model invents details for a line it says it can't see, validation fails.
- Confidences are bounded to 0–1, coordinates to the image, and every enum is closed.

The quality gate (`rejectionReason`) rejects the photo with a friendly, specific message when:

- the palm isn't visible, or its visibility confidence is below 0.5;
- the model marks the image unusable;
- no major line is visible;
- fewer than 3 features reach the confidence threshold.

Rejected photos are deleted immediately.

Deterministic derivations: the classical **element** (earth, air, fire or water) is computed from the observed palm proportion and finger length (`handShapes.ts`). The model is never asked to name it.

## The palmistry knowledge layer

Rules live in maintainable files rather than one giant prompt:

```
src/lib/palmistry/
  lines.ts        heart, head, life, fate rules
  mounts.ts       seven mounts (prominent / moderate / flat)
  fingers.ts      finger length, spacing, index vs ring, thumb
  handShapes.ts   palm proportion + elemental hand types
  markings.ts     star, cross, island, triangle, square, grille, chain, trident
  features.ts     canonical feature keys + availability (confidence ≥ 0.35)
  interpretation.ts  rule matching + deterministic composer
```

Each rule has:

- `id` and `category` (personality, relationships, career, money, lifePath, strengths, challenges);
- `trait`;
- `appliesTo(observation)`;
- `traditional`: the traditional interpretation, phrased as a belief;
- `explanation`: why palmists read it that way;
- `confidenceConsiderations`: what limits certainty in a photo;
- an optional `shadow`: the gentle "flip side" that feeds the Challenges section.

`matchRules(analysis)` only fires rules whose features are **available**, meaning observed with confidence ≥ 0.35. Each match records the features it relied on and the weakest confidence among them.

`composeRuleBasedReading(analysis)` turns the matched rules into a complete, schema-valid reading without any model. It is used for:

- **demo mode** (`AI_PROVIDER=mock`), together with sample features, clearly labelled;
- **section planning**: it decides which sections have evidence to write about;
- **tests**: knowledge-base wording is verified against the safety filter.

## Stage 2: interpretation

| Item     | Location                                                               |
| -------- | ---------------------------------------------------------------------- |
| Prompt   | `src/prompts/palm-interpretation.ts` (`INTERPRETATION_PROMPT_VERSION`) |
| Schema   | `src/lib/schemas/palm-interpretation.ts` → `PalmInterpretationSchema`  |
| Pipeline | `src/lib/pipeline/interpret.ts`                                        |

The interpretation model **never receives the image**. Its input is:

1. the validated stage-1 JSON;
2. **AVAILABLE FEATURES**: the only feature keys it may cite or discuss, with confidences;
3. **traditional palmistry notes**: the matched rules, including caveats and reflections;
4. the list of sections to write.

The system prompt tells it to:

- use the supplied observable features;
- not introduce visual features absent from the analysis;
- describe interpretations as traditional palmistry beliefs, and never present palmistry as scientifically validated;
- make no claims about death, illness, pregnancy, criminality, dates or ages, or guaranteed wealth;
- avoid fear-based or manipulative language;
- use softer wording for lower-confidence features.

Each section returns:

- `summary`, `details` and `points`;
- `basedOn`: feature keys matching `palmShape | fingers | fingers.thumb | lines.* | mounts.* | markings.N`;
- `emphasis` (0–100): how strongly the cited features speak to the theme. It is **not** an accuracy score.

## Validation, repair and retry (`src/lib/ai/structured.ts`)

For both stages:

1. Call the provider with a timeout (`AI_TIMEOUT_MS`).
2. **Extract JSON** (`src/lib/ai/json.ts`). Parse directly first. If that fails, apply _safe, syntax-only_ repairs: strip code fences or surrounding prose, take the outermost object, and remove trailing commas outside strings. Content is never guessed.
3. **Validate** with Zod, then run semantic checks. For stage 2 the grounding check runs here: more than 3 invalid citations, or no grounded section, counts as a failure.
4. On failure, **retry** with a correction note that lists the specific schema issues and demands one JSON object, up to `AI_MAX_ATTEMPTS`.
5. If output is still invalid, return a controlled `AI_INVALID_RESPONSE` ("We couldn't analyze this palm right now. Please try again."). Details go to the server log only.

Provider failures are normalised into an `AiError` kind and then mapped to a user-facing code:

| `AiError` kind                         | User-facing code          | Behaviour            |
| -------------------------------------- | ------------------------- | -------------------- |
| `timeout`                              | `AI_TIMEOUT` (504)        | No retry             |
| `auth`                                 | `AI_NOT_CONFIGURED` (503) | No retry             |
| `rate_limited`, `unavailable`, `empty` | —                         | Retried with backoff |
| `refused`, `invalid_request`           | `AI_UNAVAILABLE` (502)    | No retry             |

The Anthropic adapter also checks `stop_reason` (`refusal`, `max_tokens`) and opts into server-side refusal fallbacks.

Model output is only ever parsed as data. Nothing is executed or rendered as HTML.

## Post-processing (stage 2)

### Grounding filter (`src/lib/pipeline/grounding.ts`)

- Drops `basedOn` keys that are not available.
- Drops sections left with no valid citation, line readings for unobserved lines, and mount readings for unobserved mounts.
- Drops the finger and marking narratives when those features weren't observed.
- Removes **sentences** that name an unobserved line ("fate line") or mount ("Mount of Saturn").

### Safety filter (`src/lib/pipeline/safety.ts`)

- Removes sentences about death or dying, illness and diagnoses, pregnancy and fertility, crime, lottery-style wealth, divorce, specific ages or years, and "you will…" or "destined to…" predictions.
- Some topics (lifespan, guarantees, medical, scientific) are allowed **only as negations**, e.g. "the life line says nothing about lifespan".
- An item whose required text becomes empty is dropped.

The result is re-validated against `PalmInterpretationSchema` and stored together with `removedCount`, for monitoring.

## Confidence semantics

- **Image Analysis Confidence** (shown on the results page) is `overallConfidence` from stage 1: how clearly the model could see the palm. It is never labelled or used as "prediction accuracy".
- Per-feature confidences drive rule availability (≥ 0.35), softer wording (< 0.6), the opacity of lines in the palm diagram, and whether approximate line positions are drawn on the user's photo (points confidence ≥ 0.5, always labelled **Approximate positions**).
- **Feature emphasis** on sections is the confidence-weighted strength of the cited evidence for that theme.

## Performance

Both stages are one model call each; everything else (upload parsing, image
re-encoding, storage, database writes) measured under 0.3 s in total, so model
latency is the whole budget. What the pipeline does about it:

- **Progressive results.** As soon as stage 1 finishes, the browser opens the
  results page, which shows the palm map, confidence and findings while
  `InterpretationPending` requests stage 2 and refreshes when it's done. The
  progress screen only marks steps complete on real events.
- **Thinking levels.** `AI_INTERPRETATION_THINKING` defaults to `low`: the
  text-only interpretation step is about twice as fast with no measured loss in
  grounding (0 removed citations) or completeness. The vision step keeps the
  model's default because lower levels agreed less with repeat baseline runs
  and inflated hand-side confidence.
- **Leaner stage-2 prompt.** Overlay coordinates are dropped from the analysis
  JSON passed to stage 2 (they only drive the diagram).
- **Fewer retries.** The stage-1 prompt states that coordinates are 0–1
  fractions; pixel values were the most common cause of schema retries.
- **Idempotent uploads.** The browser sends a `requestId` with each submission;
  a repeat from the same visitor (double tap, retry after a dropped
  connection) returns the first result instead of a second reading and AI call
  (`src/lib/pipeline/idempotency.ts`, actor-scoped, never shared across users).
  Stage 2 is guarded by the database claim, so concurrent requests wait (409)
  rather than generate twice.
- **Timings.** In development (or with `PIPELINE_TIMING=1`) each request logs a
  `pipeline_timing` line with per-step durations and token counts — never image
  data, prompt text or credentials.

Image size is not a lever with Gemini: an image costs a fixed 1,064 input
tokens whether it is 768 or 1,600 px on the long edge, and smaller images
measured no faster, so photos stay at 1,600 px for line detail.

## Versioning and auditing

Each stored `PalmAnalysis` and `PalmInterpretation` records:

- `schemaVersion` and `promptVersion`;
- `provider` and `model`;
- `attempts`;
- for interpretations, `removedCount`.

Bump the prompt version constants whenever the wording changes.

## Extending

- **New palmistry knowledge:** add a rule to the relevant file. The safety test (`tests/unit/interpretation.test.ts`) checks all rule text automatically.
- **New observable feature:** extend `PalmAnalysisSchema`, add a key to `features.ts` (`FEATURE_KEY_PATTERN` and `availableFeatures`), add rules, then update the prompt.
- **New provider:** implement `AiProvider.complete()` (text in, text out, optional JPEG) and map vendor errors to `AiError` kinds.
