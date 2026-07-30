# 2026.07.30 — Two Kinds of Redundancy: Dictionary-Then-gzip Wins on Prose and Loses on Markup

*Full write-up. The Field Notes teaser of the same title is cut from this. semantic_compression S1, measured through the production `.eloB` encoder (`ELO_BIN_VERSION = 2`) against dictionary build `elo-browser-v01b`.*

## Problem / context

The `.elo` transport strategy is two-stage: encode to dictionary ids, then gzip. That only pays if the two stages compose. There is a specific reason to think they might not.

gzip's LZ77 pass earns its ratio on long repeated literals. A web page is full of them — `<div class="`, `data-ved=`, repeated attribute names. Dictionary encoding replaces exactly those long literals with short unrelated ids, which is a direct attack on the redundancy gzip depends on. If that effect dominates, the pre-pass makes the final artifact *larger*, and the whole strategy is backwards.

The question had never been measured. The v0.3 milestone reports `.elo` ratios in isolation; nothing recorded what happens when gzip runs afterward.

## Background

- **`Compressor.encode_bytes_binary`** — the production `.eloB` encoder. Unlike a naive id dump it runs `_strip_implicit_spaces` and `_longest_match_scan`, so predictable whitespace disappears and multi-word phrases collapse to a single id.
- **`elo-browser-v01b`** — 437,995 entries, fingerprint `495cd535…`, the build whose structural floor is covered in the companion papers.
- **26 public-domain books** in `Resources/books/`, and three captured web pages in `semantic_compression/data/samples/`.
- **gzip level 9** as the baseline, since that is what a transport layer would use.

## Approach

1. **Measure the composition, not the stages.** For each document compare `gzip(raw)` against `gzip(encode_bytes_binary(raw))`. A result below 1.00x means the pre-pass helped gzip; above means it hurt.

2. **Use the production encoder, not a model.** An earlier pass used a hand-rolled varint scheme. It was wrong in a way that mattered — see `What broke`.

3. **Separate prose from markup**, because the hypothesis predicts they diverge. The constraint: **both stages must see the same bytes**, so no extraction, no cleaning, no sampling.

## Data and examples

Ten books, production encoder, gzip -9:

| book | raw | gz(raw) | .eloB | gz(.eloB) | .eloB alone | vs gzip |
|---|---:|---:|---:|---:|---:|---:|
| frankenstein | 120,948 | 47,718 | 56,747 | 38,662 | 2.13x | **0.81x** |
| crime_and_punishment | 112,147 | 43,868 | 56,537 | 36,132 | 1.98x | **0.82x** |
| a_christmas_carol | 109,149 | 44,155 | 57,307 | 36,495 | 1.90x | **0.83x** |
| dracula | 113,090 | 44,051 | 56,457 | 37,144 | 2.00x | **0.84x** |
| sherlock_holmes | 595,296 | 224,535 | 306,167 | 187,605 | 1.94x | **0.84x** |
| count_of_monte_cristo | 2,725,444 | 999,659 | 1,455,504 | 837,368 | 1.87x | **0.84x** |
| the_string_of_pearls | 2,379,744 | 884,009 | 1,231,774 | 745,552 | 1.93x | **0.84x** |
| alice_in_wonderland | 170,549 | 60,168 | 93,190 | 51,347 | 1.83x | **0.85x** |
| complete_shakespeare | 2,317,246 | 897,400 | 1,544,026 | 799,239 | 1.50x | **0.89x** |
| modern_english_biography | 4,631,975 | 1,795,696 | 3,728,226 | 1,765,044 | 1.24x | **0.98x** |

**10 of 10 beat gzip alone. Mean 0.85x, range 0.81–0.98x.**

The outlier explains itself. `modern_english_biography` is a biographical reference work, and the encoder logs **42,020 OOV tokens** in it against **97** in Frankenstein and **135** in Alice. It is wall-to-wall proper names — precisely the content no fixed vocabulary can hold, so the dictionary contributes almost nothing and gzip is left doing the work alone.

Markup runs the other way. These figures come from a varint model, not the production encoder, because the production encoder cannot encode these files at all (see `What broke`):

| sample | gz(raw) | gz(elo model) | vs gzip |
|---|---:|---:|---:|
| google-search | 414,488 | 443,378 | 1.07x |
| tomshardware | 438,572 | 480,040 | 1.09x |
| cnn | 1,263,767 | 1,436,234 | 1.14x |

The mechanism is the one the hypothesis predicted: markup's redundancy is long literal repeats inside gzip's window, and replacing them with short ids destroys matches gzip would have found for free. Prose redundancy is *vocabulary* — a nine-character word recurring across a 327-million-token corpus becomes a two-byte id because the dictionary was trained on that distribution. gzip cannot know that; it sees 32KB at a time.

**The dictionary captures global redundancy. gzip captures local redundancy.** On prose they add. On markup the dictionary destroys what gzip was going to use.

## What broke

**The production encoder cannot encode any captured web page.** All three samples raise:

```
ValueError: OOV token too large: cap_len=300 body_len=1799
```

The OOV record writes the capitalisation mask with a **one-byte length prefix**, but `encode_caps` emits one character per 6 bits, so any OOV token beyond ~1,530 characters overflows it. Real pages carry them: cnn has 19 tokens over 255 characters (longest 1,799), google-search 85 (longest 776), tomshardware 46 — **longest 18,775**. They are base64 blobs, JWTs and inlined JSON. This is not a rare edge: it is every page we tried. The markup half of this paper is therefore model-derived, and the claim is weaker for it.

There is a second-order absurdity worth naming. The encoder was computing a capitalisation mask for a base64 blob — data with no linguistic case at all — and the mask it produced was one sixth the length of the token, incompressible, and then too large to store.

**The varint model masked the one interesting data point.** The first pass used a hand-rolled encoder and reported `modern_english_biography` at 0.85x, indistinguishable from the novels. The production encoder puts it at **0.98x**. The model was uniformly optimistic, so it flattened exactly the variance that carries the finding — that the win tracks OOV density. Had the paper shipped on model numbers it would have claimed a tight 14–15% band across all prose, which is false.

**The first measurement of this question pointed the other way.** Measuring the *text* stream gave 1.11x–1.21x, i.e. worse than gzip everywhere, and we nearly concluded the strategy was refuted. That was the pipe-delimited text stream, which is not what `.elo` ships. The direction reversed on prose once the binary format was measured. Same question, three encoders, three answers — the format under test has to be the format that ships.

## What we deferred and why

- **Fixing the CAP length field.** A two-byte prefix, or skipping the caps pass for tokens with no alphabetic characters, would both work. It is a `.eloB` format change and belongs with the format work, not a measurement paper.
- **Re-measuring markup with the production encoder**, blocked on the above.
- **Implementing the per-document branch.** The consequence below is arithmetic, not code.
- **Testing other compressors.** zstd and brotli have larger windows and would shift the local/global balance, possibly reversing the markup result.

## Result and consequence

- **`VALIDATED` — dictionary-then-gzip beats gzip alone on prose, 10 of 10 books, mean 0.85x**, measured through the production `.eloB` encoder.
- **`VALIDATED` — the win tracks OOV density.** 42,020 OOV tokens drives the worst result (0.98x); 97 drives the best (0.81x).
- **`VALIDATED` — the production encoder raises on all three captured web pages**, because the OOV capitalisation mask has a one-byte length field and real pages contain tokens up to 18,775 characters.
- **`UNVERIFIED` — that the pre-pass hurts on markup.** Measured at 1.07x–1.14x through a varint model only; the production encoder could not be run.
- **`REFUTED` — that the text-stream measurement answers this question.** It reported 1.11x–1.21x, the opposite direction on prose, because it measures a format `.elo` does not ship.

What this unlocks is a branch rather than a fix. The win or loss is measurable at encode time on the actual document, so the encoder can compress both ways, keep the smaller, and record which in a header byte. One bit of format, and `.elo` becomes *never worse than gzip* — including on the markup where it currently loses. The finding is not that the pre-pass is good or bad; it is that the pre-pass is good at something specific, and cheap to skip when that thing is absent.
