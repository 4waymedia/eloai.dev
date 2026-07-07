# 2026.07.04 — Concept Extraction: 0/5 to 4/5, and the Noun Tagger Already in the Pipeline

*Full write-up. The Field Notes teaser of the same title is cut from this. This completes the story started in the 2026.06.27 "concept gap" post — which ended with the fix `REFUTED`.*

## Problem / context

`concept_id` is the field the whole memory layer keys on — the surface index, resonance, contradiction detection, the seed-field graph, and (later) Reasoning. A test corpus had shown it was the weakest link: concept extraction returned `arrived` for "message arrived," `late` for "the response was late," a verb or adverb instead of the noun the sentence is about. The prior post reported a selection-layer fix that scored **0/5** and closed on an honest `REFUTED`. This post is the resolution — and the fix turned out to be smaller and more embarrassing than the failure suggested.

## Background

`concept_id = concept.object`, and `concept.object` was the **last high-tier content word** — positional, filtered by frequency, never by part of speech. So verbs and trailing adverbs competed on equal footing with the object noun, and whichever landed last won. The first fix tried to be smarter about *which candidate to select*. It scored 0/5. The reason we found next is the whole point.

## Approach — three dead ends and the thing that worked

**1. The selection-layer fix was in the wrong layer.** Running it showed the object noun is frequently *absent* from the pipeline's candidate lists entirely: the entity detector tags `felt`, `joyful`, `message`, and `arrived` all as category `object` (no noun signal), and the tier filter drops the noun from the content chunks before selection sees it. You cannot select a noun that was thrown away upstream.

**2. The dictionary has no part-of-speech signal.** The natural next thought — "ground concept identification in the dictionary" — we checked directly, and it's a dead end for POS:

| signal | verdict |
|---|---|
| `word_library.pos_tag` (old SQLite schema) | table is **empty** in the production dict |
| `vfacet.temporal` (STATE/PROCESS/EVENT/…) | doesn't discriminate: `message`(noun)=EVENT **and** `arrived`(verb)=EVENT; `system`(noun)=STATE **and** `felt`(verb)=STATE |
| `semantic_bucket` | **uniform** (`1`) across nouns, verbs, adjectives |

This is by design, not an oversight: the dictionary is organized by *semantic role* (TOPIC / METHOD / CONCEPT / RELATION), not grammar — and POS is meant to be derived in extraction. (The `TOPIC` bucket is a coarse noun-ish proxy, but `METHOD`, the verb bucket, is near-empty — ~22 surfaces vs ~38,659 `TOPIC` — so it is not a real POS tag.)

**3. The pipeline already had the tagger.** `noun_lexicon.py` — a rule-based, no-model noun detector: a static WordNet/Wiktextract noun list, determiner/possessive context cues ("the server," "its memory" override noun/verb homographs), `-ed`/`-ing`/`-ful` verb/adjective exclusions, and high-precision noun suffixes (`-tion`/`-ness`/`-ity`). The whole time, the fix was to run *this*, on the **raw tokens**, instead of the lossy chunk list.

## Data and examples

Validated before touching production code, `nouns_in_sequence` over the raw tokens:

```
A1  'message arrived'   -> ['message']           last = message
A2  'the response'      -> ['response']           last = response
A4  'server ... memory' -> ['server','memory']    last = memory
A6  'model ... pattern' -> ['model','pattern']     last = pattern
A7  'the system'        -> ['system']             last = system
```

Target noun **present 5/5**. Note A1 returns only `['message']` — `felt`/`arrived` excluded as verbs, `joyful` as an adjective — so the exclusions work. Wired into `step4_concept` (object = last noun distinct from head, head = subject/first noun, relation = the non-noun leftover between them), the measured corpus result:

```
A1 message  PASS    A2 response PASS    A6 pattern PASS    A7 system PASS
A4 -> memory  (the cause; 'server' is the subject)          CONCEPT: 4/5
```

The relation extraction is the quiet win: the predicate is defined as "the leftover between the head-noun and the object-noun that is neither a noun nor a function word" — no verb list, so it catches `learned`, `failed`, `felt` alike, present or past. That sidesteps the verb-detection asymmetry entirely for this purpose.

## What broke

The instructive failure wasn't a bug — it was **fixing the wrong layer**. We spent a pass making the *selection* rule smarter (exclude adverbs, prefer object-entities) when the actual loss was *upstream*: the noun never reached the selector. And the second instinct — reach for the dictionary — was right in spirit (ground it in structure) but wrong in fact: the dictionary deliberately holds semantic role, not POS. The signal we needed was neither in the selector nor the dictionary; it was a mature, deterministic tagger sitting one module over, and the only thing wrong was that concept selection was reading tier-filtered chunks instead of the raw sentence.

The honest remaining edges:
- **Verb detection is asymmetric.** Nouns are robust (lexicon + rules); verbs are only a curated `ACTION_LEXICON`, with no general rule-set. It doesn't bite concept selection (which needs the *noun*), but it's a real gap.
- **A4 is genuinely ambiguous.** "The server failed because memory was exhausted" — the last noun is `memory` (the cause); `server` is the subject. That's a subject-vs-object decision, deferred to a small follow-up (prefer the main-clause subject).

## What we deferred and why

- **A4 / subject-vs-object (Phase 2.5): now resolved → 5/5.** A "main-clause noun wins" rule: the object is the last noun *before the first subordinator* (`because`/`when`/`that`/…); only if the main clause has no noun does it fall back to the last noun overall. So "server failed because memory was exhausted" → `server` (subject), while "…when the message arrived" → `message` (the main clause has no noun). The fifth was a design decision, and the decision took a dozen words of rule.
- **Grounding `concept_id` to a canonical dictionary atom (Phase 3):** so `parser`/`parsing` converge, and concepts become comparable (EPA distance) — which recall and Reasoning both want.
- **System-2 meta-facets (later):** the durable home for richer per-token role/POS, including the verb side. Deliberately *not* built now — lean on `noun_lexicon`, let meta-facets refine it when they land.

## Result and consequence

- Selection-layer fix: **REFUTED** (0/5) — corrected from the prior post's cliffhanger.
- Dictionary as a POS source: **REFUTED** (no discriminating field; POS is derived in extraction by design).
- `noun_lexicon` on raw tokens: **VALIDATED** — concept extraction 0/5 → **4/5**, with the 5th a genuine ambiguity, not a bug.

The lesson is the plainest kind: the deterministic signal already existed, and the failure was feeding the selector the wrong tokens. The spine that recall and Reasoning key on now resolves the right word four times out of five — and the fifth is a design decision, not a defect.
