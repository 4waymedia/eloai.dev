# Session Summary — Decoder & Search Architecture

**Date:** 2026-06-12
**Scope:** `.eloB` decode performance, search architecture decision, and the path to a shippable "real-time search across all transcripts" product.

---

## TL;DR

The decoder works and is fast enough. The bottleneck for a search product is **not** decode throughput — it's having an ingest pipeline and an index. The decision out of this session: **skip Cython decode optimization for now** and spend the next ~1 week building bulk ingest + a lexical index (Milestones A + B), validated against a real corpus before committing to the full pipeline.

---

## What we covered

### Decoder state
- `.eloB` blob decode is functional and produces correct output.
- Measured decode throughput sits at a **~10 MB/s floor**.
- A Cython rewrite (tracked as **v03**) would raise this, but at meaningful effort (~2 days).
- **Key finding:** 10 MB/s is already adequate for the search latency budget. Decode is not on the critical path for query latency — at search time you decode a small number of candidate blobs, not the whole corpus. The throughput floor only matters for bulk operations (initial ingest), and even there it is acceptable.
- **Decision:** defer v03 Cython optimization. Revisit only if profiling shows decode is actually the limiting factor for a real workload — which we don't expect.

### Search architecture — three milestones, in dependency order

| Milestone | Effort | Output |
|-----------|--------|--------|
| **A: Bulk ingest pipeline** | ~3 days | All transcripts in LMDB as `.eloB` blobs + a metadata index |
| **B: Lexical search** (phrase-atom inverted index) | ~3 days | Sub-millisecond keyword / phrase search across the full corpus |
| **C: Semantic search** (doc embeddings + ANN) | ~1 week | Sub-100ms semantic queries; requires the trained model |

- **A + B is independently shippable** and is enough to ship a "real-time search across all transcripts" product.
- **C upgrades it** from keyword search to conceptual/semantic search. It depends on the trained embedding model.
- Each milestone is independently shippable; no need to build all three before delivering value.

### Relationship to the Memory module
- The Memory module spec already on file is **the same architecture applied to a different problem** (agent memory vs. document corpus).
- The substrate (LMDB store of `.eloB` blobs + phrase-atom index + ANN over embeddings) is shared; only the *consumer* differs.
- Building A + B for document search therefore also de-risks Memory module Phase 1.

---

## Decisions

1. **Defer Cython decode (v03).** 10 MB/s clears the latency budget; optimize only if profiling proves it's the bottleneck.
2. **Build A + B next** (~1 week) — bulk ingest into LMDB plus a phrase-atom lexical index.
3. **Validate cheaply before committing.** Smoke-ingest a bounded real corpus, time queries, and confirm the architecture scales before building the full 250k-document pipeline.
4. **Treat C as a follow-on.** Semantic search waits on the trained model and is layered on top of A + B.

## Open questions (to resolve as we build)

- Where is the *actual* bottleneck for end-to-end search latency — decode, embedding compute, ANN build, or something else? A + B + a smoke test should reveal this.
- What ANN backend for Milestone C, and what is the index build time at corpus scale?
- Does the phrase-atom inverted index dedup ratio hold up on long-form spoken-word transcripts (vs. the original test data)?

---

## Next move (chosen)

Validate the architecture on a **real, bounded corpus** rather than going straight to 250k. The smoke test:

```bash
# Smoke-ingest a bounded set of transcripts into a single LMDB env
python -m semantic_compression.bulk_ingest \
    --src <transcripts-dir> \
    --limit 500 \
    --out search-index.lmdb
```

Then time a handful of queries. If a few hundred docs respond in single-digit milliseconds, the full corpus will respond well within budget once a proper ANN index sits on top.

**The validation target picked for the next session:** 500 Jocko Podcast transcripts, doubling as the source corpus for a planned book. See [`docs/planning/jocko-500-kickoff.md`](../planning/jocko-500-kickoff.md).

> Note: the `semantic_compression` package (decoder, bulk ingest, indexing) lives in the **EloAI core repo**, not in this `eloai.dev` website repo. The new session will need that repo on the path.
