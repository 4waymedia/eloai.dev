# 2026.06.27 — A Regression Corpus for Seed Extraction, and the Concept Gap It Surfaced

*Full write-up. The Field Notes teaser of the same title is cut from this.*

## Problem / context

We had built the recall half of memory — the surface index, exact + semantic recall, facet ranking — but never tested the half it all depends on: whether the extraction pipeline turns a sentence into a *good* seed. The field that matters most is `concept_id`. The inverted index, resonance, contradiction detection, and the seed-field graph all key on it. If the concept is wrong, everything downstream is keyed on the wrong thing, silently. So we built a test corpus to find out — and it found exactly that.

## Background

A `MemorySeed` is one sentence distilled to a structured claim: `entity_id` (who), `relation_id` (the relation), `concept_id` (what it's about), a 4D psychological vector `[Em, Cg, In, Cx]`, a charge, and class fields. The pipeline makes **one seed per input item**. Recall keys on `concept_id`; the surface index keys on the words of `raw_text`. To test extraction we needed two things we didn't have: a real corpus of seeds, and a controlled corpus with known right answers.

## Approach

**First, real seeds.** We wrote `build_memory.py` to run a transcript corpus (14,807 YouTube transcripts are on hand) through extraction and ingest into a `memory.lmdb` with the index built alongside.

**Then, a controlled corpus.** We consolidated three model-contributed drafts into one 190-sentence corpus (`tests/seed_test_corpus.md`): ten groups that each hold an event fixed and vary one dimension (emotion, agency, certainty, framing, time, relational stance, abstraction, contradiction, emergent joining), plus framing/syntax and resonance sets. Each controlled group has a known invariant — what should stay stable, what should vary.

**Then, a fixture.** `run_seed_corpus.py` and `tests/test_seed_corpus_extraction.py` encode those invariants as assertions, so "is extraction correct" became an objective, runnable question.

## Data and examples

**The feeding bug (fixed).** The first real build produced only 90 seeds from 14 transcripts — suspiciously few. The pipeline makes one seed per *item*, and we were feeding whole 30-second chunks (several sentences each), so it extracted ~1 seed per chunk and discarded the rest. Splitting chunks into sentences was ~6× richer:

| input | result |
|---|---|
| 5 chunks fed as chunks | 5 seeds |
| same 5 chunks split to sentences | **29 seeds** |
| 6 transcripts, sentence-split | **419 seeds** |

**The handles question, settled on real data.** Whether to also index the structured handles (`relation_id`/`concept_id`) looked promising on a synthetic corpus (12/12 handle terms recallable only via handles). On real seeds it collapsed: **4/121 (3%)** at 90 seeds, **24/418 (6%)** at 419 — because extraction *derives* the handles from the raw text, so they're almost always already indexed. Decision: index content words only.

**Lexical recall works.** With 50 real corpus seeds indexed, exact queries returned exactly the right topical group every time: `deadline`→all A3, `server`→all A4, `system`→all A7, `recall`→all A9. (`worried`→0 hits — exact match is literal, which is the case for the semantic path.)

**The fixture's verdict on extraction.** 7 invariants passed firmly — entity stays stable where it should (`self`, `model`, `maya`), charge grades with emotion, entity varies correctly across the agency group. But every concept assertion failed:

```
A1  concept = 'arrived'              (want 'message')
A2  concept = 'late'                 (want 'response')
A6  concept = 'new' / 'today' / ...  (want 'pattern')
A7  concept = 'trusts' / 'teaches'   (want 'system')
```

## What broke

`concept_id` = `concept.object`, and `concept.object` = the **last** high-tier content word in the sentence (`step4_concept.py`). The content filter admits any word above a frequency tier that isn't a function word — it filters by **frequency, never by part of speech**. So verbs (`arrived`, `trusts`), adverbs and temporals (`today`, `late`, `new`), and the actual object nouns (`message`, `pattern`, `system`) all compete equally, and whichever lands last wins. In these sentences that's usually a sentence-final verb or a trailing temporal — not the noun the sentence is about. The pipeline computes a richer head→relation→object skeleton but `concept_id` keeps only the last word and throws the rest away.

The deeper reason there's no easy fix: the encoder is **tier/frequency-based and carries no POS tags**, so "pick the last noun" isn't directly available. The signals that *are* available are oblique — config word-lists that already exclude adjectives/adverbs for entity selection, the dictionary's `temporal` vfacet as a weak verb/noun proxy, and the entity detector's own noun resolution.

## What we deferred and why

- **The selection-level fix failed — and that's the finding.** A three-layer object anchor (prefer the detected object-noun; else exclude modifiers/temporals/verbs) scored **0/5**; a corrected version that reads the entity pool reached only **2/5**. The cause runs deeper than selection: the object noun is frequently *absent* from the pipeline's candidate lists. The entity detector tags `felt`/`joyful`/`message`/`arrived` all as category `object` (no noun signal), and for A6/A7/A4 the target noun (`pattern`/`system`/`server`) isn't detected as an entity *or* kept in the tier-filtered content at all. **REFUTED** as scoped: concept extraction's real gap is upstream **noun identification**, not the step-4 selection rule. There are no POS tags to lean on, so the fix needs either stronger noun surfacing (step 3 / tier filter) or noun identification from raw tokens via the dictionary.
- **A4 is genuinely ambiguous.** "The server failed because memory was exhausted" — the object anchor picks `memory` (the cause), but `server` is the subject. That's a subject-vs-object decision, not a bug; left as a tracked `expectedFailure`.
- **Grounding `concept_id` to the dictionary** (canonical surface + EPA + facets, so `parser`/`parsing` converge) is the next phase after extraction is reliable.
- **Relational concepts** — the spec's vision of a concept as "a relationship between things," not one token — is a later frontier.

## Result and consequence

- Sentence-vs-chunk feeding (~6× seed yield): **VALIDATED**.
- Handles add ~3–6% on real data → content-only index: **VALIDATED**.
- Exact lexical recall returns the right topical seeds: **VALIDATED**.
- Concept extraction picks a positional last word, not the concept: **VALIDATED** (the fixture's failing assertions).
- The noun-preference fix at the selection layer: **REFUTED** (0/5; 2/5 corrected). The object noun is often never surfaced upstream, so the real gap is noun identification, not selection.

The corpus turned a vague worry ("are the seeds any good?") into a fixture that names the weakest link precisely: `concept_id`, the field the whole recall layer keys on, was being filled by the wrong word. That's now the next thing to fix, with the failing assertions as the finish line. The lesson is an old one for this project — the test you write to validate the system is most useful when it fails in a specific, reproducible way.
