# 2026.06.27 — Lexical Recall for the Seed Store: Exact Match, Expansion, and One Shared Dictionary

*Full write-up. The Field Notes teaser of the same title is cut from this.*

## Problem / context

ELO's memory could recall a seed two ways: pull an entity's seeds in time order, or rank seeds by cosine over a 4D psychological vector. Neither answers the question recall is actually for — *which stored memories are about this concept?* There was no path from a word, or a neighborhood of related words, to the seeds whose content mentions them. We verified the gap at the schema level: `memory.lmdb` opens exactly six sub-databases (`seeds`, `sid`, `cls`, `src`, `contra`, `meta`) and **not one is lexical**.

This is the build that closes that gap — a surface-keyed inverted index over the seed store, fed by verbalizer query-expansion and ranked by the vfacet layer. It went in cleanly. Then the *full* test suite found three collisions a unit test never would, and fixing them produced a small operating principle worth keeping.

## Background

Three pieces already existed. The **verbalizer** takes a point in EPA space and expands it into a ranked set of dictionary phrase-atoms, each carrying a vfacet (agency / direction / temporal / domain / polarity) — pure arithmetic, no model. **`facet_recall`** scores a candidate's vfacet against a query intent (match 1.0, unknown 0.6, mismatch 0.25; per-axis weights). **`seed_surfaces`** turns a seed's text into clean content-word surfaces, dropping the ~52% of the token stream that is whitespace and punctuation. The join key across all of it is the lowercased **surface**, pinned by the facet standard.

What was missing was the thing in the middle: an index from surface to seed.

## Approach

Built in four phases.

- **A · Store** (`invindex_store.py`) — an LMDB sidecar `recal_invindex.lmdb`: `b'post'` (surface → set of seed_ids), `b'sterms'` (seed_id → its surfaces, for clean deletes), `b'meta'` (dictionary fingerprint). Postings are sorted, NUL-joined UTF-8 sets. `add`/`remove` are idempotent and update-safe.
- **B · Indexer** (`invindex_builder.py`) — each seed's `raw_text` → `SeedSurfacer` surfaces → store. Rebuildable, stamps the dictionary fingerprint (the version guard).
- **Ingest wiring** — `RecalEngine(index_surfaces=True)` indexes each batch after the flush; opt-in, default off, existing behavior unchanged.
- **C · Query path** (`recall_seeds`) — expand the query into surfaces, look each up, union the postings into candidate seeds, rank by vfacet. Returns `SeedRanked` (seed_id + matched surfaces + base/facet/final scores + facet). Crucially it runs **two passes**: L0 exact-match on the literal query terms (scored above expansion, so a known surface always returns its seeds — including out-of-vocabulary words) and L1 semantic expansion unioned on top.

Two decisions we refused to guess became knobs instead: `expand_top` / `expand_score_floor` (expansion cap) and `index_handles` (also index `relation_id`/`concept_id`), with a measurement harness (`bench_invindex.py`) to lock them on real data.

## Data and examples

Phase tests, all green without the substrate (synthetic seeds): store + indexer **27/27**, query path **8/8**, facet ranking **12/12**.

Deterministic recall, end to end: index a seed whose text is `"I promised I would ship the parser"`, then query the surface `parser` →

```
recall_seeds(surfaces=['parser']) -> [SeedRanked(seed_id=..., surfaces=['parser'], ...)]
```

`parser` is out-of-vocabulary — it has no dictionary ID at all — and it is still the most discriminating recall key, which is exactly why exact-match must not depend on the dictionary.

The `index_handles` measurement on a synthetic corpus, via `bench_invindex.py`:

| metric | value |
|---|---|
| seeds | 6 |
| handle terms tested | 12 |
| content-only surface keys | 17 |
| +handles surface keys | 29 (+12) |
| handle terms recallable **only** with handles | **12 / 12** |

When concept/relation identifiers differ from the raw text (here, every one did), indexing them adds recall a content-only index can't reach. The real magnitude is corpus-specific — that's what the harness is for.

## What broke

The unit tests passed. The full suite did not, and the cause was a single fact: **py-lmdb refuses to open the same environment twice in one process** (it raises `"already open in this process"`, and `lock=False` does not change this — we reproduced it). Three independent components each opened the *same* `dictionary.lmdb`: the verbalizer substrate, the seed-surface segmenter, and the fingerprint reader. Alone, fine. Together — which is exactly what `recall_seeds` with `index_surfaces=True` does — they collided, and one left open poisoned later test classes.

The fix is a process-wide shared env cache: every read-only open routes through `get_env(path)`, so there is only ever one environment per dictionary, loaded once and shared.

That fix had its own trap. The cache module gets imported under two names — `lmdb_cache` from the verbalizer's import path, `semantic_compression.lmdb_cache` from the surfacer's. Those are **different module objects with separate module-level state**, so each would have held its own registry and the collision would have returned. We pinned the registry to a single attribute on `sys`, making it a true process singleton. Verified directly: the two import names resolve to different modules but share one registry and return the same env.

Then two smaller cascades, each a real gap the collision had been masking:

- An all-OOV query (`parser`) has no EPA rating, so the verbalizer can't build a centroid to expand from — which aborted the whole call. Exact-match needs no EPA, so expansion is now wrapped: no centroid ⇒ serve exact-match only.
- An OOV surface has no vfacet, so its node carried an empty facet `{}`, and a consumer asserting a `direction` key failed. Exact-match nodes now carry a full `UNKNOWN` facet, keeping every result's metadata shape uniform.

The principle that fell out: **read-only shared resources load once and are shared; writable per-instance stores stay isolated; queries degrade gracefully.** A separate failure — two `RecalEngine`s in one temp dir colliding on their *writable* `recal.lmdb` — is the same principle from the other side: writable stores must not share paths.

## What we deferred and why

- **Union vs intersect** for the expanded (L1) surfaces. Defaulted to **union**; intersect over expanded synonyms is not wired, because a seed rarely contains all ~20 neighbors of a concept. **UNVERIFIED** as the final call — the bench decides.
- **`expand_top` / `expand_score_floor` values.** Exposed, not set. The verbalizer ranks by EPA L2 distance, not embedding cosine, so the prior "top-20..50 / cosine 0.70" starting point does not port — it must be measured here.
- **`Compressor.segment()`** — a one-method System-1 refactor to drop `seed_surfaces`' private import. Held until System 1 is next touched; the private import works now.

## Result and consequence

- Memory has lexical recall — surface → seeds — that it did not: **VALIDATED** (built, tested, deterministic known-surface recall).
- The shared-dictionary collision and its three cascades: **VALIDATED** as fixed (reproduced, fixed, re-verified including the dual-import singleton).
- The two index-tuning decisions: **UNVERIFIED** — now measurable via `bench_invindex.py`, not guessed.

The verbalizer, the index, and the facet scorer are now one pipeline: a query expands into a neighborhood of surfaces, those surfaces pull candidate seeds, and the vfacet layer ranks them. What remains is not building — it's feeding in a real corpus and a verbalizer run to lock the caps and the union/intersect call. The hard part turned out not to be the index. It was getting one dictionary to be read by everything that needs it, exactly once.
