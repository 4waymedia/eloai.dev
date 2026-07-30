# 2026.07.30 — The Delimiter Had No Id: Markdown Tables Were Not Losslessly Representable

*Full write-up. The Field Notes teaser of the same title is cut from this. semantic_compression S1, dictionary build `elo-browser-v01b` (437,995 entries, fingerprint `495cd535…`), which supersedes `elo-browser-v01a` as the browser's shipped codebook.*

## Problem / context

The text stream separates token ids with a pipe. `compressor.py:194` sets `ELO_DELIMITER = '|'`, and the Rust codec agrees at `elo.rs:754`, formatting `ELO|1|txt|`. A token the dictionary does not know is emitted as `OOV:A:` followed by the raw character.

Those two facts are incompatible, and the incompatibility has a name. A pipe in the source becomes `OOV:A:|` — an encoded part that *contains the delimiter*. Split the stream back apart and the decoder receives `OOV:A:` and an empty string where one token used to be. This is the `unknown stream token:` error that had been surfacing on captured pages.

The scope is not exotic. A markdown table is pipes. A three-line table:

```
| feature | v01a | v01b |
|---|---|---|
| pipe | broken | fixed |
```

encoded under `elo-browser-v01a` produced **12 encoded parts containing the delimiter, turning 42 parts into 54** — twelve phantom empty tokens injected into the frame by the document's own content. Every markdown table Elo had ever read was corrupt at the frame level.

It is also an injection primitive, which is the part that matters beyond correctness. A character that can escape its own encoding can forge token boundaries. Blacklisting does not close that; only total coverage does.

## Background

Nothing here was invented. The pieces existed and were wired together:

- **`force_include`** — a per-build list of surfaces guaranteed a dictionary slot regardless of corpus frequency, resolved by `build_from_spec.py` from the build YAML.
- **Profile cuts** — `tiny` / `compact` / `standard` / `full` / `reference`, computed from rank order. The browser loads `full` (261,872 entries); the LMDB holds all 437,995.
- **`OOV:A:` byte-fallback** — the existing escape for unknown surfaces, and the mechanism that turned an absence into a frame corruption.
- **`ELO_FILE_FORMAT.md:120`**, which already specified `0x1F` (ASCII Unit Separator) as the id delimiter — a spec the code does not implement.

## Approach

1. **Establish what was actually missing.** Not "the pipe was rare" — the pipe was *absent*:

| surface | v01a | v01b |
|---|---|---|
| `\|` | **absent from dictionary** | `gA`, Tier 1, rank 63 |
| `` ` `` | **absent** | `hWm1`, rank 62 |
| `~` | **absent** | `hWmz`, rank 60 |
| `\xa0` | **absent** | `hWmx`, rank 58 |
| `{` | rank 276,119 — outside `full` | rank 56 |
| `}` | rank 276,120 — outside `full` | rank 57 |

Two failure modes, one symptom. `|` and `` ` `` were never in the dictionary. `{` and `}` *were*, at rank 276,119 — beyond the 261,872-entry `full` cut, so present in the LMDB and unreachable by the browser. Both encode as OOV.

2. **Declare a structural floor.** Eleven surfaces in `elo-browser-v01b.yaml` under `force_include`, sorted ahead of frequency-ranked entries so they land inside every cut from `tiny` upward.

3. **Make the frame assert its own integrity** before the join, so this class of bug fails loudly rather than corrupting silently:

```python
bad = [p for p in parts if ELO_DELIMITER in p]
if bad:
    raise ValueError(
        f"frame integrity: {len(bad)} encoded part(s) contain the stream delimiter "
        f"{ELO_DELIMITER!r} — e.g. {bad[0]!r}. The active dictionary cut is missing "
        f"a structural surface; rebuild with it in `force_include`.")
```

The constraint that governed the design: **the surface must be reachable in every profile cut, not merely present in the dictionary.** Presence is what the LMDB records; reachability is what the encoder gets.

## Data and examples

Frame integrity, same markdown table, both builds:

| | v01a | v01b |
|---|---:|---:|
| tokens | 42 | 42 |
| OOV | 14 | 2 |
| parts containing the delimiter | **12** | **0** |
| parts in → out after re-split | 42 → **54** | 42 → **42** |
| frame | **CORRUPTED** | intact |
| stream chars (source 66) | 181 | 121 |

Across captured pages, counting encoded parts that carry the delimiter:

| sample | source chars | v01a poisoned parts | v01b poisoned parts |
|---|---:|---:|---:|
| cnn | 7,311,041 | **24,874** | 0 |
| google-search | 1,967,703 | 3,862 | 0 |
| tomshardware | 2,119,892 | 3,058 | 0 |

The CNN capture carried 24,874 frame-corrupting parts. It had been round-tripping "successfully" in the sense that nothing raised.

All eleven forced surfaces now verify as single tokens and land in every cut, at ranks 51–63:

```
'_'    id=iV    tier=1 rank=54   TCSF      '\r\n' id=hWm0 tier=3 rank=61  TCSF
'|'    id=gA    tier=1 rank=63   TCSF      '\r'   id=hWmy tier=3 rank=59  TCSF
'`'    id=hWm1  tier=3 rank=62   TCSF      '\t'   id=i    tier=0 rank=52  TCSF
```

Gates on the package: `verify_facets` passes on 437,995 entries; `verify_lossless` passes byte-exact on all 10 sample formats.

## What broke

**The rank floor was applied and then discarded.** The first v01b build recorded `force_include_count: 10` and `tier0_rank_floor: True`, and changed nothing: `|` came out holding the Tier-1 id `gA` at rank **437,989** — a cheap id sitting outside every cut. The cause was a second sort two hundred lines below the floor:

```python
# Re-sort to be explicit; should already be by frequency desc
all_records_in_dict.sort(key=lambda e: -e[1])
```

The comment was true when written and false afterward. Profile cuts derive from *that* list, so the base64 ids kept the intended order while cut membership took a different one. An invariant established early and undone later is worse than one never established, because the build reports it as applied.

**`"\r"` was a silent no-op.** The spec forced `\r`, but `tokenize("a\r\nb")` returns `['a', '\r\n', 'b']` — CRLF is one token. Every Windows-authored file emitted `\r\n` and paid the OOV price while the forced `\r` sat unused, and `force_include_count` reported 10 of 10. The count measured declaration, not coverage. The builder now warns when a forced surface is not a single token, and the spec forces `\r\n`.

**Three of our own findings were reader bugs, not build bugs.** We reported a duplicate `\n` holding two ids, and `\r\n` missing from the dictionary. Both were artifacts of reading `token-ids.csv.gz` without `newline=''`, which lets universal-newline translation rewrite CR inside quoted fields — so a surface of `'\r\n'` reads back as `'\n'`. We also re-derived "Tier 0 has 11 free slots" from `tier0_count: 53`, which is the exact error `DICTIONARY_SLOTS_SPEC.md` already records as corrected in its own errata. The rule we are keeping: read the corrections section before re-deriving a number the spec has already litigated.

## What we deferred and why

- **Moving the delimiter to `0x1F`.** `ELO_FILE_FORMAT.md` specifies it; the code does not implement it. With the pipe now carrying an id, no encoded part can contain a pipe, so the frame is intact without the change. The spec/code divergence remains open and should be closed on its own merits, not as a bug fix.
- **Tier 0 promotion for `>`.** At 1,044,282 corpus occurrences it is the strongest candidate for a 1-char id, but Tier 0 is 58 primitives plus 6 slots reserved for System 2, and CLAUDE.md forbids spending those from System 1.
- **The `dropped_tier0_bigrams` filter** (601 dropped this build) may be comparing a phrase id against the source length rather than against two ids plus two delimiters. `UNVERIFIED` — flagged, not investigated.

## Result and consequence

- **`VALIDATED` — markdown tables were not losslessly representable under `elo-browser-v01a`.** A three-line table produced 12 delimiter-carrying parts and expanded 42 encoded parts into 54 on re-split.
- **`VALIDATED` — the pipe's absence, not the delimiter's identity, was the defect.** Giving `|` a reachable id removes the only path by which a pipe enters the stream. Frame integrity was restored with the delimiter unchanged.
- **`VALIDATED` — 24,874 frame-corrupting parts in one captured CNN page under v01a, zero under v01b.**
- **`VALIDATED` — presence in the dictionary is not reachability.** `{` and `}` existed at rank 276,119 and were unreachable by a browser loading a 261,872-entry cut.
- **`REFUTED` — `force_include_count` measures coverage.** It counts declarations. `"\r"` was declared, injected, and unmatchable.

What this unlocks: markdown is now a first-class input to the codec, which matters because the repo's own documents, the papers, and the field notes are markdown. The injection surface closes as a property of the dictionary rather than of the corpus happening to contain a character — total coverage means an escaped character cannot forge a token boundary, and that argument now holds for every profile cut down to `tiny`.
