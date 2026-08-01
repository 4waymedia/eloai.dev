# 2026.07.31 — The Teaching Loop Closes: Elo Asks What It Doesn't Know, and Then Knows It

*Full write-up. The Field Notes teaser of the same title is cut from this. The
08 gateway's reply path + the browser conversation layer, during the pre-school
phase — every lesson here is a live test of the learning machinery, and the
knowledge taught is almost incidental.*

## Problem / context

Asked **"do you know what a car wash is?"** — directly, twice — Elo answered both
times by quoting the nearest seed containing the words: *"From what you have told
me: 'I want to wash the car'"*. No curiosity fired. The wonder system pinged
every turn about surface novelty (*"it centres on 'car', which is new to me"*)
while the clearest possible epistemic gap — a definition question it could not
answer — triggered nothing. Paul named it precisely: **"there is no question or
curiosity being triggered to learn — that is a system failure."**

The deeper version of the same failure, from an earlier transcript: asked
*"should I drive my car there or walk?"*, recall served **"free from dirt -
means there is no dirt"** — a definition of a semantically adjacent noun,
grounded and cited, confidently irrelevant. The reply machinery could recall,
but it could not *ask*, could not *hear an answer as an answer*, and could not
tell a seed that mentions a concept from one that defines it. This matters now
because the project's pre-school phase is exactly this: hand-teaching single
facts to test whether the learning machinery works. It didn't.

## Background

The fix was wiring, not invention. The primitives existed:

- **The cue mask.** `facets.bin` has shipped a 16-bit logic-cue mask over 304
  curated surfaces (CONDITION, MODAL, QUESTION, DEFINITION_CUE…) since the build
  family landed. Nothing consumed it — the reply path chose between two
  templates on `query.endswith("?")`.
- **The conversation layer** (built earlier the same week): pending-question
  slots, answer capture by token overlap, one-nudge circle-backs — mirrored
  JS/Python, pinned by a shared conformance file.
- **`_wonder_on_gap`** — files an open-question seed on empty recall. Filed, but
  never *asked*.
- **`_attribute_answer`** — the one path that already composed rather than
  quoted (*"your name is Elo"* → *"My name is Elo."*). The model for the rest.

## Approach

1. **Read the shape of the question.** `read_shape` classifies a turn from its
   cue mask — `definition`, `modal_choice`, `causal`, `conditional` — with the
   options and multiword subject attached. Replies compose in that shape.
2. **Mention is not definition.** A definition-shaped question whose recall
   holds only mentions gets the split said plainly, and — the teaching hook —
   the gap is **asked out loud**: *"…but I have not been told what car wash is.
   What is a car wash?"* The trailing question opens a capture slot.
3. **Hear the answer as an answer.** The conversation layer captures the next
   turn against the open slot before recall can misread it, acknowledges it
   (*"That answers my question about 'car wash' — noted."*), and the turn is
   remembered as a seed.
4. **Never claim ignorance while holding the answer.** The intent guard scans
   recalled seeds for intent markers; *"nothing I have stored says how you weigh
   that"* is unsayable when a seed saying it sits in the recall set.

The governing constraint: deterministic, dictionary-grounded, every reply
citable. No step may fake an inference — knowing the user wants the car washed
does **not** license concluding "drive"; that chain belongs to the reasoner,
licensed and cited, or it is not said.

## Data and examples

The reply-shape probe suite, built before the change (the baseline is a number,
not an impression):

| suite | before | after |
|---|---|---|
| reply-shape probes | **3/10** | **11/11** |
| gateway unit tests | 126/126 | **145/145** (19 added) |
| conversation conformance (shared JSON, 2 runners) | — | all green, both sides |
| wonder probes (composition/definition/compound) | 99/99 | 99/99 (unchanged) |

The lesson itself, live, fresh store:

> **You:** Do you know what a car wash is?
> **ELO:** I have not been told what 'car wash' means. What is it?
> **You:** A car wash is a place where you take your car to have it washed. …
> **ELO:** That answers my question about 'car wash' — noted.
> **You:** what is a car wash?
> **ELO:** From what you have told me: "A car wash is a place where you take
> your car to have it washed." *(grounded on 2 seeds)*

Gap detected, asked, answered, captured, kept, served. Elo learned its first
concept from being taught it.

## What broke

Every defect below was found in a **live transcript**; the suites caught none of
them first. That asymmetry is itself the finding.

- **A display annotation ate the question mark.** The console appended
  `↳ grounded on 3 seeds` to the reply before the tracker read it, so
  `endsWith("?")` failed, no slot opened — and the circle-back later offered to
  revisit **'hello'**, the only slot that existed, minted from a greeting.
- **Elo re-asked while being taught.** The teach — *"a place **where** you take
  your car"* — carries a QUESTION cue on its relative clause, and the shape
  reader called the statement a definition question: *"That answers my question
  — noted. I have not been told what 'car wash' means. What is it?"* Thanked and
  re-asked in one breath. Rule kept: an assertion verb before the first
  question-cued surface makes the turn a statement.
- **"yes" was a stopword.** Accepting the circle-back offer produced *"Noted —
  reads positive"*: the affirmation tokenized to nothing, and the offer opened no
  slot to resume. Offers are now tracked slots with resume payloads; bare
  affirmations are matched on raw text.
- **False ignorance, one turn after capture.** Asked the choice again after
  answering it, Elo said *"nothing I have stored says how you weigh that"* while
  holding *"I want to wash the car."* The intent guard exists because a system
  that acknowledges an answer and then denies having it is worse than one that
  never asked.

## What we deferred and why

- **The wonder-noise inversion.** Novelty pings still fire on cadence (now
  toggleable off/low/every); making *blocking gaps* the driver of curiosity is
  an R-D design task, not a patch — it is the scheduler of the whole future
  training phase and deserves its own probes.
- **Inference to the answer.** "The car gets washed at the car wash, so the car
  must go, so drive" is derivable — by R1, over taught rules, with a citable
  chain. Not by a template. Deferred to the R1 wiring.
- **Local sentence-splitting.** A taught paragraph lands in the browser's store
  as one seed; the gateway's seed former splits it properly. The browser's
  remember is tier-0 by design until the verbalizer-ops port.

## Result and consequence

- **VALIDATED** — the full teaching loop (gap → ask → capture → remember →
  serve), live, fresh store, transcript above; reply-shape probes 3/10 → 11/11;
  145/145 gateway tests; conformance green on both runners.
- **VALIDATED** — capture acknowledgment and intent guard live (transcripts
  2026-07-31).
- **UNVERIFIED** — teaching-loop behavior under the durable store across a
  process restart (the store was ephemeral by design during these runs; the
  machinery landed separately).

The consequence is that the training phase has its mechanism. Elo's ignorance,
asked out loud and captured on answer, is a working acquisition channel — the
first of five in the seed-store spec, and the one all the others reduce to. What
Elo cannot yet do is *compose* what it knows — the taught definition comes back
quoted, not spoken. That is the verbalizer-ops work, already in flight in a
parallel session, and the reason the next paper in this series should be about a
browser that talks.
