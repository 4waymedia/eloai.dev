# 2026.07.10 — EPA Is Affect, Not Meaning: The Probe That Nearly Reported Noise

*Full write-up. The Field Notes teaser of the same title is cut from this. We asked whether to rebuild phrase affect from sentence embeddings instead of averaging word affect. The answer is no — and the experiment that told us so first reported a strong positive result from pure random noise.*

## Problem / context

Every word in the dictionary can carry an **EPA** vector — Evaluation, Potency, Activity — the three dimensions Osgood found account for most of the variance in how people rate words on scales like good–bad and strong–weak. It is a real signal of *affect*: how a word feels.

Phrase affect is a problem. In `general_v0.4_char4`, **69.9%** of filled EPA (163,749 / 234,286) is **mean-composed** — a phrase's affect is the average of its words' affect. So `killed it`, the phrase meaning *you did brilliantly*, carries the mean of `killed` and `it`: the emotional value of homicide. And **43.9%** of the vocabulary (183,555 / 417,841) has no EPA at all. Mean-composition is also negation-blind: it skips words it can't rate, and `not` is unrated, so `not a bad day` composes to exactly `a bad day`.

The proposal under test was appealing: replace mean-composition with a projection from each surface's own 768-d sentence embedding (`all-mpnet-base-v2`), and impute EPA for unrated surfaces the same way. A phrase would get its *own* vector instead of the average of its parts. This paper is why we rejected that, and what we do instead.

## Background

Two prior facts framed the test. First, EPA's three axes are not equally trustworthy: the cross-source agreement (Warriner norms vs NRC-VAD) is **E = 0.814** — healthy — but **P = 0.328** — barely better than noise. Whatever we build leans on Evaluation and treats Potency as soft. Second, we already had, from earlier informal probing, the symptom that started this: EPA nearest-neighbour returns *affective* neighbours, not synonyms. `car`'s nearest neighbours are `attention`, `decoration`, `landscaping`; a true synonym pair sits no closer than an unrelated pair with the same charge. EPA is connotation; synonymy is denotation. The question was whether a real embedding model would rescue phrase affect where the affect lexicon could not.

## Approach

Two probes over `all-mpnet-base-v2`, each judging whether the encoder carries a property mean-composition lacks:

- **P1 — Negation.** Does the embedding of `not w` move toward `w`'s antonym? Measured as `cos(w, "not w")` and `cos("not w", antonym)` over 24 pairs.
- **P2 — Word order.** Does the embedding distinguish `A verb B` from `B verb A`? Measured as `cos(svo, permuted)` — the similarity of a sentence to its agent/patient inversion.

The critical piece is what sits *in front* of both probes: an **encoder sanity gate**, and it exists because the first draft was broken.

## Data and examples

**The gate — and why it exists.** The first version of P1/P2 compared only the *ordering* of two cosines: is `cos(w, antonym)` bigger than `cos(w, "not w")`? On vectors with no real signal, that ordering is a coin flip. The first run reported *"negation carried in 17/24 pairs (71%) → mpnet carries negation."* A second random seed gave 11/24 (46%). **The 71% was pure noise read as a strong positive.** The gate now requires the encoder to demonstrate signal before any verdict is emitted, and the probes judge **magnitudes**, not orderings:

```
identity = 1.000    cos(good, great) = 0.742    cos(good, kettle) = 0.179    margin = 0.563  → PASS
```

A synthetic random control must print `SUPPRESSED`; if it does not, the probe is broken and the numbers are worthless.

**P1 — Negation is mostly lost.**

```
mean cos(w, "not w") = 0.720          "not w" is nearer its antonym in only 3 / 24 pairs
  good  0.432    safe 0.777    calm 0.838    polite 0.846    early 0.862    full 0.830
baseline: mean-composition scores cos = 1.000 (identical) in ALL pairs
```

mpnet registers that *something* changed and does not register that the change was the truth value. Better than mean-composition (which sees nothing), insufficient on its own.

**P2 — Word order is effectively invisible.**

```
mean cos(svo, permuted)  = 0.973       (mean-composition gives exactly 1.000)
mean cos(svo, unrelated) = 0.042       (floor)
reference cos(good, great) = 0.742
```

mpnet rates a sentence and its agent/patient inversion as **more similar to each other (0.973) than two actual synonyms are (0.742)**. The vector moves 0.027 while the meaning inverts completely.

**The reframe that decided it.** Permutation-invariance is a *semantic* defect, not an *affective* one. Ask what EPA is for: does `dog bites man` *feel* different from `man bites dog`? Barely — both are mildly negative, moderately potent, active. The affect of a bag of words is close to genuinely permutation-invariant, so P2 is not a problem for an affect channel. Negation is different: `not good` must carry the **opposite sign** on Evaluation. That is an affect error, and no encoder in the test carries it reliably.

## What broke

The probe reported a strong positive result from random noise, and we nearly believed it. The failure was methodological — comparing the *order* of two similarities instead of their *magnitudes* — and it is the exact shape of error this project keeps catching: a measurement that looks like signal on the easy framing until a control is added. The fix (a mandatory encoder-sanity gate with a synthetic `SUPPRESSED` control) is now a permanent front-door on the probe. The lesson we are keeping: an experiment without a null control is not evidence, and "71% of pairs" is a number a coin can produce.

## What we deferred and why

- **Do not rebuild phrase EPA on embeddings (D1).** With P2 order-blind (0.973) and P1 negation-blind (0.720), a 768-d projection buys ~nothing over the mean for the two properties that actually matter, at large cost. Mean-composition stays for now.
- **Fix negation symbolically (D2).** Phrase EPA must consult the deterministic `Claim.polarity` (affirmed | negated) — already tested 11/11 and already flowing through `MemorySeed` — and flip the Evaluation sign on negation, rather than hoping an encoder learned it. No encoder did.
- **The denotative channel stays separate.** Synonymy needs a real embedding index built for *meaning search*, keyed to the same vocabulary but never conflated with the affect channel. That index is designed, not yet frozen.
- **Potency stays soft everywhere.** Anything leaning on P (agency, dominance) inherits its 0.328 cross-source reliability and must be treated as a weak prior, not a fact.

## Result and consequence

- **VALIDATED** — negation is not reliably carried by `all-mpnet-base-v2`: `mean cos(w, "not w") = 0.720`, nearer the antonym in 3/24 pairs. Mean-composition carries it not at all (1.000).
- **VALIDATED** — word order is effectively invisible to the encoder: `cos(svo, permuted) = 0.973`, higher than synonym similarity (0.742).
- **VALIDATED** — the sanity gate suppresses the synthetic control; the earlier 71%-from-noise result is reproduced as noise and rejected.
- **REFUTED** — the proposal to rebuild phrase affect from embeddings. It does not fix the two defects it was meant to fix.
- **UNVERIFIED** — the eventual denotative (meaning-search) index. It is a different artifact from affect and is measured on its own terms when built.

The consequence is a clean separation we should have drawn earlier. **Affect** is one channel — kept, useful for the emotional arc of a page, permutation-invariant by nature, and now to be corrected for negation *symbolically* rather than by a bigger model. **Meaning** is a different channel we build separately. EPA was flattering us on the easy cases — `happy` and `murder` have obvious neighbours — until a phrase like *"you killed it"* and a probe run on pure noise told the truth at the same time.
