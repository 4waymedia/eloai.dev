# 2026.07.26 — Compounds Are Taught, Not Mined: Why "Car Wash" Was Never in the Dictionary

*Full write-up. The Field Notes teaser of the same title is cut from this. Wonder faculty + mneme encoder; the teaching path behind `compound_learning_formula`. Sets up the same week's measured refutation of automatic compound discovery.*

## Problem / context

Ask Elo about a car wash across three sentences and it files the memories in three different places. "I drove to the car wash" lands under `drive`. "The car wash was closed" lands under `closed`. "I hate that car wash" lands under `hate`. The real-world thing the person is talking about — the car wash — is never the key, because the seed former ranks candidate concepts by emotional loading and `car` and `wash` are two ordinary words that happen to be adjacent.

The obvious fix is to make the dictionary know that `car wash` is one unit. The dictionary is large and was built by mining n-grams from a 186-million-token corpus, so the reasonable assumption is that a common compound is in there somewhere, and the work is a lookup.

It is not in there. We checked seven common compounds — `car wash`, `ice cream`, `high school`, `hot dog`, `front door`, `credit card`, `cell phone` — against both the 167,876-entry mined phrase-candidate list and the dictionary's own templates sub-db. **Zero hits. All seven.** Scaling the corpus does not help, because the thing the corpus is full of is not compounds.

## Background

Most of the machinery already existed; this was a wiring job with one missing piece.

- **`semantic_encoder._scan_phrases()`** already collapses a multi-word match into ONE `TokenChunk`, with composite EPA and a phrase template that overrides the word-sum. It just needed to be told which spans are units.
- **`MemorySeed.is_phrase_seed`** is already a first-class field on the seed.
- **The Wonder question contract** (`form_question_seed`, `WONDER_QUESTION_CONTRACT`) already defines how a question Elo asks becomes a seed the scheduler can retire.
- **`concepts/card.py`'s trust tiers** — TAUGHT (0.9) / CONFIRMED (0.8) / READ (0.4) / GUESSED (0.2) — already named the vocabulary for how much to trust a piece of knowledge by how it arrived.

## Approach

**1. Measure the assumption before building on it.** The mined candidate list and the templates sub-db were queried directly for the seven compounds. Result above: zero. What the conversational corpus actually yields, inspected, is discourse formulas (`and you know`, `oh yeah i was`) and ASR fragments (`china china`) — the published *Three Channels, One Fingerprint* measurement found the same shape: 160k candidates, only 11,818 fully composable.

**2. Make teaching the path.** If it cannot be mined it must be said, so the mechanism is a teaching utterance with an anchored grammar:

```python
_TEACH_IS_ONE = re.compile(
    rf"^{_QUOTED}\s+(?:is|are)\s+(?:a\s+|one\s+)?(?:single\s+)?"
    rf"(?:thing|concept|word|unit)s?\b{_END}", re.I)
```

`_END` requires the named-phrase clause to close at punctuation or end-of-string, so an incidental *"the presentation is one thing I need to finish"* does not fire while *"ice cream is one word, not two"* does.

**3. Persist where a build cannot wipe it.** Taught phrases go to `learned_phrases.json`, **not** `dictionary.lmdb` — the dictionary is a build artifact that the dictionary build regenerates, so anything written into it is silently destroyed on the next build. JSON also means a person can open the file and correct what Elo believes it was taught, which for a teaching mechanism is the deciding property.

**4. Consult it before the dictionary.** One insertion in the phrase scanner, ahead of the LMDB lookup:

```python
if learned and phrase_str in learned:
    result.append(word_tokens); i = j; matched = True; break
```

**5. Express it as a Formula.** The repo has a Formulas subsystem with a canonical schema and a closed op vocabulary; a new learning behaviour belongs in it rather than beside it. `compound_learning_formula` is authored as a three-step analytic formula (parse → classify → check_consistency), registered in `CATALOG.md` and the runtime registry, and dispatched natively.

## Data and examples

| check | result |
|---|---|
| 7 common compounds in 167,876 mined candidates | **0 found** |
| 7 common compounds in the templates sub-db | **0 found** |
| taught-phrase grammar, anchored cases | 9/9 |
| `hard drive` / `red tape` / `solar system` chunk as one atom after teaching | yes |
| survives gateway restart (fresh store load) | yes |
| full probe suite, real encoder + real dictionary | **47/47** |

The end-to-end behaviour, run against the live encoder:

```
teach:  "'car wash' is one thing"   -> registered (tier=taught, confidence=0.9)
later:  "I drove to the car wash"   -> 'car wash' is ONE TokenChunk (is_phrase=True)
                                    -> concept_id resolves to 'car wash', not 'drive'
```

## What broke

**The concept fix was aimed at the wrong field first.** The seed former's concept extraction treated `chunk.is_phrase` as meaning "this is a relational connector phrase". It does not — it means "this matched a multi-word dictionary entry", which is a different and much larger set. Only *calibrated* phrases carry a `seed_class`. The corrected test requires both, and the fallback prefers a multi-word phrase with ties broken by emotional loading rather than taking the loudest single word.

**We started coding before reading the subsystem's own spec.** The first version of the teaching mechanism was ordinary Python functions sitting in the wonder package. The correction was blunt and right: *"the teaching/learning should become a formula. You need to refer to the documentation on formulas."* The repo's own standing rule — read the spec for every term before building on it — had been skipped, and the work had to be re-architected onto the Formula schema after the fact. The rule earns its place by being the one most often skipped under momentum.

**We built a tracking document for an approach already refuted.** Before the measurement, a `DICTIONARY_ADDITIONS.md` was created to log "proposed dictionary additions" for later mining. The measurement landed the same day and the document had to be marked SUPERSEDED within hours. Building the bookkeeping for a strategy before testing whether the strategy works is a way of committing to it early.

## What we deferred and why

- **Automatic discovery** — detecting an untaught compound in ordinary conversation, rather than waiting to be told. Built and measured separately the following day; it is the subject of its own paper, and the result is not the one we wanted.
- **`READ` (0.4) and `GUESSED` (0.2) tiers** — named in the store so the field never needs a breaking rename, produced by no path yet.
- **Cross-turn recurrence weighting** — ranking candidates by resonance rather than by a single utterance. Needs a co-occurrence tracker that does not exist.

## Result and consequence

- `VALIDATED` — **A compound cannot be mined from this corpus.** Seven common compounds, two separate inventories, zero hits.
- `VALIDATED` — **A taught compound chunks as one atom and survives restart.** 47/47 probes against the real encoder, real dictionary and real store.
- `VALIDATED` — **Concept keys stop scattering for taught phrases.** A later mention files under the compound, not under the sentence's loudest verb.

The consequence is a shift in where knowledge is expected to come from. The dictionary is a very good record of how people *talk* and a poor record of what they talk *about*; the second is supplied by a person, one phrase at a time, and the trust tiers exist so the system can say how it knows. That makes teaching a first-class input path rather than a fallback — and it sets up the obvious next question, which is whether Elo can notice a compound on its own and ask.
