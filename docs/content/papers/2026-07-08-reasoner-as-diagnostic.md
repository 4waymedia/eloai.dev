# 2026.07.08 — An Auditable Reasoner, and the Whack-a-Mole It Exposed in Our Concepts

*Full write-up. The Field Notes teaser of the same title is cut from this. It follows the 2026.07.05 "grounded and converged" concept post — the reasoner is what put those concepts under real load for the first time.*

## Problem / context

We finished Reasoning R1: a deterministic, symbolic reasoner that takes a working context (seeds + a typed graph) and emits contradiction verdicts plus single-hop typed-relation inferences, every step carrying full provenance so it can be replayed. It passed 28 unit tests on synthetic contexts. Then we ran it on real memory — 9,868 seeds extracted from seven Andrew Huberman transcripts — and it did two things at once: it worked exactly as designed, and it proved the layer beneath it is not ready. The second result is the useful one, and it is the subject of this post.

## Background

R1's substrate is the seed-field graph from stage 06, whose edges and `CONTRADICTS` pairs are keyed on `concept_id`. Two weeks of work had made `concept_id` *reliable* (5/5 on a 190-sentence controlled corpus), *grounded* (resolves to a dictionary atom with an EPA coordinate), and *convergent* (plural/variant forms collapse). All of that was validated on clean, hand-built sentences. Real ASR transcripts are a different world: no punctuation, one `unknown` speaker for the whole file, and wall-to-wall discourse fillers. The live run was the first time the concept layer met that world.

## Approach

The reasoner ran end to end: `working_context_from_recall(engine, entity)` assembled the premise set, mnemeʼs real `ContradictionResolver` handled P1, a cue reader derived logic cues from seed text for P2, and `reason()` composed the trace. We read the output, saw the problem, and ran the obvious first fix — a filler stoplist on concept selection — then a second fix on the residual, measuring the contradiction count each time as a proxy for concept noise.

## Data and examples

The live run: **9,868 seeds → 3,525 reasoning steps, 100% replay to real seed ids.** The machinery was flawless. The *content* was not. The derived claims:

```
like contributes_to remember      um enables little        that's member_of artist
go temporal_before get            know member_of artist    feel contributes_to today
```

The "concepts" were discourse fillers (`like`, `um`, `so`) and bare verbs (`go`, `know`, `make`, `get`). Two fixes, each measured against the baseline of **3,473** resolved contradictions:

| change | concepts removed | contradictions | delta |
|---|---|---:|---:|
| baseline | — | 3,473 | — |
| filler stoplist | `like`/`um`/`so` | 3,105 | **−11%** |
| + verb stoplist | `go`/`know`/`make`/`get` | **3,318** | **+7% (worse)** |

The filler fix worked and helped a little. The verb fix worked at the claim level — the verb-concepts vanished from the inferences — but the contradiction count went *up*.

## What broke

The instructive failure is the verb fix going the wrong way. Removing verb-concepts did not delete those seeds; it *redistributed* them onto the next fallback token, which is typically a *commoner* word shared by more seeds. Smaller, diverse verb-concept clusters (`go`, `know`, `make` each their own little group) collapsed into fewer, larger clusters — and `CONTRADICTS` fires on same-concept pairs, so a larger cluster means quadratically more pairs. We had been playing whack-a-mole: each per-class stoplist just moves seeds between junk buckets.

The deeper cause is not any word class. It is two structural things a stoplist cannot touch. First, **entity collapse**: the transcripts carry no speaker labels, so all 9,868 seeds sit under one `unknown` entity, and contradiction detection across a single giant entity is combinatorial by construction. Second, **broad low concept quality**: on messy ASR the concept is wrong across many parts of speech at once — fillers, then verbs, then adjectives (`huge`, `small`), pronouns (`myself`), contractions (`that's`, `there's`). Blacklisting one class at a time cannot win that.

## What we deferred and why

- **We abandoned per-class stoplists as the lever.** The measurement refuted the premise. The principled replacement is a *positive* gate — accept a concept only if it grounds to an in-dictionary content noun (reusing the grounding layer we already built) — which excludes every junk class at once instead of one at a time. Deferred to its own pass.
- **The entity collapse** is the bigger co-driver and a separate effort (real speaker signal, or scoping contradictions below the entity). Not attempted here.
- **We moved tuning into the instrument.** Rather than keep editing source and rebuilding a 9,868-seed store to test a guess, the concept-quality knobs are now injected specs in our PipelineLab (a `ConceptPolicy` passed as a constructor param) with a live per-stage metric — % of concepts that are content nouns. Tuning is now measured, not eyeballed.

## Result and consequence

- R1 machinery on real data: **VALIDATED** — 3,525 steps, 100% provenance replay, honest confidence calibration held (weakest-link, licensed edges only).
- Filler stoplist: **VALIDATED** but modest (−11%).
- "A verb stoplist reduces spurious contradictions": **REFUTED** — it raised them 7% by concentrating clusters.
- Per-class stoplists as the fix for concept noise: **REFUTED** — whack-a-mole; the volume is driven by entity collapse and broad concept quality.

The reasoner's real value on day one was not a conclusion — it was a diagnosis. Because every bad claim replays to the exact seeds that produced it, an auditable reasoner is also a *probe*: it made a foundational weakness impossible to hide, and it will be the instrument that scores the fix. That is the argument for provenance stated more strongly than we would have stated it ourselves: build the thing that shows its work, and it will show you your own.
