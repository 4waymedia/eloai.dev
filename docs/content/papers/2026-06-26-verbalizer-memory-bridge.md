# 2026.06.26 — Query Expansion as Memory's Recall Front-End

*Full write-up. The Field Notes teaser of the same title is cut from this.*

## Problem / context

ELO's memory can recall a stored seed two ways. It can pull every seed for an entity in timestamp order (the temporal wave), or it can rank seeds by cosine similarity against a 4D query vector. Both are real and useful. Neither answers the question recall exists to answer: *which stored memories are about this concept?*

There is no lexical path — no route from a word, or a cluster of related words, to the seeds whose content mentions them. A user (or another ELO subsystem) who wants "what do we know about shipping deadlines?" has no way to ask it. Temporal recall needs an entity, not a concept; vector recall needs a 4D point in a space the question isn't phrased in.

Separately, ELO has a component built to enumerate the conceptual neighborhood around an idea: the **verbalizer**. It was not wired into memory. This work maps how it should connect, builds the one dependency that was fully determined, and is deliberately honest about what is specified versus what is built.

## Background

**The verbalizer** (System 2, semantic-meanings package, `semantic_compression/verbalizer.py`) is a semantic field expander. Its input is a point in EPA space — Evaluation, Potency, Activity, each on a ±4 scale — plus a Surov process stage. Its output is a `SemanticField`: a ranked list of `SemanticNode`s, each carrying a `phrase_atom` (the surface string), a `token_id` (dictionary ID bytes), a `score`, a `pole_signature`, a `facet_profile`, and an `epa_distance`. It runs as pure arithmetic over a FAISS index and the dictionary — **no model call at any step**. It expands; it does not rank by importance and does not decide which neighbor matters. Entry points: `expand()`, `suggest()`, `label()`.

**Memory** (`06-RecalEngine` over the mneme `SeedFlow`) stores `MemorySeed`s — 13-field records carrying `entity_id`, `relation_id`, `concept_id`, a `vec4d` psychological signature `[Em, Cg, In, Cx]`, a `charge`, classes, and `raw_text`. They persist in `memory.lmdb`. `RecalEngine` exposes `recall(entity_id)` (temporal wave), `similar(vec4d, k)` (4D cosine), `by_class`, and `by_source`.

**The facet standard** (`SEMANTIC_FACETS_SPEC.md`) pins the one fact that makes any bridge possible: the universal join key across ELO's dictionaries is the **surface base, lowercased**. System 1 keys its per-entry layers by `id_bytes`; mneme keys `epa`/`templates`/`facets` by lowercased surface. Surface is the join; IDs are local and, per project rule, still provisional until the char-4 dictionary build.

## Approach

The design is **expansion, then recall**:

```
query text
  → segment to surfaces  +  (optional) EPA centroid
  → verbalizer.expand(EPA) → SemanticField → related surfaces
  → look up surfaces in an inverted index → candidate seed_ids
  → rank with memory's existing logic (vec4d cosine, charge, graph)
```

The verbalizer takes the place a vector search would normally hold, expanding one concept into its neighborhood of surfaces. The inverted index turns those surfaces into candidate seeds. Ranking is unchanged behind it.

That requires a component memory does not have: a surface-keyed inverted index over the seed store, `surface → set(seed_id)`. We specified it as a stage-06-owned sidecar (`SEED_INVINDEX_SPEC_DRAFT.md`), modeled on the System-1 ELO-search postings stack (`bench_elo_search.py`), keyed on surface (never the provisional token_id), with `seed_id` (a stable UUID) as the posting value.

Before building anything, we validated dependencies against the actual code — the project rule is to treat all design claims as hypotheses until checked. The one dependency on the critical path was the segmenter that converts a seed's `raw_text` into surfaces. We built that front-end (`recal_engine/seed_surfaces.py`) and tested it against the live dictionary.

## Data and examples

**The seed store has no surface index — verified, not assumed.** `memory_schema.py` opens exactly six sub-databases: `seeds`, `sid`, `cls`, `src`, `contra`, `meta`. None is lexical. The only `inverted` index in the whole memory design (`Memory.md §5.5`, `ROADMAP.md`) is keyed on `memory_id` — the resolved storage layer — not on `seed_id`, and is itself unbuilt. Nobody had specified one at the living-seed layer.

**The segmenter runs standalone.** `compressor.py` imports only `lmdb`, `caps_codec`, `config`, `format_adapters`, `tokenizer` — no FAISS, no spaCy, no sentence-transformers. The reusable unit is `_longest_match_scan(tokens, txn, fwd_db)`, which returns surfaces directly, fed by `tokenizer.tokenize(text)`.

**Worked example.** Input seed text:

```
"you know what i mean the thing is i was kind of afraid,
 but i promised i would ship the parser. it's done now!"
```

Raw segmenter output interleaves words with structural tokens. After the content-word filter, lowercase, and stop-set drop, `SeedSurfacer.surfaces()` returns:

```
['know', 'what', 'mean', 'thing', 'kind', 'afraid', 'but',
 'promised', 'would', 'ship', 'parser', "it's", 'done', 'now']
```

Clean keys, lowercased, phrases preserved, `parser` (out-of-dictionary) retained.

**Measurements.**

| Measurement | Value |
|---|---|
| Tokens in the sample line | 48 |
| — word | 23 |
| — whitespace | 22 |
| — punctuation | 3 |
| Structural share of stream | **52%** |
| Dictionary ID for `' '` / `'.'` / `','` / `'!'` / `"'"` | `g` / `j` / `k` / `n` / `p` |
| Dictionary ID for `afraid` / `promised` / `ship` | `gTC` / `iYJ` / `gcE` |
| Seed-store sub-databases (none lexical) | 6 |
| `seed_surfaces` test groups, live dictionary | 6 / 6 green |

The structural-token IDs are short (Tier-0 single character); the content-word IDs are longer (Tier-2/3). That length gap is the heart of the gotcha below.

## What broke

**The "is it in the dictionary?" filter is a trap.** The intuitive way to drop junk keys is to keep only surfaces that exist in the dictionary. It fails completely here. Space, period, comma, bang and apostrophe each have a real dictionary entry with a short Tier-0 ID, so a membership check passes them straight through. Feeding that into an inverted index is pathological: `' '` would land in nearly every seed, producing the single largest, least-discriminating posting list in the store — worst-case selectivity, storage, and query cost at once. The only filter that works keys on token *class* (`classify() == CLASS_WORD`), not dictionary membership. A pure code read would not have surfaced this; the dictionary's structural-token IDs are a property of the built data, invisible in the source. Running it on the live `.lmdb` is what caught it.

**Vector search looked like the obvious bridge. It is blocked.** The natural instinct is "embed the query, find near seeds." But the verbalizer lives in 3D EPA space, and seeds carry a 4D `[Em, Cg, In, Cx]` psychological signature on different natural axes. No projection between the two exists. `RecalEngine.similar()` cannot consume a verbalizer coordinate. The bridge therefore cannot be similarity; it has to ride the discrete surface join.

**Two dictionaries, one trap.** The verbalizer reads `semantic_compression/db/dictionary.lmdb`; seed content references the mneme dictionary at `Memory/data/dictionary.lmdb`. They are different files with different content hashes. A `token_id` from one is not guaranteed to mean anything in the other — exactly the ID-alignment risk the project's own history flags. This is why the index keys on surface, not ID.

**OOV words turned out to be the best keys.** The segmenter keeps unmatched, out-of-dictionary words as surfaces (`parser`, `LIKELY_IMPACTS`). These have no facet/EPA backing, so the verbalizer can't expand to them — but they are precisely the discriminating terms a user would recall a seed by. An "in-dictionary only" index would have silently dropped the most valuable handles. The resolution: index content-word surfaces including OOV; they are recallable by exact surface match even when expansion can't reach them.

**A green test still needed a rescue.** The unittest harness repeatedly failed with a traceback that didn't match the source — `lmdb.Error: already open` pointing at a docstring line. The cause was not the code: the sandbox file mount was serving a truncated copy of the test file and the interpreter compiled stale fragments. This is the editor↔shell sync lag the project has hit before and learned to attribute correctly rather than chase as a phantom bug. We proved the utility green by direct execution against the live dictionary instead. The lesson the project already wrote down held: when a failure's evidence is internally contradictory, suspect the environment before the code.

## What we deferred and why

- **The index build itself.** It waits on two upstream gates: the facets `unknown`-reduction pass (which stabilizes the surface set and normalization) and verbalizer testing (which sets the expansion parameters). Building before those land would hard-code guesses.
- **The public `Compressor.segment()` refactor.** `seed_surfaces.py` currently imports the private `_longest_match_scan`. A one-method public wrapper would decouple stage 06 from System-1 internals, but it edits a frozen-status module mid-facets-work for a hygiene-only gain. Held until the seed work, when System 1 is touched deliberately and its test suite runs anyway.
- **Open index-design questions**, parked in the spec for test data to settle: union vs. intersect for multi-surface queries, the expansion cap, whether to index structured handles as well as content words, the exact whitespace/hyphen/apostrophe normalization contract, and the postings physical encoding.

These are deliberate non-decisions, not gaps. The order is fixed: results first, spec second, code last.

## Result and consequence

- The seed store has no surface-recall path: **VALIDATED** (six sub-DBs, none lexical).
- The segmenter dependency is standalone, lightweight, and returns surfaces directly: **VALIDATED** (imports checked, run on live dictionary).
- The content-word filter is correct and necessary: **VALIDATED** (6/6 test groups green; the 52%-structural and Tier-0-ID measurements explain why).
- EPA↔vec4d similarity as the bridge: **REFUTED** (no projection; dimensional and axis mismatch).
- Surface is the join key: **VALIDATED** (facet standard, confirmed both ends).
- The seed-store inverted index: **UNVERIFIED** — specified, not built, by design.

The spine of the whole integration is one decision that the data keeps reinforcing from different angles: bind to the **surface**, not the ID. Vector search can't bridge the spaces; the two dictionaries don't share IDs; the provisional IDs are still moving. The surface survives all three. When the facet pass and the verbalizer test land, the index is a short build on top of a front-end that already works — and the verbalizer becomes the expansion stage memory was missing.
