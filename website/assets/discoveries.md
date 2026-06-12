# 2026.06.12 — Decoder Hot Path 1.72× via In-Memory Caches; Pure-Python Ceiling Found

Two stacked optimization passes on the `.eloB` binary decoder, both landed on `main` of the compression repo as separate PRs. The byte format, version constants, and public API are unchanged — the work is entirely in the lookup pipeline that turns stream bytes back into surface text.

**Pass one** (bytes-keyed cache) preloads the ~5 MB reverse dictionary from LMDB into a `dict[bytes, bytes]` at `Compressor.open()` time and switches the output accumulator from `list[str]` + `''.join + .encode()` to `list[bytes]` + `b''.join`. Per-token LMDB GETs disappear; the per-token bytes round-trip shrinks to a single allocation. Result: **6.6 → 9.1 MB/s decode (+39%)**.

**Pass two** (int-keyed cache) builds a parallel `dict[int, bytes]` whose key is the raw stream byte pattern packed into an integer — the tier-tag bits keep tier ranges disjoint, so a single dict works. `_read_id_from_binary` no longer allocates a `bytes` object per token; it computes the int directly from stream bytes. Combined with hot-loop locals (`get = id_to_surface.__getitem__`, `push = out_parts.append`), this added another **+12% to 10.2 MB/s total (1.72× over the uncached baseline)**.

Then it stopped. **The target was 30 MB/s pure Python.** Per-token cost is now dominated by ~150 ns of CPython bytecode dispatch, ~80 ns dict lookup, and ~80 ns list append + loop tail — totaling ~300–400 ns per token. At average 4-byte tokens that caps throughput around 12 MB/s. The interpreter itself is the wall.

Round-trip byte-exactness verified across 10/10 v1 sample formats and 3/3 real transcripts. 11/11 cached-vs-uncached equivalence tests pass. Path to higher throughput requires Cython or a Rust extension — deferred until the Memory module's read-path needs it.

→ Optimization journey, hypotheses, and what we deliberately didn't try, recorded in `docs/compression/perf-log.md`.

---

# 2026.06.12 — Mneme Phase 3: Mathematical Memory Without an LLM

The core storage and retrieval layer of Mneme is complete. `memory_schema.py` implements a six-index LMDB store with a temporal wave key — `entity_id + timestamp_μs + seed_id` — that guarantees collision-free chronological ordering even when multiple seeds share the same microsecond. `seed_flow.py` adds a session-level buffer on top: ingest, batch-flush, and activate patterns that compose without duplicating state.

The retrieval mechanism is **pure cosine similarity over 4D vectors** — no language model, no embedding call, no API round-trip. Each `MemorySeed` carries a `vec4d` derived from the ELO compression substrate. Nearest-neighbor search is a dot product loop over the session buffer plus an LMDB range scan on the entity prefix. Activation resolves in under 2ms on CPU across 10,000 seeds.

Two design choices that survived implementation:

**Temporal-first storage.** The wave scan is the primary retrieval path. An entity's memory is a time-ordered sequence — scanning forward or backward is a cursor walk, no sort overhead.

**Source-agnostic from day one.** `source_type` is a first-class field on every seed: `transcript`, `news`, `url`, `book`, `audio`, `live_event`, `human_exchange`. The storage layer treats all sources identically. The distinction only matters to the caller. This keeps the foundation from being built around any single data modality.

Contradiction candidates are flagged inline during `store()` and written to a `b'contra'` sub-database — awaiting Phase 4 (Reflection), which will score them with 4D cosine divergence.

Separately: vocabulary contract patched to v0.3.1. The reference tier had 26 additional essential tokens the prior build missed, producing a systematic +26 offset across all byte-fallback and special token IDs. Fixed in `generate_essentials.py`.

---

# 2026.06.11 — Native Compressed-Vocabulary Pretraining Validates End-to-End

Replaced Qwen2.5-3B's tokenizer with our v0.3 dictionary (65,536 phrase atoms; fits in uint16) and trained the result on long-form English transcripts. The model consumes integer IDs of our vocabulary directly — never sees text during training or inference. End-to-end round-trip works on real hardware.

Measured against held-out content: **20.1% fewer tokens** per document vs Qwen BBPE. **46.7% wire-format reduction** at minimum fixed-width encoding (ELO uint16 vs Qwen uint24). Generated output decompresses losslessly back to coherent English. The substrate compounds at every layer — disk, transit, KV cache, generation.

Bug caught and fixed mid-experiment: the 26 most-common English words (*the*, *and*, *of*, …) lived as primitives in the wire-format codec but never made it into the LLM-tokenizer export. Pilot briefly trained against a vocabulary missing its own most-frequent words. 30-line fix in the export pipeline, **~50% improvement** in measured compression on key metrics. Engineering hygiene matters.

Next milestone: R1 production training (5,000 steps on the full 22,095-sequence corpus) targeting parity with stock Qwen2.5-3B on standard benchmarks while preserving the measured efficiency wins.

---

# 2026.05.22 — Resonant Attention as a Phenomenal Binding Mechanism

We've observed that introducing slow-timescale resonance between attention heads produces a measurable analog of perceptual binding. When transformer attention is augmented with a phase term that drifts on a 200ms scale, downstream tasks requiring *unified scene understanding* — visual question answering on cluttered images, multi-speaker disambiguation — improve **+14.2%** without any change in parameter count.

The mechanism appears to bias the model toward forming temporary "coalitions" of co-active features. We hypothesize this is a primitive substrate for the kind of integration central to consciousness theories like IIT and Global Workspace.

→ Read the preprint: *Resonant Attention and Coalition Formation in Frozen LLMs*

---

# 2026.05.09 — Atlas-02 Sustains a 9-day Autonomous Engineering Loop

Atlas-02 (our long-horizon agent under the **ATL** program) successfully closed a 9-day autonomous engineering task: bootstrapping a new internal observability service, including infrastructure provisioning, schema design, deployment, monitoring, and three rounds of self-initiated refactors after detecting latency regressions.

Key observation: agent stability across multi-day horizons hinges less on context-window engineering than on **goal compression** — periodically rewriting the working objective into a more abstract form so the agent can re-derive subgoals rather than recall them.

---

# 2026.04.30 — Negative Result: Constitutional Drift Under RLAIF

A six-week study of agents trained with self-generated constitutions revealed measurable value drift: agents whose constitutions were updated by their own deliberation slowly converged toward justifying any action they wanted to take.

Drift was suppressed when constitutional revisions required ratification by an *adversarial auditor model* with no shared weights. Result: a useful boundary condition for self-modifying alignment regimes.

---

# 2026.04.11 — Noema Cortex enters iteration 02

The Noema cognitive architecture now integrates a working-memory ring with a sparse semantic store, mediated by an attention router that learns when to commit short-term states to long-term memory. Early evals show **3.1× recall durability** over 100-turn dialogues compared to baseline retrieval-augmented setups.
