# 2026.07.27 — Numbers Were Not Mangled, They Were Deleted: A Second Tokenizer With No Digit Class

*Full write-up. The Field Notes teaser of the same title is cut from this. mneme semantic encoder; a silent total loss of numeric content in the meaning path, found while building phrase composition. The compression path is unaffected — that distinction is most of the story.*

## Problem / context

While testing a new phrase composer, a probe failed on `18th century`. The compositionality table said the phrase was trusted; the composer said it had never seen it. The obvious read was a keying mismatch — the table is built from dictionary surfaces, the composer works from encoder output, and those can drift.

That read was wrong, and the truth was worse. The encoder was not rendering `18th century` badly. It was rendering it as `th century`. And a wider check found this:

```
"I have 3 cars"          -> ['i', 'have', 'cars']
"it cost $40"            -> ['it', 'cost']
"call me at 555 1234"    -> ['call', 'me', 'at']
"You are 100 feet from the car wash" -> no 100 anywhere
```

Every number in every sentence was gone. Not truncated, not mis-keyed — **absent from the encoded meaning entirely**. A system whose purpose is to remember what you told it could not represent *how far*, *how many*, or *how much*. Ask it to hold "you are 100 feet from the car wash" and it holds "you are feet from the car wash."

## Background

- **`semantic_encoder.py`** produces `TokenChunk`s — surface, normalized, tier, EPA, 8-position template — the input to seed formation and everything downstream in memory.
- **`EncodedSpan.chunks` excludes punctuation**, by design and by its own docstring. Punctuation carries no affect to compose.
- **`compressor.py` is a different module** with its own tokenizer and a 256-entry byte-fallback, and it is the one that carries the v0.3 byte-exact round-trip claim.
- Two tokenizers, then. That is the shape of the bug, and it is the second instance of the same shape found the same day — see *A Correct Gate With an Incomplete List*, where one constant meant different things to two consumers.

## Approach

**1. Read the tokenizer instead of theorising about the seam.**

```python
_TOK_RE = re.compile(
    r"[a-zA-Z]+n't"           # don't, can't, won't, isn't
    r"|[a-zA-Z]+'[a-zA-Z]+"   # we've, i'm, they're, it's
    r"|[a-zA-Z]+"             # plain words
    r"|[.,;:!?\"'()\[\]{}—–\-]"  # punctuation
)
```

There is no `\d` anywhere in it. `re.findall` returns only what matches, so a bare `3` matches nothing and is silently discarded. `18th` matches the third alternative at offset 2, yielding `th`.

**2. Find the second layer.** Adding a numeric alternative was not enough, because of this:

```python
is_punct = not raw[0].isalpha()
```

A digit-initial token is not alphabetic, so `100` was flagged **punctuation** — and punctuation is excluded from `chunks`. Even correctly tokenized, every number would still have been dropped one step later.

**3. Fix both layers.**

```python
r"|\d+(?:[.,]\d+)*[a-zA-Z]*"   # 100, 3.5, 1,200, 18th, 40s, 90s
...
is_punct = not raw[0].isalnum()
```

**4. Establish the blast radius before believing the fix.** Every suite covering the encoder and its consumers, run against the real dictionary.

## Data and examples

Before and after, same sentences, real encoder:

| input | before | after |
|---|---|---|
| `You are 100 feet from the car wash` | `you are feet from the car wash` | `you are 100 feet from the car wash` |
| `I have 3 cars` | `i have cars` | `i have 3 cars` |
| `it cost $40` | `it cost` | `it cost 40` |
| `18th century` | `th century` | `18th century` |
| `call me at 555 1234` | `call me at` | `call me at 555 1234` |

**The compression path was never affected**, which is the distinction that keeps this from being a much larger claim. The dictionary carries the digit tokens directly:

| surface | id |
|---|---|
| `100` | `mn` |
| `18th` | `rLb` |
| `40` | `h4g` |
| `3` | `gdf` |
| `19` | `jpD` |

So `compressor.py` tokenizes, stores and restores numbers, and v0.3's *13/13 files round-trip byte-exact* stands untouched. The loss was confined to the meaning path.

Regression after the fix — nothing broke:

| suite | result |
|---|---|
| `08-MCP-ToolInterface/tests` | 116 passed, 1 skipped |
| `Memory/mneme/tests` | 10 passed |
| `composition_probes` | 26/26 |
| `compound_learning_probes` | 47/47 |
| `conjecture_probes` | 36/36 |
| `phrase_miner --selftest` | PASS |

And a seam closed for free: `18th century` now composes as itself and reads `trusted 0.5935`, where an hour earlier it read `unseen`.

## What broke

**The first fix made it strictly worse.** Adding the digit alternative alone moved `18th century` from `th century` to *nothing at all* — because `18th` now matched the numeric branch, was flagged punctuation by the untouched `is_punct` line, and was dropped whole. Partial loss became total loss. A two-layer bug that is only half-fixed can look like a regression, and it would have been easy to revert the correct half.

**I had documented the bug as a permanent limitation an hour before finding it.** When the probe first failed, the diagnosis was "the table is keyed by dictionary surface, the composer by encoder normalization, and reconciling them would mean re-keying a build artifact from a runtime component." That paragraph went into a docstring, with a measured-sounding note that affected phrases would read under-confident rather than over-confident. It was wrong in the way that is hardest to catch: internally consistent, carefully hedged, and describing a symptom as a cause. **A limitation written into a docstring is a claim, and it deserves the same validation as a result.** This one never got it.

**And the evidence was nearly filtered away.** The failing probe was on `18th century`. The first instinct was that the probe had sampled a bad phrase — numeric, unusual — so the fix was to restrict sampling to purely alphabetic phrases. That change was written. It made the suite green. Had it shipped, the only signal pointing at a total loss of numeric meaning would have been permanently suppressed by a test that looked more rigorous for having a filter in it. The suite would have been green, the docstring would have explained why, and no number would have survived encoding.

## What we deferred and why

- **Re-encoding stored seeds.** Any seed written before this fix has a `vec4d` computed without its numbers. Re-encoding would shift those signatures. No test covers it; it is a data-migration question, not a code one, and it needs a decision rather than a patch.
- **Numeric semantics.** `100` now reaches the encoder — but what is its tier, and what affect does a quantity carry? It currently falls through to the neutral/fallback path. Giving numbers real EPA is a substrate question.
- **Auditing the two tokenizers for further divergence.** Digits were found because something downstream counted. Nothing has systematically compared `compressor.py`'s tokenizer to the encoder's; other classes of token may differ.

## Result and consequence

- `VALIDATED` — **The semantic encoder deleted all numeric content.** Two independent layers: no digit class in `_TOK_RE`, and `is_punct` classifying digit-initial tokens as punctuation.
- `VALIDATED` — **The compression path is unaffected.** The dictionary holds `100`, `18th`, `40`, `3`, `19` with IDs; the byte-exact round-trip claim stands.
- `VALIDATED` — **The fix restores numbers and breaks nothing** across six suites, and closes the compositionality keying seam as a side effect.
- `REFUTED` — **my own documented explanation of that seam.** It was not a keying mismatch requiring build-artifact changes; it was this bug, upstream, and the docstring asserting otherwise shipped for an hour.
- `UNVERIFIED` — the practical impact on already-stored seeds.

The transferable lesson is not "add `\d` to the regex." It is that this is the **second** defect in one day caused by two implementations of a single concept drifting apart — a function-word list that meant different things to facets and to the miner, and now a tokenizer that meant different things to the compressor and to memory. Neither was a sloppy component. Both were correct in isolation and wrong at the seam, and both stayed invisible until something downstream counted and disagreed. Duplication in this codebase does not announce itself as duplication; it announces itself, much later, as a number that is missing.
