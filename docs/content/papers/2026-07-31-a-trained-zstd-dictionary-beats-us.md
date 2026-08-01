# 2026.07.31 — A Trained zstd Dictionary Beats Us at Compression: The Ratio Was Never the Claim

*Full write-up. The Field Notes teaser of the same title is cut from this. semantic_compression S1, dictionary build `elo-browser-v01b`. Supersedes the framing of "Two Kinds of Redundancy" (2026.07.30), whose measurements stand and whose benchmark does not.*

## Problem / context

The day before, we published that dictionary-then-gzip beats gzip alone on prose — 10 of 10 books, mean 0.85x. That is true and it is the wrong benchmark, for a reason that takes one command to discover:

```
zstd --train
```

If a format's argument is "ship a dictionary and compress against it," then the honest comparison is against **other formats that ship dictionaries**. zstd has supported trained dictionaries for years. Nobody had run that comparison, so the published claim was resting on a competitor chosen for being beatable.

There is also a cost the earlier paper never counted: **the receiver needs the dictionary.** A `.elo` file cannot be read without the build that made it. gzip and xz are self-contained. Any ratio that ignores 13MB of required resident data is not a like-for-like number.

## Background

- **`Compressor.encode_bytes_binary`** — the production `.eloB` encoder. It now runs on captured web pages, which it could not do yesterday (the OOV capitalisation-mask defect from the previous paper, fixed the same day).
- **zstd trained dictionaries** — `zstandard.train_dictionary(size, samples)`, a first-class feature that extracts frequently-recurring substrings from a corpus.
- **The four baselines** — gzip -9, zstd -19, brotli, xz. The three modern ones are within a few percent of each other on text.
- **`elo-browser-v01b`** — 437,995 entries, built from 327M tokens of *transcripts*, with the website/HTML structure group folded in. That provenance turns out to be the whole story.

## Approach

1. **Elo alone against the four**, on prose and on markup.
2. **Elo composed with each** — does the pre-pass help or hurt a general compressor?
3. **Elo against a trained zstd dictionary** — the fair fight.
4. **zstd dictionary scaling** — is dictionary size the axis?
5. **A zstd dictionary trained on `.eloB` streams** — the two-stage stack.
6. **Cross-domain, everything held out** — the test that matters.

The constraint throughout: **every corpus held out from every dictionary**, and where a result looked good, re-run it on a different sample before believing it. That last rule is what produced the most useful finding.

## Data and examples

**Elo alone is not competitive.**

| | elo | gzip | zstd | brotli | xz |
|---|---:|---:|---:|---:|---:|
| alice | 1.83x | 2.83x | 3.13x | **3.33x** | 3.19x |
| Shakespeare | 1.50x | 2.58x | 3.15x | **3.20x** | 3.19x |
| google-search.html | 0.84x | 4.75x | 9.01x | **9.62x** | 9.25x |

**Composed, it helps all four** — four books, 16 of 16:

| | X(raw) | X(elo) | |
|---|---:|---:|---:|
| gzip | 196,092 | 163,648 | **0.83x** |
| zstd | 180,385 | 160,843 | 0.89x |
| brotli | 185,967 | 164,264 | 0.88x |
| xz | 177,752 | 158,212 | 0.89x |

The gain *shrinks as the compressor improves* — 17% on gzip, 11–12% on the modern three — because better compressors already recover some of what the dictionary contributes.

**Then the fair fight, and we lose it.** A zstd dictionary trained on 16 held-out books, tested on 4 others:

| zstd dict size | total | vs plain |
|---|---:|---:|
| 0.11 MB | 164,874 | 0.914x |
| 1.00 MB | 130,336 | 0.723x |
| **2.10 MB (saturated)** | **118,050** | **0.654x** |

| approach | bytes | receiver needs |
|---|---:|---:|
| **zstd + 2.1MB trained dict** | **118,050** | **2.1 MB** |
| elo + xz | 158,212 | 13 MB |
| xz alone | 177,752 | — |

**25% better at a sixth the resident size.** Requesting 4MB, 8MB or 13MB returned the same 2.1MB dictionary — zstd's trainer is bounded by its 7.2MB training corpus, not by the ask.

**High uniqueness does not rescue it.** The intuition that Elo should win where nothing repeats — because its compression is per-token and needs no in-document repetition — is measurably wrong:

| corpus | elo | zstd | zstd+dict |
|---|---:|---:|---:|
| 20k **unique** in-vocab words | 2.04x | 2.15x | **2.25x** |
| 20k unique random identifiers | **0.81x** | 1.35x | 1.35x |

Even with 100% unique, fully in-vocabulary words, Elo loses. General compressors **entropy-code**; English stays predictable letter-by-letter when no word repeats. Elo substitutes and stops. And random identifiers make the file *expand*.

**The two-stage stack, and the finding that survived re-testing.** Training zstd's dictionary on `.eloB` streams rather than raw text — so it learns the id distribution — gave 107,459 bytes (4.78x) on four novels, against 130,336 for `zstd+dict` on raw. A 21% win.

Re-running on a different book sample reversed it. The cross-domain measurement, 1MB dictionaries trained on 8 books, everything below held out:

| test set | zstd | zstd+dict(raw) | **elo + zstd+dict(elo)** |
|---|---:|---:|---:|
| transcripts .json | 5.47x | 5.72x | **6.03x** |
| papers .md | 2.18x | 2.36x | **2.39x** |
| books (biography + Shakespeare) | 3.17x | **3.20x** | 3.14x |
| html captures | 8.59x | **8.62x** | 7.47x |

**The variable is domain match, not technique.** `elo-browser-v01b` was built from transcripts, and transcripts are where it wins most (+5.4%). Technical prose wins slightly. Books heavy with proper nouns and archaic vocabulary lose narrowly. Markup loses badly, as it has in every measurement.

### The obfuscation, which nobody designed

A property with no design intent, measured because it was noticed. Encoding *Alice* and analysing the **emitted id stream** — what a receiver without the dictionary actually sees:

| | raw tokens | emitted ids |
|---|---:|---:|
| most frequent symbol's share | 38.7% | **11.2%** |
| entropy | 6.10 bits | **8.92 bits** (uniform: 12.86) |

Implicit-space stripping and phrase merging remove the dominant symbol that makes a substitution cipher trivial — 68,984 tokens become 37,325 emitted ids, **46% absorbed into multi-word phrase ids**. The dictionary holds 174,529 multi-word phrases against 87,343 single words, so one id routinely spans several words.

And frequency ranking barely separates anything: **92 of 7,453 distinct ids (1%) are uniquely determined by frequency rank.** Ranks 4 and 5 differ by one occurrence. **4,796 ids appear exactly once** and cannot be ranked at all. Tier 3 addresses 16,777,216 ids and this build uses 354,742 — the id space is **2% populated**, so an unseen id cannot be assumed invalid.

What this defeats: letter-frequency analysis (no letter mapping exists), word-boundary detection (spaces are implicit), and one-id-equals-one-word (46% are phrases).

What it does not: the top 5 ids are rank-identifiable and cover 29% of the stream, and **known plaintext is fatal and cumulative** — the dictionary is a static global key, so mappings recovered from one document work on every other.

## What broke

**We published a 4.78x that was a sampling artifact.** The two-stage stack measured 21% better than the best alternative — on four ordinary Victorian novels. Re-run on `books[:3]`, it *lost*. The cause was not method: `books[:3]` is 97% *Modern English Biography* (4.7MB, 42,020 OOV proper names) and *Shakespeare* (2.4MB, archaic vocabulary) — the two worst cases in the corpus. Same code, opposite verdict, different books. It was caught only because the rule was to re-run good-looking results on a different sample before believing them.

**An "entropy floor" that wasn't a floor.** We computed the Shannon entropy of the id stream under the dictionary's own frequency model — 75,799 bytes for *Alice* — and reported that 18% of the file was wasted, implying a dedicated entropy coder was worth building. But `elo + xz` measures **49,172**, far *below* that "floor." The model was static and unigram; LZMA is adaptive and context-modelling, and a document's local distribution is far more skewed than a corpus average. The lesson: a bound is only a bound relative to a model, and quoting one without naming the model invites exactly this error.

**We analysed the wrong stream for the obfuscation claim.** The first frequency analysis ran on raw tokenizer output and found a symbol at 38.7% — apparently damning. But the encoder strips implicit spaces and merges phrases before emitting; the attacker sees 11.2%. Analysing the input to a transform rather than its output produced a conclusion that was wrong by a factor of three, in the pessimistic direction.

## What we deferred and why

- **A transcript-corpus dictionary.** `elo-browser-v01b` is a browser/web build, and it still wins on transcripts. A build matched to that corpus should widen the margin, and it is the like-for-like comparison against zstd's trainer, which we retrained per experiment while holding Elo's dictionary fixed.
- **Markup through the production encoder.** Now possible since the OOV fix; the markup rows above still come from a varint model.
- **Entropy-coded ids.** Deferred as probably redundant — the outer compressor already entropy-codes, better than the static model we tested against.
- **Rotation and permutation schemes.** A keyed permutation over the id space would rotate the mapping for 32 bytes per epoch rather than 13MB. Interesting, and not measured, so not claimed.

## Result and consequence

- **`REFUTED` — `.elo` is competitive as a compression format.** A 2.1MB trained zstd dictionary beats `elo + xz` by 25% at a sixth the resident size. Any claim positioning `.elo` on ratio should be withdrawn.
- **`REFUTED` — the 4.78x two-stage result.** Reproduced on a different book sample it reverses to a loss. It was sample selection.
- **`REFUTED` — that low duplication favours Elo.** At 100% unique in-vocabulary words it still loses, because it does not entropy-code.
- **`VALIDATED` — Elo composes with every general compressor tested**, 16 of 16, 11–17%.
- **`VALIDATED` — the win tracks domain match.** Transcripts +5.4% (the build's own corpus), papers +1.3%, proper-noun-heavy books −1.9%, markup −13%.
- **`VALIDATED` — the emitted stream resists frequency analysis far better than the token stream.** Top id 11.2% (not 38.7%), 1% of ids uniquely rank-determined, 4,796 hapax, id space 2% populated.
- **`UNVERIFIED` — that a corpus-matched build widens the margin.** Predicted by the domain-match result; not built.

What this changes is the claim, not the work. `.elo` costs more bytes than a trained zstd dictionary and needs more resident data, and in exchange the intermediate form is **addressable** — facets, affect, ids and neighbours available without decompressing — and it is **obfuscated for free**, with measured limits. Those are the properties worth defending. They are also properties no general compressor offers at any ratio, which makes them a better argument than a number we would lose.

The practical consequence is that these are complements, not competitors: nothing stops `.elo` payloads travelling under zstd with a trained dictionary. The encoding is for addressability; the transport is for bytes. Framing them as rivals was our error, and it cost a published benchmark to notice.
