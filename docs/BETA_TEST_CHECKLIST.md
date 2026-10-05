# PalmAI beta test checklist (20 real palm photos)

A repeatable script for validating PalmAI on real photos before a wider beta.
Run it against a **private staging deployment** (or `npm run dev`) with the real
Gemini provider (`AI_PROVIDER=gemini`, `DEMO_MODE=false`) and
`ANALYTICS_PROVIDER=database` (the default — the beta report reads from it).

Record results in a copy of [`beta/beta-results-template.csv`](beta/beta-results-template.csv).
Most numbers come straight from the internal report: sign in as an admin
(`ADMIN_EMAILS`) and open **`/admin/beta`**, or download its CSV from
`/api/admin/beta-report`. Join the two files on `reading_id`.

## What the beta report records automatically

| Field                                  | Source                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Reading ID, status, error code         | `Reading`                                                                                          |
| Selected hand                          | The user's choice — always the hand used for the reading                                           |
| Gemini detected hand + confidence      | Stage-1 output (`hand`, `handConfidence`) — a check signal only                                    |
| Hand mismatch                          | Model disagreed with the selection (selection still used)                                          |
| Image analysis confidence              | Stage-1 `overallConfidence`                                                                        |
| Stage 1 / Stage 2 / total time         | Server time per stage (`ai_stage_completed` events); excludes upload time                          |
| Attempts per stage, retries            | Extra attempts = validation failures or transient provider errors                                  |
| Filtered items                         | Sentences removed by the grounding + safety filters                                                |
| Provider / models                      | Stored with each stage                                                                             |
| Input / output tokens (incl. thinking) | Provider usage metadata                                                                            |
| Estimated AI cost (₹)                  | Token prices if `AI_COST_*_PER_1M_TOKENS_INR` are set, else the flat `ESTIMATED_BASIC_AI_COST_INR` |

## Photo matrix

Use at least **3 different phones** (one low-end Android, one iPhone, one other),
**at least 4 different people** (different palm sizes and line depth), and a
mix of left and right hands (10 / 10).

| ID  | Hand  | Camera / phone      | Lighting          | Quality                  | Palm                      | Expected                                   |
| --- | ----- | ------------------- | ----------------- | ------------------------ | ------------------------- | ------------------------------------------ |
| P01 | Right | Rear, phone A       | Indirect daylight | Clear                    | Square                    | Complete                                   |
| P02 | Left  | Rear, phone A       | Indirect daylight | Clear                    | Square                    | Complete                                   |
| P03 | Right | Rear, phone B       | Warm indoor bulb  | Clear                    | Rectangular               | Complete                                   |
| P04 | Left  | Rear, phone B       | Warm indoor bulb  | Clear                    | Rectangular               | Complete                                   |
| P05 | Right | Rear, phone B       | Direct sun, glare | Imperfect                | Any                       | Complete or glare warning                  |
| P06 | Left  | Rear, phone A       | Dim room          | Imperfect                | Any                       | Dark warning or polite rejection           |
| P07 | Right | **Front/selfie**, B | Daylight          | Clear                    | Any                       | Complete; hand warning likely (mirroring)  |
| P08 | Left  | **Front/selfie**, A | Indoor            | Clear                    | Any                       | Complete; hand warning likely              |
| P09 | Right | Rear, phone C       | Indoor            | Slight motion blur       | Any                       | Complete or blur warning                   |
| P10 | Left  | Rear, phone C       | Daylight          | Fingers cropped          | Any                       | Complete; cropped areas "not visible"      |
| P11 | Right | Rear, phone C       | Daylight          | Palm small in frame      | Any                       | Too-far warning or complete                |
| P12 | Left  | Rear, low-end phone | Fluorescent       | Clear                    | Any                       | Complete                                   |
| P13 | Right | Any                 | Daylight          | Clear                    | Large palm, long fingers  | Complete                                   |
| P14 | Left  | Any                 | Daylight          | Clear                    | Small palm, short fingers | Complete                                   |
| P15 | Right | Any                 | Daylight          | Clear                    | Deep, clear lines         | Complete, high confidence                  |
| P16 | Left  | Any                 | Daylight          | Clear                    | Faint lines               | Complete, lower confidence, softer wording |
| P17 | Right | Any                 | Indoor            | Ring / bracelet / shadow | Any                       | Complete or obstructed warning             |
| P18 | Left  | Any                 | Daylight          | **Back of hand**         | —                         | **Rejected** with a helpful message        |
| P19 | Right | WhatsApp-forwarded  | Any               | Compressed               | Any                       | Complete                                   |
| P20 | Left  | Any                 | Daylight          | **Not a palm** (object)  | —                         | **Rejected**                               |

## Procedure (per photo)

1. Open a **fresh private/incognito window** (tests the guest flow).
2. Go to `/read`, choose the hand in the matrix, upload or capture the photo.
3. Note with a stopwatch: seconds until the **palm map appears**, and until the
   written reading appears.
4. On the results page check, and record in the template:
   - The header says the **selected** hand ("Right hand analyzed").
   - If "Please confirm your photo" appears: was the photo really the other
     hand (`hand_warning_correct`)? The reading must still use the selection.
   - The written reading never refers to the other hand (`used_selected_hand`).
   - Line accuracy (1–5): do the described lines match what you see in the photo?
     Lines the photo doesn't show must not be described.
   - Reading quality (1–5): useful, specific, warm; no predictions about death,
     health, pregnancy, money guarantees or dates (`unsafe_or_wrong_claims`).
   - The free reading is useful on its own; the detailed sections are locked and
     the offer shows **₹35**.
5. Copy the reading ID (from the URL) into the template; the rest of the
   numbers come from `/admin/beta`.

## Payment checks (Razorpay **test mode**)

Run once per phone with Razorpay test keys (`rzp_test_…`). Use the test cards and
UPI IDs from Razorpay's test-mode documentation.

| #   | Scenario                                            | Expected                                             |
| --- | --------------------------------------------------- | ---------------------------------------------------- |
| R1  | Unlock → pay successfully                           | Detailed reading + PDF unlock; admin shows 1 paid    |
| R2  | Unlock → payment fails                              | Stays locked; "didn't go through" notice; can retry  |
| R3  | Unlock → close the Razorpay window                  | Stays locked; "cancelled, not charged" notice        |
| R4  | After R1, refresh the page several times            | Still unlocked; Unlock button gone; no second charge |
| R5  | Resend the same webhook from the Razorpay dashboard | No change (duplicate ignored); still one entitlement |
| R6  | Pay for reading A, open reading B (same browser)    | B stays locked                                       |
| R7  | Open a paid reading in another browser / account    | 404 — not visible at all                             |

## Pass criteria (go / no-go for a wider beta)

- **0** readings where the selected hand was replaced or contradicted.
- **0** crashes or blank pages; every failure shows a friendly message.
- P18 and P20 are rejected; ≥ 90 % of the other photos complete.
- No unsafe claims (death, illness, pregnancy, guaranteed wealth, dates).
- Median total AI time ≤ 30 s; palm map visible in ≤ 15 s on Wi-Fi.
- Retries on ≤ 10 % of readings.
- All payment checks R1–R7 pass; test payments are flagged as test in admin.

Known behaviour to watch: in early testing Gemini disagreed with the selected
hand on most photos (often due to mirrored or ambiguous images), so the
"Please confirm your photo" notice appears frequently. Record
`hand_warning_correct` for every reading — it decides whether that notice is
helpful or noise.
