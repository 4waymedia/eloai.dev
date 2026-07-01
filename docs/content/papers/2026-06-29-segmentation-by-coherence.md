# 2026.06.29 — Segmenting Any Text by Coherence, Without Training on the Answer

*Full write-up. The Field Notes teaser of the same title is cut from this.*

## Problem / context

We had 366 hand-built outlines in `Resources/` — human tables of contents for
hundreds of transcripts, each breaking a video into chapters and nested sections,
chunk-aligned with timestamps. The obvious move was to treat them as training data:
fit a model to reproduce them, score by how closely it matched. We refused. There is
no *correct* segmentation — competent annotators disagree on where chapters begin and
how many there are — so "match this one outline" optimizes the wrong target twice: it
overfits one opinion, and it teaches a model *correlation with that opinion* instead
of *what a boundary is*. We wanted a general, deterministic **formula** that breaks any
text into logical sections from the structure of the text itself, judged by internal
coherence, never by agreement with a reference.

## Background

TextTiling (Hearst, 1997) detects subtopic shifts without supervision: compute lexical
cohesion between adjacent blocks, place boundaries at cohesion valleys whose depth
clears a cutoff. Deterministic, model-free. We adopt its valley mechanics. The deeper
reason to avoid a learned segmenter is the same one driving the rest of the substrate
(cf. rule-based noun detection, shipping the dictionary to the browser): a model in the
hot path is weights to ship, latency to pay, and a black box where a rule should be.
And because every token in our dictionary already carries a reproducible semantic
annotation (facets, EPA, a 4D vector), the "semantic vector" a segmenter needs can be
the substrate's own — letting a small deterministic procedure do work that otherwise
invites scale.

## Approach

`segmentation_formula` is authored against the EloAI formula standard as an *analytic*
formula — ordered operations from a closed vocabulary, each tagged with its lowest
compute tier:

```
encode          unit -> semantic vector
detect_boundary cohesion across each unit gap -> valley-depth score
structure       cut where depth > mean + k*sd (unsupervised) -> chapters
decompose       recurse at a finer window inside each chapter -> sections
label           top distinctive (TF-IDF) terms per span -> topic name
validate        intrinsic coherence check
```

The same formula has two implementations. The **baseline** (tier-0, runs anywhere) uses
a stopworded bag-of-words per unit, cosine cohesion, TextTiling valleys, and TF-IDF
labels — pure standard library, no model, no dictionary. The **substrate upgrade**
(tier-1) swaps the unit vector for the 4D/EPA signature and the boundary signal for EPA
discontinuity + process-stage transition + the `TOPIC_SHIFT` primitive + seed-flow
density, and labels via the verbalizer's reverse dictionary. *Same formula, richer
signal.* This write-up reports the baseline.

The judge is **intrinsic**: `boundary_contrast` = mean cohesion *inside* segments minus
mean cohesion *at the cuts*. Positive contrast means boundaries sit at real valleys. No
gold participates. It is the formula's hard success criterion.

## Data and examples

**Self-test.** Three lexically disjoint topics (5 units each) yield exactly three
chapters split at units 5 and 10, `boundary_contrast = 1.0`, correct labels. The
mechanics behave as specified.

**Real document.** `PBYqXDnajEM` — *"All Wars Are Bankers' Wars,"* 43 minutes, 100
chunks. Its independently authored human outline (content-type "political_commentary")
has 6 chapters with nested sections. We do not use it during segmentation; it is an
after-the-fact reference point only.

## Results

Holding window and recursion fixed and sweeping the one boundary-strictness knob `k`:

| `k` | chapters | `boundary_contrast` |
|-----|---------:|--------------------:|
| 0.5 | 19 | 0.0543 |
| 1.0 | 12 | 0.0622 |
| **1.6** | **7** | **0.0815** (max) |
| 2.2 | 6 | 0.0677 |

Three findings. **Coherence selects granularity:** the intrinsic score is unimodal in
`k` and peaks at 7 chapters — it does not degenerate toward "every unit" or "one
segment." **It converges on human scale:** the coherence-optimal 7 differ from the
human's 6 by one chapter, with no access to the reference. **Boundaries track content:**
at the operating point the cuts fall on the real narrative beats — Revolution/Franklin →
Rothschild & Jackson's bank war → Lincoln's greenbacks → WWII Germany → Smedley Butler's
plot → JFK/Warren Commission → Bretton Woods → petrodollar & Libya → closing argument —
several coinciding with the human chapter topics; TF-IDF labels name each span.

## What it means

That an intrinsic coherence objective lands within one chapter of an independent human
is consistent with the thesis: human chapterization is largely a response to cohesion
structure, so a procedure that measures cohesion recovers it without imitation. The
payoff is method properties, not a leaderboard number — six named steps you can audit,
one interpretable knob, a label-free judge, offline and deterministic, composing
straight into the substrate (the same formula upgrades from lexical to 4D/EPA with no
change to its logic).

## Limitations

`n = 1` document — the immediate next study is the sweep across many of the 366 matched
pairs, reporting the distribution of (coherence-optimal count − human count). The lexical
baseline's absolute contrast (~0.08) is modest; the substrate signal is expected to
deepen the valleys, untested here. "Within one chapter of the human" rests on a single
annotator; inter-annotator variance is unmeasured and may itself be ≥1. And
`boundary_contrast` rewards separation, not label quality, which needs its own intrinsic
measure. We keep the outlines as a sanity glance, never a target.
