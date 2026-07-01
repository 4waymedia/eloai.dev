# 2026.06.29 — The Browser Thinks First

*Full write-up. The Field Notes teaser of the same title is cut from this.*

## Problem / context

The expensive resource in modern AI is the model call — tokens, GPU time, a network
round-trip, and the disclosure of the user's input to a remote service. But a large
fraction of the work between a request and a plan is *structural*: identify what was
asked, recall relevant context, decompose the task, propose a checklist, ask the few
questions that matter. On a substrate whose operations are deterministic and reproducible,
that structural work needs no model and can run locally. The thesis: **do the deterministic
majority client-side, in the browser, before a token is spent; spend the model only on
what genuinely requires it.**

## Background

EloAI's dictionary, codec, and facet logic are pure integer operations over a static,
memory-mappable asset — reproducible and fingerprinted. Prior work established that the
dictionary ships to the browser and that core linguistic steps (e.g., noun
identification) are done by lookup-plus-rules with no model — a ~1 MB list and a dozen
auditable rules, not a hosted call. These are the ingredients of client-side cognition.
And a formula's steps each declare the lowest compute tier they can run at, so the
procedure contract doubles as an execution-placement policy.

## Approach

A three-tier policy, bound to the formula operation vocabulary:

```
TIER 0 — Browser, deterministic (no model, no network)
  parse · classify · detect_boundary · score_cohesion · structure · propose_plan ·
  propose_choice · select (prototype router) · recall of LOCAL memory · validate

TIER 1 — Substrate / edge (no language model)
  deeper recall · seed-field graph · contradiction checks · cluster · verbalize · label

TIER 2 — Language model (last resort; the only tokens spent)
  the irreducible generation; reasoning steps no rule/formula covers
  — and even here, the payload is COMPRESSED ELO IDs, not raw text
```

Each step is authored at the lowest tier that can produce it and escalates only when the
lower tier provably cannot. A high tier-2 rate in a formula is a signal to add a
deterministic op, not to accept the cost.

## Data and examples

Existence proof, end-to-end at tier-0: the `segmentation_formula` baseline parses a
document, scores cohesion at every boundary, cuts at an unsupervised threshold, recurses
for subsections, and labels each span — entirely in the Python standard library, no model,
no network — producing a coherent labeled hierarchy of a 43-minute transcript. The
"understand the structure of this text" task ran with zero tokens. Prior client-side
results — rule-based noun detection, the in-browser dictionary — show substantive
linguistic work already runs without a hosted model; the tiering generalizes this from
individual steps to whole formulas.

## What it means

Bandwidth: turns whose plan is computed locally never traverse the network. Cost: no
GPU/token spend for parsing, planning, routing, or clarifying — the bulk of interaction.
Latency: local deterministic steps return immediately; the user sees a parse, a proposed
checklist, and clarifying choices without a round-trip. Privacy: the request and local
memory can stay on-device; only a minimal compressed payload leaves it, if any. Fewer
round-trips: clarify and plan before any call, so the model is invoked once with a fully
specified task. The architecture inverts the default — instead of "send everything to the
model and let it find structure," compute structure locally and treat the model as a
co-processor of last resort, reached through a single seam, on a compressed payload.

## Limitations

Not everything is tier-0: heavy vector operations (large-scale nearest-neighbor
verbalization) may need WASM or stay edge-side — the claim is "push down as far as
provably possible," not "everything in the browser." Generation is irreducible: producing
fluent long-form output still spends tokens; tiering reduces when and how often, not the
existence of tier-2. Quantification is pending: we show tier-0 feasibility by
construction but have not yet measured the *fraction* of real interaction turns that
complete with no model call — the decisive number and the next study. And deterministic
local execution assumes the client can host the static dictionary asset; very thin clients
may need an edge tier-1.
