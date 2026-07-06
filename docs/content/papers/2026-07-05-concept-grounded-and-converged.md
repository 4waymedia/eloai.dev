# 2026.07.05 — Concept Extraction 4/5 to 5/5, Grounded and Converged Without a Lemmatizer

*Full write-up. The Field Notes teaser of the same title is cut from this. It closes the arc opened by the 2026.07.04 "0/5 to 4/5" post — the fifth case, plus two capabilities the concept now carries: an EPA coordinate, and a canonical form that survives a plural.*

## Problem / context

The prior post left `concept_id` at **4/5**. Concept extraction now picked the right noun for `message`, `response`, `pattern`, and `system`, but A4 — "The server failed because memory was exhausted" — returned `memory`. `memory` is the last noun in the sentence and a true noun; it is just the *cause* in a subordinate clause, not the subject the sentence is about. That is a subject-vs-object decision, not a tagging bug.

Two things beyond the fifth case were also still missing, and both matter downstream. First, `concept_id` was a bare surface string: `server` and `servers` were different concepts, and there was no way to ask whether two concepts were *near* each other. Second, nothing tied the concept to the dictionary — the field the inverted index, resonance, and Reasoning all key on had no coordinate, no membership check, no grounding. This post closes all three: the fifth case (Phase 2.5), grounding (Phase 3.1), and convergence (Phase 3.2), then validates the lot (Phase 4).

## Background

`concept_id = concept.object`, and after the 07.04 fix `concept.object` is the last noun in the sentence, chosen by `noun_lexicon.nouns_in_sequence` over the raw tokens. That rule is positional — "last noun" — so a noun sitting in a trailing subordinate clause outranks the real subject. The dictionary that would ground a concept is `semantic_compression/db/dictionary.lmdb` (a `forward` surface→id map plus a `facets` sub-DB), and affect lives in a separate `epa_substrate.lmdb` keyed by surface. Both are opened read-only through a process-wide `lmdb_cache.get_env` — the shared-env fix from the 06.27 work, without which a third opener of `dictionary.lmdb` would trip py-lmdb's "already open in this process."

## Approach

**Phase 2.5 — the main-clause rule.** The object is the last noun *before the first subordinator*; only if the main clause has no noun do we fall back to the last noun overall (so "…when the message arrived" still yields `message`). The subordinator set is deliberately narrow:

```python
SUBORDINATORS = frozenset({
    "because", "when", "while", "since", "if", "unless", "although",
    "though", "after", "before", "until", "whenever",
})
```

**Phase 3.1 — grounding.** `concept_grounding.ground_concept(surface)` resolves a surface to `grounded` (in the `forward` DB), `epa` (the `(E, P, A)` triple from `epa_substrate`, a `struct '<fff'`), and `bucket` (the `facets` semantic bucket — `TOPIC`/`METHOD`/…). Read-only, deterministic, no model. It does **not** mutate `MemorySeed` — grounding is a capability a consumer calls, not a schema change.

**Phase 3.2 — convergence.** `canonical_concept(surface)` reduces a noun to a candidate base — plural→singular first (`ies`→`y`, `-es`, `-s` with an `-ss` guard), then best-effort derivational (`-ing`, `-er`/`-or`, `-tion`) — and **accepts a reduction only if it is itself an in-dict noun** (`ground_concept(cand).grounded and is_noun(cand)`). That reduce-then-check step is the whole trick: it does the job of a lemmatizer without being one, and the dictionary+noun gate is what keeps it from false-merging.

## Data and examples

The fifth case, after the main-clause rule, across all ten A4 phrasings:

```
"the server failed because memory was exhausted"   -> server
"the logs confirm that the server failed ..."      -> server
```

Convergence, verified against the live dictionary:

```
systems   -> system     memories -> memory      responses -> response
news      -> news        (blocked: 'new' is not a noun)
process   -> process     ('-ss' guard)
parser    -> parser      parsing -> parsing      ('parse' not an in-dict noun -> no merge)
```

Grounding, on the concepts the corpus actually produces:

| surface  | grounded | epa present | bucket |
|----------|:--------:|:-----------:|--------|
| memory   | yes      | yes         | TOPIC  |
| system   | yes      | yes         | TOPIC  |
| server   | yes      | yes         | TOPIC  |
| zzqxwv…  | no       | no          | —      |

And the end-to-end resonance check through the real extractor: `the systems failed` and `the system works` produce a plural and a singular concept, and `canonical_concept` collapses both to `system` — six variant surfaces (`system(s)`, `memory/memories`, `server(s)`) reduce to three concepts.

**Full suite:** 21 tests green — extraction **5/5** (A3 `manager` remains a tracked `expectedFailure`), recall green (two faiss tests self-skip when the substrate isn't loaded), grounding 5/5, convergence 10/10 with one intended skip.

## What broke

**The `that`-complementizer trap.** The first subordinator set included `that`. On "The logs confirm that the server failed," cutting the main clause at `that` left only `logs` — the *reporting* subject — and the real concept, `server`, sat in the clause we had just discarded. The complementizer introduces the concept; it does not subordinate it. Removing `that` (and the relativizers `which`/`who`/`where`) from the set fixed A4 without disturbing the causal subordinators. The lesson: "subordinator" is not one category. Adverbial/causal subordinators (`because`, `when`) push the concept back to the main clause; a complementizer pulls it forward.

**Convergence refusing to invent a merge.** The motivating example for Phase 3.2 was `parser`/`parsing` → one concept. On this dictionary build they did **not** merge — the test that asserts they agree *skipped*, because `parse` is not an in-dict noun, so the gate rejected every reduction and left both surfaces as themselves. This is the gate working, not failing: a `parser` (a thing) and `parsing` (an activity) are arguably distinct concepts anyway, and the safe behavior is to not fabricate a canonical that the dictionary doesn't vouch for. If we later decide they should merge, the fix is a data change (add `parse`), not a code change — which is the right place for that decision to live.

**The near-miss we designed around.** `news` reduces to `new` under the `-s` rule, and `new` *is* in the dictionary. String-and-dictionary alone would have merged them. The noun gate (`is_noun("new")` is false — it's an adjective) is the only thing that stops it. We kept the reduction rules deliberately liberal precisely because the gate, not the rules, is doing the safety work.

## What we deferred and why

- **Wiring `canonical=True` into a concept-keyed recall path.** Grounding and convergence are capabilities, not yet consumed by the seed store — by design, so nothing downstream is forced to migrate and no schema changes. The live adoption (a concept index that buckets on the canonical key) is a separate decision, held off deliberately.
- **A noun lemmatizer for true derivational convergence.** The reduce-then-check trick covers inflection robustly and derivation opportunistically. Full derivational convergence (`parser`↔`parse` regardless of dictionary membership) would need a real lemmatizer or a curated canonical-surface map; not worth it until a consumer needs it.
- **The verb side.** Noun detection is mature; verb detection is a near-empty `METHOD` bucket (~22 surfaces vs ~38,659 `TOPIC`) and the `_find_relation` leftover. It does not touch concept selection (noun-side) and System-2 meta-facets are the intended durable home. Tracked, not built.

## Result and consequence

- Main-clause rule (Phase 2.5): **VALIDATED** — A4 → `server` across all ten phrasings; concept extraction **4/5 → 5/5**.
- Grounding (Phase 3.1): **VALIDATED** — in-vocab concepts resolve to a dictionary atom with an EPA coordinate; OOV surfaces return ungrounded. Concepts are now comparable by EPA distance, not only string equality.
- Convergence (Phase 3.2): **VALIDATED** — inflectional variants merge, false merges are blocked by the dictionary+noun gate, and unsupported merges (`parser`/`parse`) are correctly refused.
- No regression (Phase 4): **VALIDATED** — 21 tests green, including an end-to-end resonance check, with no `MemorySeed` schema change.

The spine the whole memory layer keys on is now reliable, grounded, and convergent — and the fifth case, the false-merge trap, and the missing lemmatizer all resolved to the same shape of answer: a small deterministic rule, checked against structure we already had, rather than a model. The next consumer of this is Reasoning, which keys on concepts and relations directly.
