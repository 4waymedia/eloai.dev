# 2026.07.27 — Non-Compositionality Finds Idioms, Not Compounds: A Signal That Cannot Tell "Good Luck" From "Hard Drive"

*Full write-up. The Field Notes teaser of the same title is cut from this. Wonder faculty; the discovery half of `compound_learning_formula`, and a measured refutation of its central signal. Follows the previous day's paper on the teaching path.*

## Problem / context

Teaching works: say *"car wash is one thing"* and Elo files every later mention under that concept. But most compounds never get taught, because nobody thinks to teach them — they just get used. So the obvious next capability is discovery: notice an untaught compound in ordinary conversation and ask about it.

There is a measure that looks purpose-built for this. **Compositionality** is `cos(compose(word vectors), embed(phrase directly))` — high when a phrase is its parts (`red car`), low when the whole diverges from the sum (`hot dog`). The build already ships 132,384 of these scores. Low compositionality means the meaning isn't the sum of the words, which is exactly what a compound is.

That reasoning is wrong, and the data says so plainly. Low compositionality means **idiomatic**, and the most idiomatic things in a conversational corpus are not compounds — they are pragmatic formulas. `thank god`, `good luck`, `can't wait`, `sounds good`. The signal fires hardest on precisely the phrases we do not want.

## Background

- **`phrase_compositionality.py`** computes and stores the measure, and its own `summarize()` already labels `<0.5` as "idiomatic" — an existing convention worth reusing rather than inventing a threshold.
- **`facets.assign_facet()`** returns a semantic bucket plus a UTILITY axis (CONTENT / FUNCTION / STRUCTURAL / FILLER) — pure Python, no lmdb or model, so it is cheap to call at runtime.
- **`word_classifier`'s tier-H trigger lists** — EMOTION_WORDS, MODAL_VERBS, COGNITIVE_VERBS — and `filler_weighter.FILLER_LOOKUP` already enumerate affect-loaded and discourse-register vocabulary.
- **`spec-phrase-assets.md`** had already measured this corpus and concluded phrase denotation was low value here. We found it late; see What broke.

## Approach

A candidate pair must pass four checks, none sufficient alone.

**Signal A — adjacency.** Two adjacent single-word chunks whose tier is not F. A cheap prefilter.

**Signal B — denotation divergence.** The joined phrase appears in the compositionality CSV as a fully-composable row scoring below threshold. Calibrated against the data, not guessed: on the 11,818 fully-composable rows, mean 0.718, median 0.732, and only 3.0% fall below 0.5 — the same cutoff the existing tool already calls idiomatic. `IDIOM_THRESHOLD = 0.50`.

**Signal C — role agreement.** Both words must be UTILITY CONTENT *and* in a content bucket:

```python
for w in (word_a, word_b):
    bucket, _, flags = assign_facet(w)
    if _facet_utility(flags) != "CONTENT":   return False
    if _BUCKET_NAME.get(bucket) not in _CONTENT_BUCKETS: return False
```

**Signal D — no affect-loading.** Neither word appears in the emotion / modal / cognitive / filler lists. This is the direct operationalization of the spec's own examples: `thank god` carries an EMOTIONAL filler, `can't wait` a negation plus modal.

## Data and examples

The decisive measurement is not per-sentence behaviour but the **complete population** — every phrase in the corpus that could ever pass all four signals.

| population | asks | genuine compounds | precision |
|---|---|---|---|
| all four signals | 198 | 28 | **14.1%** |
| ∩ hygiened phrase set (pre-fix) | 191 | 28 | 14.7% |
| ∩ hygiened phrase set (fixed) | 191 | 28 | 14.7% |

Roughly 85% of what Elo would ask about are formulas: `sounds good`, `good luck`, `go ahead`, `too late`, `good job`. Hand-labelling was incomplete — a later pass found `monetary policy`, `patriot act`, `side effects`, `significant other` in the reject pile — so **read 14.1% as a floor; the true figure is nearer 20%.** The row-to-row comparison uses one label set throughout and is sound.

Per-signal contribution, over the 219-phrase candidate space:

| signal | rejects |
|---|---|
| Signal C (role) | **0** |
| Signal D (affect) | 21 |

Signal C never fires on the real population. The function words it correctly rejects inside a live sentence (`to fix`, `that now`) have no CSV row, so Signal B was already rejecting them.

Tightenings, measured rather than guessed:

| rule | asks | real | precision | recall |
|---|---|---|---|---|
| current | 198 | 28 | 14.1% | 100% |
| both bucket=TOPIC | 46 | 12 | 26.1% | 46% |
| + no light-verb/common-adj | 22 | 10 | 45.5% | 38.5% |
| + no contractions | 17 | 10 | **58.8%** | 38.5% |

Better precision costs a hard ceiling: the strictest rule can ever ask about **17 phrases in the entire corpus**.

And the canonical target is unreachable. Run live:

```
"I drove to the car wash this morning."
    pair 'car wash'  A=True  B=False (cos=None)  C=True  D=False  -> rejected
```

`car wash` has **no compositionality row at all** — it was never mined, which is the previous paper's result. Discovery cannot reach the example the work is named after.

## What broke

**Signal C was checking the wrong field, and only the real system revealed it.** `facets.assign_facet` assigns `bucket=RELATION` only to words matching a LOGIC_SEED cue. A plain preposition falls through to the **default `bucket=TOPIC`** — the same bucket as `car`. Measured: `assign_facet("to")` → `bucket=TOPIC, utility=FUNCTION`. The check read bucket alone, so `to`, `the`, `that`, `this`, `it` all passed as content words. Only the UTILITY field carries the distinction.

**A docstring asserted something the code does not do.** Signal A's rationale claimed the encoder computes tier via `word_classifier.classify()`. It does not: the encoder imports only `get_tier_name`, and for dictionary words it reads a **prebuilt template out of LMDB** and takes the tier baked in at build time. That build-time tier returns **H** for `to`, `that`, `this`, `it`, where a live `classify()` returns **F**. The claim had been written confidently and never checked; the fix is a corrected docstring plus an assertion that pins the leak as a known condition, so a future dictionary rebuild that changes it fails loudly.

**We built on a signal without finding its spec first.** `spec-phrase-assets.md` had already measured this exact CSV and written the conclusion — *"Not now for conversational/browser builds — the data says the payoff isn't there"* — before we started. It lived in a folder that wasn't connected, which is an explanation and not an excuse: the repo's standing rule is to read the spec for every term, and "I could not find one" should have been a question rather than a green light.

## What we deferred and why

- **The R3 tightening (≈59-70% precision, 17 reachable phrases).** Measured and available; not adopted, because the trade is a real feature for a nearly-empty one, and that is a product call.
- **Live embedding.** Loading `all-mpnet-base-v2` at runtime would give compositionality for *any* pair and is the only route to `car wash` on first utterance. It adds a model dependency to a gateway whose entire thesis is not having one.
- **A POS tagger.** See below — it would help and would not be enough.

## Result and consequence

- `REFUTED` — **Non-compositionality does not detect lexical compounds on a conversational corpus.** 14-20% precision; ~85% of hits are pragmatic formulas. Independently reached by `spec-phrase-assets.md` from the other direction.
- `VALIDATED` — **Signal C's UTILITY check is load-bearing; the bucket check alone is not.** Function words pass a bucket-only test.
- `VALIDATED` — **`car wash` is unreachable by discovery** and reachable only by teaching.
- `UNVERIFIED` — a POS tagger would plausibly reach 45-55%. This is reasoning from category counts, not a built result.

The sharper conclusion is that syntax is necessary but not sufficient, which took a second measurement to see. Rejecting verb-initial pairs moves precision 14.1% → 16.4% at zero recall cost, and the false positives turn out to be four families — contractions 33%, evaluative-adjective 20%, verb-initial 16%, other 31%. The codebase cannot do the verb check well: `meta.db` has no POS column, the meta_layer2 fields that might proxy are 0.0% populated, and the METHOD bucket is so conservative that `sounds`, `make`, `looks` and `wait` are none of them METHOD. But even a perfect tagger leaves the evaluative family untouched, because `good call` and `hard drive` are **both ADJ+NOUN**. The difference between them is not grammar. It is whether the phrase has been conventionalized as a name for a thing — encyclopedic knowledge, which is exactly what a person supplies by teaching. Discovery stays shipped as a narrow supplement, and it only ever *asks*: a wrong guess costs one dismissible question, never a wrong fact.
