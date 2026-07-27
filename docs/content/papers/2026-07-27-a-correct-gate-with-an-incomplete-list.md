# 2026.07.27 — A Correct Gate With an Incomplete List: 36.8% of a "Lexical" Phrase Set Wasn't

*Full write-up. The Field Notes teaser of the same title is cut from this. semantic_compression phrase miner; implements the hygiene prerequisite in `spec-phrase-assets.md` §4 and records why its first run silently under-delivered.*

## Problem / context

The phrase miner turns raw n-grams into the dictionary's phrase atoms. Its default output is noisy by design — PMI is a score *weight* rather than a filter, and the score is dominated by byte savings, so the most frequent fragments win regardless of whether they are phrases. `spec-phrase-assets.md` §4 specifies five hygiene gates to isolate genuinely lexical phrases: repeat-drop, PMI floor, content density, edge-function rejection, length sanity.

All five were already implemented, behind an opt-in `--lexical` preset, and a hygiened candidate file already existed. The problem was visible on the first line of it:

```
1   3   34804   7.91   83529   and you know
2   2  156456   5.27   93873   and then
3   3   29160   8.96   69984   and i think
```

`and you know` starts with `and`. The edge-function gate exists precisely to reject that. It was on. It did not fire.

## Background

- **`passes_hygiene()`** already implemented all five gates, each independent and deterministic, defaulting off so the frozen v0.3 candidate contract is preserved.
- **`--lexical`** already wired the preset: drop-repeats, no-edge-function, min-content 1, max-n 4, min-pmi 1.5.
- **`config.FUNCTION_WORDS`** is the repo's function-word set, ported from the browser's Rust implementation.
- **`facets.assign_facet()`** already answers "is this word grammatical glue?" authoritatively via its UTILITY axis.

The gates were not the missing piece. The membership test inside them was.

## Approach

**1. Find why a correct gate did not fire.** The gate read:

```python
if no_edge_function and (words[0] in FUNCTION_WORDS or words[-1] in FUNCTION_WORDS):
    return False
```

`config.FUNCTION_WORDS` has 90 entries and contains no conjunctions. No `and`, `but`, `or`, `so`, `because`, `if`; no `not`; no wh-words. Against `word_classifier`'s 112-entry list, **40 words are missing.**

**2. Establish whether that set is wrong.** It is not — and this is the part worth getting right before "fixing" anything. Its own docstring says the omission is deliberate: *"Words already covered by a LOGIC_SEED_LIST (quantifiers, modals, negation, comparison, temporal, question words) are deliberately omitted — they are already FUNCTION via their cue."* Measured: **32 of the 40** already resolve to `utility=FUNCTION` through the cue path. The set is correct **for facets**, which consults both paths. It is wrong only for a caller doing raw set-membership, which sees one path and not the other.

**3. Ask the authoritative question instead of re-deriving it.** The gates now call the facet:

```python
def is_function_word(w):
    flags = _assign_facet(w)[2]
    return ((flags & UTILITY_MASK) >> UTILITY_SHIFT) != UTILITY['CONTENT']
```

`config.FUNCTION_WORDS` is **not modified**, so facets output and every dictionary build stay byte-identical. The blast radius is zero.

**4. Make the degraded path loud.** The fallback to raw membership is still there for environments without facets, but it now announces itself, because a silent fallback is indistinguishable from the bug.

## Data and examples

The 40 missing words, and their reach into the supposedly-clean set:

| measure | value |
|---|---|
| `config.FUNCTION_WORDS` | 90 |
| `word_classifier.FUNCTIONAL_WORDS` | 112 |
| in the second but not the first | **40** |
| of those, already `utility=FUNCTION` via cue | 32 |
| entries in the "lexical" set with one on an edge | **18,536 / 50,347 (36.8%)** |

Re-mining with the corrected test, on 232,983 raw n-grams:

| stage | pre-fix | fixed |
|---|---|---|
| after hygiene gates | 62,857 | **28,372** |
| after PMI ≥ 1.5 | 55,596 | 26,730 |
| after absorption | 50,347 | **23,918** |
| function-word edges in output | 18,536 | **0** |

The top of the list, before and after:

```
before:  and you know · and then · and i think · like you know · and i was like
after:   lot of people · know what i mean · one of the things · united states · little bit
```

Still discourse-heavy, because score remains byte-savings-dominant and this is a conversational corpus — but the fragments the gate was written to remove are gone.

## What broke

**The fix appeared to change nothing, and the warning is the only reason we knew.** The first corrected run produced 50,347 survivors — identical to the broken output. The reason was a second, independent defect: `facets.py` uses bare imports (`import config`), so it is importable only with `semantic_compression/` itself on `sys.path`. The natural `from semantic_compression.facets import assign_facet` raises, the guard caught it, and the code fell back to exactly the raw membership test it was meant to replace.

Had the fallback been silent, we would have shipped a "fixed" miner that was bit-for-bit the broken one, with a commit message claiming a 36.8% improvement. The warning printed instead:

```
WARNING: facets.assign_facet unavailable — falling back to raw FUNCTION_WORDS
membership, which MISSES conjunctions/wh/negation (and, but, or, so, if, because,
not). This run will NOT be a clean lexical mine.
```

The rule being kept: **a fallback that degrades a result must say so at the moment it degrades it.** A `try/except` that quietly substitutes a worse answer is not robustness, it is a bug with a polite face. The warning was written defensively before it was needed and immediately earned itself.

**We nearly changed the wrong file.** The first instinct on seeing 40 missing conjunctions was to add them to `config.FUNCTION_WORDS`. That would have been wrong: the set is correct for its actual consumer, the omission is documented and deliberate, and editing it would have perturbed facet assignment for every future dictionary build in exchange for fixing one caller's misuse. Reading the docstring before editing the constant is what caught it.

## What we deferred and why

- **Replacing the shipped dictionary's phrase set.** `dict_stats.json` shows the current build was made from the un-hygiened `phrase_candidates.txt`. Rebuilding the dictionary against the hygiened set is a separate, larger operation with its own gates.
- **The remaining discourse dominance.** `lot of people` and `know what i mean` still top the list. Score is byte-savings-dominant by design; changing that is a scoring question, not a hygiene one.
- **Trimming rather than rejecting edge function words.** §4 offers "trim or reject"; we reject. Trimming would rescue `to deal with the` → `deal with`, at the cost of mutating candidates.

## Result and consequence

- `VALIDATED` — **36.8% of the previous "lexical" set carried a function word on an edge.** 18,536 of 50,347, measured directly.
- `VALIDATED` — **The gate logic was correct; only its membership test was blind.** 32 of the 40 missing words already resolve to FUNCTION through the cue path that `assign_facet` consults and raw membership cannot see.
- `VALIDATED` — **Re-mining yields 23,918 survivors with zero function-word edges**, from 50,347.
- `REFUTED` — **Hygiene does not improve compound-detection precision** (14.1% → 14.7%, 7 of 198 dropped). Recorded in the spec so the next pass does not re-run it expecting a different number.

The transferable result is smaller than the numbers and more useful: when a correct rule produces a wrong answer, suspect the *lookup*, not the rule. The set here was not stale or sloppy — it was precisely right for its intended consumer and precisely wrong for a second consumer that asked it a question it was never designed to answer. Two callers, one constant, two different definitions of "function word", and the divergence was invisible until something downstream counted. A `--selftest` now pins the behaviour with 30 checks, so the next caller inherits the answer rather than the assumption.
