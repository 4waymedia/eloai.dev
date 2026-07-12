# 2026.07.10 — Three Channels, One Fingerprint: The Dictionary Ships as a Coupled Family

*Full write-up. The Field Notes teaser of the same title is cut from this. It is the build-side companion to the next day's "Tri-State Load Rule" post — that one is the reader refusing a mismatched dictionary; this one is the builder that stamps the fingerprint it checks.*

## Problem / context

Our thesis is that a device can do semantic work — compress a page, find similar terms, judge polarity, assemble context, form a reply — without running a language model at inference time, because the understanding is carried by the dictionary itself. That only holds if the dictionary is not a lookup table but a **coupled family**: the vocabulary plus parallel layers of meaning that all agree with each other and are bound so tightly that a word cannot mean one thing in storage and another in a reply. This session we built that family end to end for the browser dictionary (`elo-browser-v01a`, 261,872-word full cut), shipped it, and wired the browser to consume it. Building it exposed real drift and a measurement that stopped us building the wrong thing.

## Background

Two earlier results set up the design. First, a finding we had to accept the hard way: **EPA is affect, not meaning.** Osgood's Evaluation/Potency/Activity — three numbers per word — feels like it should capture meaning, but ask it what's nearest to `car` and it returns `credentials` (0.066), `attention` (0.079), `decoration` (0.081). The retrieval is exact; the space simply cannot tell denotation apart, because it encodes how a word *feels*, not what it *refers to*. That refuted EPA-as-similarity and forced a separate denotation channel: a 768-d `all-mpnet-base-v2` index, where `car → truck, vehicle, automobile`. Second, the coupling hazard: build a dictionary today and `184` means `doctor`; rebuild tomorrow and `184` may mean `system`. An affect file from the first build, loaded against the second, is silently wrong on every id — bytes parse, system runs fast, understanding is corrupted.

So the family design is three parallel arrays over one vocab index `n`: **affect** (`epa.bin`, 3×f32), **affordance** (`facets.bin`, bucket/cue/utility, 4 bytes), **denotation** (`neighbours.bin`, nearest-word indices, CSR). `facets` says what you may do with a word, `epa` how it feels, `neighbours` what it means. Every asset embeds the dictionary's content fingerprint, and the runtime refuses a channel whose fingerprint doesn't match.

## Approach

We turned the build into a compiler: one declarative YAML spec in, a self-contained fingerprint-stamped package out. A `suite` field (`minimal`/`standard`/`full`, plus explicit per-asset overrides) declares how much to build, resolved by a single source of truth (`build_suite.py`) with declaration-dependency fail-fast and soft environment-blocking; a unified entrypoint (`build_dictionary.py`) runs the core build then the asset cascade (facets → meta → epa → meta-L2 → vectors → browser vocab → epa/facets export → neighbours → stamp → verify). Each stage records the dictionary fingerprint it descends from, so staleness is a fingerprint comparison, not a guess.

## Data and examples

The full-family build, on an RTX 5090:

- **Embedding:** 258,254 single-word content surfaces in **22 s** (~12k words/s), the 768-d index built on the build's own vocab cut.
- **`epa.bin`:** 3.14 MB, **208,556 / 261,872 (79.6%)** populated — the unpopulated fifth is structural/rare words with no affect rating, which is correct.
- **`facets.bin`:** 1.05 MB, 100% populated.
- **`neighbours.bin`:** 7.34 MB, **84,864** single-word content entries carry a list (avg **14.8** neighbours); phrases and function words are empty by design.
- Facet classification, spot-checked: `therefore` → RELATION/INFERENCE, `because` → EVIDENCE_CUE+CAUSE, `?` → STRUCTURAL/QUESTION, `analyze` → METHOD/CONTENT.

The browser now loads all three channels from a per-product asset dir and reads `epa[n]`, `facets[n]`, `neighbours[n]` off one `CanonDict.iid(word) → n`.

## What broke

Three failures, none deep, all invisible until the code met a real machine — the tax on "written but never run."

1. **A whole channel had no emitter.** The browser assets and the neighbours map both key off a `<build>.browser.json` vocab file, and *nothing in the repo wrote it* — the one shipped copy came from a tool that had drifted out. A from-scratch browser build could not run. We rebuilt the emitter as a deterministic projection of the frozen token-id contract and validated it by proving it **reproduced the existing vocab file byte-for-byte** (261,872 entries).
2. **`os.fsync` on Windows.** Our atomic-write path — stage, fsync, verify, rename — opened the staged file read-only to flush it. On Linux fine; on Windows `fsync` needs a *writable* handle and raises `EBADF`. The safety code had never run on the target OS. `rb` → `rb+`.
3. **The neighbours export took 40 minutes.** 85k individual nearest-neighbour searches on a CPU index, one Python call at a time. Batching all queries into one matrix search dropped it to seconds. The algorithm was right; the loop was wrong.

A fourth hazard was environmental and worth naming because it recurred across chats today: the dev file-mirror **silently truncated edited modules at clean statement boundaries** — a compile check passing on a file missing its tail. Bytes parse, check passes, meaning gone. It is the exact shape the fingerprint rule exists to refuse, and it forced us to validate logic in isolated replicas rather than trust an in-place read.

## The measurement that stopped a build

The open question was whether phrases needed their own denotation or could compose it from their words. It is measurable: `compositionality = cos( compose(word vectors), embed(phrase directly) )`. High means the phrase is its parts; low means idiom. On 160,121 phrases, only **11,818 were fully composable** (every constituent a content word); on those, median **0.72**, and just **3% idiomatic**. But the examples were the finding: the low-scoring "idioms" were *pragmatic formulas* (`thank god`, `good luck`, `can't wait`) that want a pragmatic tag, not a denotation asset; and most of the inventory wasn't lexical at all — it was ASR discourse (`how to deal with it`) and stutter-repeats (`china china`). So we did not build phrase assets. Instead we added **opt-in hygiene gates** to the miner (repeat-drop, PMI-as-filter, content-density, edge-function, length), which cut a candidate pool from **232,983 → 50,347**, and filed composition for the domain builds that actually contain lexical multi-word terms. Measuring first turned a month of building into an afternoon of not building.

## What we deferred and why

- **Phrase denotation** — deferred to domain builds (medical/legal/code); the conversational corpus has no lexical-phrase layer to justify it. Method and routing captured in `spec-phrase-assets.md`.
- **Markup role-similarity** (`button ≈ a.btn`) — a *third* similarity axis distinct from affect and denotation, specced (`spec-markup-semantics.md`) as the first concrete use of a `relations.bin` asset; not built.
- **Verbalizer on the real family** — it still reads its prototype assets (`vfacets` + the EPA-substrate index), not `epa.bin`/`facets.bin`/`neighbours.bin`. Connecting it is the next move and the one with the most visible payoff.
- **Two single-tenant driver assumptions** and a composite `build_id` (widening today's dictionary-hash to fold normalization + phrase + special-token rules) are tracked in `spec-build-family.md`.

## Result and consequence

- The coupled family **VALIDATED** end to end: three channels over one index, fingerprint-stamped, browser consuming all three offline with zero model calls.
- The build is now one command from a declarative spec, reproducible and auditable, with each derived asset re-derived per build and bound to the dictionary it descends from.
- The consequence is coherence, and coherence is the whole thesis. The verbalizer was starved because it only had affect, and affect cannot choose words; it now has denotation to pick *what* to say and affordance for the word's role. Memory can search by meaning, reflection and context-assembly read the same substrate, and — as the same day's tri-state load rule shows on the read side — a foreign memory field is refused *before a seed is scored*. Understanding does not have to live in a language model. It can live in the dictionary, provided every layer of it is bound to the same word.
