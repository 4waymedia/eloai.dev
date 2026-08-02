# 2026.07.31 — The Runtime Form Is Not the Shipping Form: 20x Smaller, and Fitting Closes the Gap

*Full write-up. The Field Notes teaser of the same title is cut from this. semantic_compression S1. Follows "A Trained zstd Dictionary Beats Us at Compression" (2026.07.31) and answers the two objections it left standing: that our dictionary was the wrong size, and that its resident cost was too high.*

> **CORRECTED 2026-07-31, after publication.** The first version of this paper was
> titled *"The Dictionary Is a Rank-Ordered List"* and asserted that "position is the
> id." **That is false.** Ids interleave across tiers — ranks 1330–1337 run
> `u3`(T1), `gBH`(T2), `u4`(T1), `gBI`(T2) — and only 317 of 399 consecutive pairs
> are even monotonic. Reconstructing an id from a rank requires the tier scheme, the
> reserved first-character ranges, the Tier-0 primitive map and the interleave rule.
> That is an algorithm, not an offset.
>
> The measured sizes are unaffected: they were taken from the real surface list. What
> changes is the explanation. The 20x reduction comes from **not shipping a B-tree**,
> not from ids being implied by position.

## Problem / context

The previous paper conceded compression to zstd. Two objections survived it, both raised against the result rather than by it:

**The dictionary was fitted to the wrong corpus.** `elo-browser-v01b` ships 261,872 entries built for browser/web use. Measured against a 200-transcript corpus, **230,598 of them (88%) never fire** — while a third of its capacity holds HTML structure and CSS utility classes. A simulated fitted build had *fewer* OOV tokens than the shipped one despite being 8x smaller. It was not short of vocabulary; it was carrying the wrong vocabulary.

**The resident cost was measured on the wrong artifact.** We compared a 13MB `dictionary.lmdb` against a 1MB trained zstd dictionary and called it a 13x disadvantage. But LMDB is a *runtime* structure — a B-tree with page overhead, a forward map, and a reverse map derivable from the forward one. It is not what you would ship.

Both objections turn out to be right, and fixing them changes the verdict.

## Background

- **`build_from_spec.py`** — builds a dictionary from a declarative corpus spec. Already supports `size: char-3` and held-out files.
- **Frequency-rank id assignment** — Tier 0/1/2/3 slots are filled in frequency order. This is the property the whole paper turns on.
- **`profile-cuts.json`** — tiny / compact / standard / full / reference, all cuts of one ranking.
- **zstd trained dictionaries** — the competitor, retrained per experiment throughout.

## Approach

1. **Build one Elo dictionary from 22 public-domain books**, holding out 4 (`alice`, `frankenstein`, `dracula`, `a_christmas_carol`).
2. **Train one zstd dictionary on the same 22 books.** One dictionary each — a per-file dictionary is meaningless, since you would have to ship it with the file.
3. **Measure both on the same 4 held-out books**, reporting bytes *and* resident cost.
4. **Then ask what the dictionary actually costs to ship**, as opposed to what its runtime form weighs.

The governing constraint: **every held-out file excluded from both dictionaries.** `build_from_spec`'s `held_out_books` handles Elo's side; zstd's trainer only sees the 22.

## Data and examples

### The fitted build

`books-fitted-v1`, char-3, 83,253 entries: **19,628 words + 63,625 phrases, and zero Tier-3 ids.** A corpus using ~79k surfaces fits inside Tier 0+1+2 (83,264 slots), so the 4-character tier is never reached — the tier promotion that fitting buys.

### One dictionary each, four held-out books (513,736 bytes)

| approach | bytes | ratio | resident |
|---|---:|---:|---:|
| **elo + zstd + 1MB dict(elo)** | **151,866** | **3.38x** | 1.37 MB |
| zstd + 4MB dict(raw) | 153,141 | 3.35x | 3.7 MB |
| zstd + 2MB dict(raw) | 155,135 | 3.31x | 2.1 MB |
| elo + xz | 157,152 | 3.27x | 0.33 MB |
| zstd + 1MB dict(raw) | 157,383 | 3.26x | 1.0 MB |
| xz (no dict) | 177,752 | 2.89x | — |
| zstd (no dict) | 180,385 | 2.85x | — |
| elo alone | 269,185 | 1.91x | 0.33 MB |

This morning `elo + xz` lost to a trained zstd dictionary by **25%**. With the dictionary fitted to the corpus it now leads — by **0.8%**, which on four books is a tie, not a win. The honest statement is *parity*, and parity is a large move from 25% behind.

### The runtime form is not the shipping form

`dictionary.lmdb` is a **runtime** structure: a B-tree with page overhead, a forward map, and a reverse map that is derivable from the forward one. None of that needs to travel. Serialised as a list of surfaces — plain, highly compressible text — the same content is:

| representation | bytes | vs LMDB |
|---|---:|---:|
| `dictionary.lmdb` (runtime form) | 6,595,072 | 1.00x |
| rank-ordered surfaces, raw | 959,025 | 6.9x |
| + gzip -9 | 401,402 | 16.4x |
| **+ zstd -19** | **340,093** | **19.4x** |
| + xz -6 | 330,292 | 20.0x |

**330KB against zstd's 1,048,576-byte trained dictionary.** The artifact that was the cost disadvantage is a third the size of its competitor's.

### Shipped / unpacked / runtime, for both builds

| | shipped (zstd) | unpacked | runtime | load |
|---|---:|---:|---:|---:|
| books-fitted (83,253 entries) | **340,093 B** | 959,025 B | 15.2 MB map | **9.1 ms** |
| browser v01b (437,995 entries) | **1,609,756 B** | 4,864,455 B | 20.6 MB map | 107 ms* |

\* measured parsing the shipped `.browser.json` (12,867,697 B), the path `canon()` uses today.

### What the browser ships now, and what it could

| asset | on disk | zstd -12 |
|---|---:|---:|
| `elo-browser-v01b.browser.json` | 12,867,697 | 2,630,511 |
| `neighbours.bin` | 7,342,917 | 4,623,525 |
| `epa.bin` | 3,142,544 | 1,016,231 |
| **`facets.bin`** | **1,047,568** | **25,937** |
| **TOTAL** | **24,402,885** | ~8.3 MB |

Two things stand out. **`facets.bin` compresses 40x** — 4 bytes per entry across 261,872 entries, and evidently almost all the same 4 bytes. And the 12.9MB vocab json holds the same information as a 1.6MB rank-ordered list, so JSON is costing **8x** for a structure whose ids are already implied by order.

A browser shipping the compact vocab plus compressed channels is roughly **7MB instead of 24MB**, and should load faster than 107ms of JSON parsing.

## What broke

**`build_from_spec` hardcoded the phrase file, so no build was ever corpus-fitted.** Line 138 pointed at `data/phrase_candidates.txt` — phrases mined from the 327M-token *transcript* corpus, carrying transcript frequencies. The first books build came out **81,434 transcript phrases against 1,819 book words, dropping 163,118 book words**. Its top entries were `'you know'` (539,244) and `'going to'` (275,046); Victorian novels do not say *you know* half a million times. The `corpus:` block only ever governed the word half of the competition. Fixed by moving `phrase_file` into the spec, and by adding `mine_phrases_from_corpus.py` so a corpus can produce its own phrases.

**Our own compact format lost 33 entries.** Serialising the surface list newline-delimited silently dropped every surface *containing* a newline — 57 of them, including `\n`, `\r\n` and phrases spanning lines. The map loaded 83,220 of 83,253 and reported success. This is the third time this week a newline in a delimiter position has corrupted a format that looked fine (the pipe in the stream delimiter; the CSV read without `newline=''`). Fixed with a NUL separator, which UTF-8 text cannot contain, and verified by asserting the entry count round-trips.

**The 0.8% is one sample.** The previous paper's headline reversed when re-run on different books. Four held-out books is thin, and this result should be treated as provisional until it is repeated on transcripts and on a larger literary sample.

**And this paper shipped with a false mechanism in its title.** It claimed ids are assigned by rank so "position is the id" — a tidy sentence that explained the 20x, and was wrong. Ids interleave across tiers and only 317 of 399 consecutive pairs are monotonic. The size measurements were real; the explanation attached to them was invented to make them make sense, and it survived because it sounded like the kind of thing that would be true. Reaching for a mechanism *after* seeing a number is how you end up publishing one you never checked. The compression was always just "a B-tree is not a wire format."

## What we deferred and why

- **Shipping the compact vocab in the browser.** The 8x saving is measured; the loader change is not written. `canon()` parses `.browser.json` today.
- **Compressing the channel assets.** `facets.bin` at 40x is free money, but it is a load-path change and the family-fingerprint guard would need to verify post-decompression.
- **A transcript-fitted build.** Predicted to widen the margin further, since transcripts are the domain the corpus actually favours.
- **Markup.** Still expands under Elo in every measurement.
- **Encryption and rotation.** A keyed permutation over the id space would rotate the mapping for 32 bytes per epoch rather than 330KB. Sketched, unmeasured, unclaimed.

## Result and consequence

- **`VALIDATED` — corpus fitting closes the gap.** Same corpus, same held-out set, same code: `elo + zstd` moved from 25% behind a trained zstd dictionary to 0.8% ahead. Call it parity.
- **`VALIDATED` — the dictionary compresses 19–20x** once serialised rather than shipped as its runtime B-tree. 6,595,072 → 340,093 bytes; the browser's 437,995-entry vocab → 1,609,756.
- **`REFUTED` — that ids are positional.** Asserted in the first version of this paper and false: ids interleave across tiers (ranks 1330–1337: `u3` T1, `gBH` T2, `u4` T1, `gBI` T2), and only 317 of 399 consecutive pairs are monotonic. Rank plus the assignment algorithm gives an id; rank alone does not.
- **`VALIDATED` — a fitted char-3 build contains no 4-char ids.** 19,628 words + 63,625 phrases in 83,253 slots.
- **`VALIDATED` — load cost is 9.1 ms** for 83,253 entries from the compact form, against 107 ms to parse the shipped JSON for 261,872.
- **`VALIDATED` — `facets.bin` compresses 40x**, and the browser's 24.4MB of assets compress to ~8.3MB.
- **`REFUTED` — that resident cost is a structural disadvantage.** It was a representation choice. 330KB shipped is smaller than the competitor's dictionary.
- **`UNVERIFIED` — that the 0.8% holds.** One four-book sample, and this exact class of result reversed earlier today.

What this opens is larger than the ratio. The dictionary turns out to have three distinct sizes — **shipped, unpacked, and resident** — that differ by a factor of twenty, and until today we quoted whichever one was in front of us. Separating them makes several things newly practical: per-corpus dictionaries at 330KB, rotation cheap enough to do hourly, a browser that ships a third of its current payload, and an encryption story that operates on an artifact small enough to treat as a key rather than a database.

None of that was visible while "the dictionary" meant one number. A B-tree is a structure for looking things up quickly, not a format for moving them; conflating the two cost us a comparison we did not need to lose.
