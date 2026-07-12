# 2026.07.09 — A Car Next to "Credentials": EPA Measures Feeling, Not Meaning

*Full write-up. The Field Notes teaser of the same title is cut from this. It is the finding that forced the denotation channel in the 07.10 coupled-family build — this post is why that second channel had to exist.*

## Problem / context

We wanted cheap, interpretable semantic similarity inside the dictionary — a way to ask "what words are related to this one?" without a heavy model. The obvious candidate was **EPA**: Osgood's Evaluation / Potency / Activity, three numbers per word from the mid-century semantic differential, later formalized by Heise's Affect Control Theory. It is tiny, it is interpretable, and we had inherited a claim in our own notes that Osgood's factors "explain 70–90% of semantic variance." If true, three floats per word would be a startling bargain. We decided to stop believing the claim and measure it.

## Background

The semantic differential asks people to rate words on bipolar adjective scales (good–bad, strong–weak, active–passive); factor analysis collapses those onto three axes — Evaluation, Potency, Activity. Affect Control Theory then treats EPA profiles as *sentiments* and predicts social behavior as the minimization of *deflection* (the distance between what an event implies and what you already feel). That is a real, load-bearing theory — **for affect**. The slippage in our notes was treating "explains most of the variance in *connotative/affective* meaning" as "explains most of meaning." Those are not the same claim, and the difference is the whole story.

## Approach

We built the EPA substrate from lexicon ratings (Warriner 2013 valence/arousal/dominance ∪ NRC-VAD), lemma-matched, **67,936 words**, each a point in 3-D. Then we did the simplest possible test of "is this meaning?": exact nearest-neighbour search in EPA space. If EPA encodes meaning, a word's neighbours should be its synonyms.

## Data and examples

They are not synonyms. They are things that *feel the same*.

```
car   ->  credentials (L2 0.066),  attention (0.079),  decoration (0.081)
```

The retrieval is exact — the index is doing its job perfectly. A car, a set of credentials, and a decoration genuinely occupy the same neighbourhood because they are evaluated, potent, and active to about the same degree. EPA cannot tell them apart because denotation was never in the representation. The space is also wildly non-uniform in the way affect is: `happy` has **zero** neighbours within a tight radius (r < 0.10) — affect-laden words sit alone in the sparse extremes — while `big` has **1,939** within r < 0.50. It "works" only for the small set of strongly affective words, and even then it is measuring feeling, not reference.

One more measurement mattered for anything downstream that leans on a single axis. Cross-source agreement on the 13,812-word Warriner ∩ NRC-VAD overlap: **E = 0.814, A = 0.613, P = 0.328.** Potency is the least reliable axis by a wide margin — barely a third of a correlation between two reputable sources. Anything that imputes agency or dominance from P is building on sand.

## What broke

The "70–90% of semantic variance" line in our own notes was an **overclaim, and it is REFUTED.** EPA is three affective dimensions over 67,936 items; denotation is simply not encoded, so EPA nearest-neighbour is *affective proximity, not semantic search*. The retrieval was never broken — the expectation was. This is exactly the kind of confident-sounding inherited generalization our validation loop exists to catch: plausible, compact, wrong, and load-bearing until measured.

## What we deferred and why

- **We stopped using EPA for similarity, permanently.** For denotation we added the right tool: a 768-d `all-mpnet-base-v2` index over L2-normalized vectors (inner product = cosine). Ask *it* for `car`'s neighbours and you get `truck`, `vehicle`, `automobile`. Affect and denotation are different axes; each gets its own channel, and neither does the other's job.
- **EPA keeps its real job.** Its correct grounding is Affect Control Theory — EPA profiles plus impression-formation equations, where *deflection* over Actor–Behavior–Object events is the computable quantity. Use EPA for affective dynamics, never for synonymy.
- **Never impute from Potency.** With cross-source P at 0.328, the deflection P-term and any agency/dominance signal inherit that unreliability. Flagged everywhere P is read.

## Result and consequence

- The claim is corrected in the substrate spec and propagated across every downstream doc that had inherited it; EPA-as-meaning is gone from the codebase's assumptions.
- The measurement bought the architecture that followed: two distinct channels — affect (EPA) for how a word feels, denotation (768-d) for what it means — which became two of the three parallel layers in the coupled dictionary family the next day. Adding a car to "credentials" was not a bug to fix; it was the space honestly reporting what it is. The fix was to stop asking affect to be meaning, and to build the channel that could.
