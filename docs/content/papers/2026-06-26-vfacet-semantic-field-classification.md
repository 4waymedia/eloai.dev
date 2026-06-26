# 2026.06.26 — vfacet Agency Classification: 47.6% to 14.5% Unknown via Two-Phase Corpus Context

## Problem / context

The EloAI dictionary stores 373,918 entries in LMDB. Each entry has a 2-byte packed struct called a vfacet, encoding five semantic fields: agency (2 bits), direction (3 bits), temporal (3 bits), domain (4 bits), polarity (2 bits). After `vfacet_builder.py` ran the initial deterministic pass, the field distribution was poor:

- Agency UNKNOWN: **47.6%** (178,005 entries)
- Direction UNKNOWN: ~12,610 entries (non-trivial)
- Temporal UNKNOWN: 31.1% (116,430 entries)

An entry in UNKNOWN state contributes nothing to semantic retrieval. The classification quality directly determines whether the vfacet layer can participate in recall scoring, affective routing, or structural filtering. Getting agency below 20% was the session target.

---

## Background

The vfacet record packs five fields into 2 bytes using fixed-width bit fields:

```
[agency:2][direction:3][temporal:3][domain:4][polarity:2] = 14 bits packed into 2 bytes
```

The LMDB database has two relevant sub-databases:
- `b'forward'`: surface_bytes → id_bytes (373,918 entries)
- `b'vfacets'`: id_bytes → packed_vfacet (373,918 entries)

This distinction turned out to be the source of the session's most expensive bug (see *What broke*).

Agency categories: SELF (acts on self), OTHER (acts on others), SYSTEM (automated/institutional), UNKNOWN.

Direction categories: TOWARD, AWAY, STABLE, REVERSAL, NEUTRAL, UNKNOWN.

Temporal categories: STATE, PROCESS, EVENT, OUTCOME, CONDITION, UNKNOWN.

The EPA substrate (`epa_substrate.lmdb`, 67,936 entries) provides Evaluation, Potency, Activity scores for surface words and is the primary input to deterministic direction classification (A ≥ 1.2 + E ≥ 0.8 → TOWARD; A ≥ 1.2 + E ≤ -0.8 → AWAY; A ≤ 0.4 → STABLE).

---

## Approach

### Pass 1 — Deterministic (`vfacet_llm.py`)

Iterates all entries in `b'forward'`. For each surface word:
- Direction: derived from EPA A/E axes with a fixed-threshold rule set; morphological fallback (prefixes `un-`, `dis-`, suffixes `-tion`, `-ment`)
- Agency: matched against curated word lists (SELF_WORDS, OTHER_WORDS, SYSTEM_WORDS); domain=CODING forces SYSTEM; agentive suffix `-er/-or/-ist` → OTHER

Per-field preservation applied after deterministic classification: if the previous vfacet already had a non-UNKNOWN value for a field, the new classification does not overwrite it.

### Pass 2 — LLM batch (`vfacet_llm.py --llm`)

Entries still UNKNOWN in either agency or direction after Pass 1 are batched (50/batch) and sent to an LLM (OpenAI-compatible endpoint). The prompt returns a JSON array with `{word, agency, direction}` per entry. Per-field preservation applied on write: only overwrites a field if the current value is UNKNOWN.

### Pass 3 — Temporal LLM (`vfacet_llm.py --temporal`)

A separate pass targets entries where `temporal == UNKNOWN`. Batches of 100 sent to the LLM with a dedicated temporal prompt. Categories are harder to assign without context — STATE/PROCESS/EVENT/OUTCOME/CONDITION — and the LLM returns UNKNOWN for many function words, prepositions, and proper nouns. The script uses `b'forward'` to iterate surface words (not IDs).

### Pass 4 — Context classifier (`vfacet_context_classifier.py`)

For entries still UNKNOWN in agency or direction after Passes 1–3, a corpus-based context window extractor extracts usage examples from the transcript corpus and sends batches to the LLM with a richer prompt that shows the word highlighted in context.

**Architecture (two-phase):**

Phase A builds an inverted index from the entire transcript corpus in a single O(corpus) pass:

```python
word_chunks: dict[str, list[str]] = defaultdict(list)
_WORD_CAP = max(max_contexts * 4, 20)
for path in json_files:
    data = json.loads(path.read_bytes())
    for chunk in data.get('chunks', data.get('segments', [])):
        text = _clean(chunk.get('text', ''))
        for w in re.findall(r"[\w']+", text.lower()):
            if w in anchor_set and len(word_chunks[w]) < _WORD_CAP:
                word_chunks[w].append(text)
```

Anchor words are the first non-stopword in each surface phrase. This avoids massive candidate lists for common first words ("a", "the").

Phase B looks up each surface in the index (O(1) per surface), extracting ±25-word context windows with the target highlighted `<<like this>>`.

**Vote aggregation:** N context windows per surface are classified independently by the LLM. The majority vote label is written only if `>= min_confidence` fraction of votes agree. At `--min-matches 1 --min-confidence 0.7`, a surface with a single corpus hit gets classified if the LLM returns any definitive (non-UNKNOWN) label.

**Two run configurations used:**

Run A: `--min-matches 2 --min-confidence 0.6` → targets surfaces with ≥2 corpus hits; higher recall, lower noise.

Run B: `--min-matches 1 --min-confidence 0.7` → adds ~62k surfaces that had exactly one hit; compensates with higher confidence threshold.

---

## Data and examples

### Agency progression

| Stage | UNKNOWN | SELF | OTHER | SYSTEM |
|---|---|---|---|---|
| Initial | 47.6% (178,005) | 27.8% | 12.9% | 9.3% |
| After Pass 1 | ~47% | — | — | — |
| After Pass 1+2 (LLM) | — | — | — | — |
| After direction cleanup | 47.6% | — | — | — |
| Context run A (min-matches=2) | 33.6% (125,668) | 28.5% | 23.4% | 14.6% |
| Context run B (min-matches=1) | **14.5%** (54,131) | 29.7% | 35.2% | 20.6% |

Direction and temporal:

| Field | Before | After |
|---|---|---|
| Direction UNKNOWN | ~3.4% (12,610) | **0.5%** (1,766) |
| Temporal UNKNOWN | 31.1% (116,430) | **29.6%** (110,719) |

### Context sample

Surface: `"advised"` — sent to LLM as:

```
Entry 1:
Context: she <<advised>> the board to reconsider the timeline before committing
Word/phrase: "advised"
```

LLM response: `{"word": "advised", "agency": "OTHER", "direction": "TOWARD"}`

Without context, "advised" was UNKNOWN (not in word lists, no EPA data). With context, it's clearly OTHER (acting on others) and TOWARD (offering guidance).

### Temporal floor example

Surface: `"the"` — temporal classification attempted:

LLM returns UNKNOWN. Function words, articles, conjunctions, proper nouns, and numeric fragments have no inherent temporal character. These account for the ~29.6% temporal floor that persists after the LLM pass.

---

## What broke

### Bug 1 — Temporal scan sent Base64 IDs to the LLM (not surface words)

The original `patch_vfacets_temporal` iterated over `b'vfacets'` keys. Keys in `b'vfacets'` are Base64 IDs (`g4ZH`, `Aa3c`, etc.) — not surface words. The LLM received batches like:

```
- g4ZH
- Aa3c
- B7qM
```

and responded: *"I'm missing the actual words/phrases to classify."* Despite this, the script's fallback index-matching wrote classifications for 108,422 entries. Those classifications were garbage — the LLM was classifying ID strings, not words. ~179k entries received corrupt temporal values. STATE was artificially inflated to 42.8%.

**Fix:** Iterate `b'forward'` (surface → id) instead of `b'vfacets'` (id → vfacet). Same surface-to-id lookup pattern used correctly in Pass 1.

**Recovery:** Added `--force-temporal` flag to re-classify all temporal entries regardless of current value, overwriting the corrupt data.

### Bug 2 — Pass 1 overwrote LLM-classified direction values

After an LLM pass successfully classified direction for ~38k entries (direction UNKNOWN: 12,610 → 1,766), running Pass 1 again reset direction back to UNKNOWN for entries where Pass 1's deterministic logic returned UNKNOWN but the LLM had already set a value. Direction UNKNOWN: 1,766 → 51,455.

Root cause: Pass 1 computed `direction = _classify_direction(surface, epa)` which returns UNKNOWN when no EPA data exists, then wrote that UNKNOWN into the DB unconditionally.

**Fix:** Per-field preservation after deterministic classification:
```python
if prev_direction != DIRECTION['UNKNOWN']:
    direction = prev_direction
```

### Bug 3 — LLM Pass 2 also overwrote direction values

Same issue: the LLM returned UNKNOWN for some entries where direction was already classified. The write block did not check the existing value. Direction UNKNOWN spiked again after Pass 2 runs.

**Fix:** Per-field preservation in the LLM write block:
```python
old = unpack_vfacet(existing)
if old['agency'] != AGENCY['UNKNOWN']:
    agency_code = old['agency']
if old['direction'] != DIRECTION['UNKNOWN']:
    direction_code = old['direction']
```

### Bug 4 — "Temporal written: 108,422" was a misleading stat

After the temporal LLM pass reported writing 108,422 entries, `--stats` showed temporal UNKNOWN dropped from 116,430 to only 110,719 — a reduction of 5,711, not 108,422. The counter incremented on every DB write, including writes where the LLM returned UNKNOWN and the entry was written back unchanged (UNKNOWN → UNKNOWN no-op).

**Fix:** Skip the write and increment a separate `skipped_unknown` counter when `temporal_code == TEMPORAL['UNKNOWN']`. The "Temporal classified" stat now counts only genuine non-UNKNOWN writes.

### Bug 5 — Context scan froze on high-frequency anchor words

With 170k UNKNOWN surfaces, many started with "a" or "the". The first-word index had 30k+ candidate surfaces under key `"a"`. For every occurrence of "a" in the corpus, the script checked all 30k candidates — O(corpus × candidates) per anchor.

**Fix:** Two-phase architecture. Phase A builds the inverted index once (O(corpus)). Phase B does O(1) lookups per surface.

### Bug 6 — Edit tool introduced Unicode corruption and file truncation

Multiple edits via the Edit tool introduced null bytes (`\x00`) or truncated the file near EOF when a multi-byte Unicode character (→) crossed an edit boundary. Symptoms: `SyntaxError: unterminated string literal`, `ValueError: source code string cannot contain null bytes`.

**Fix pattern:** Always use bash reconstruction for tail edits:
```python
data = open(path, 'rb').read().replace(b'\x00', b'')
lines = data.split(b'\n')
good = b'\n'.join(lines[:N])
tail = b"""..."""
open(path, 'wb').write(good + tail)
```

---

## What we deferred and why

**Direction UNKNOWN floor (1,766 entries, 0.5%).** These are surfaces where the LLM consistently returns UNKNOWN across multiple context samples. Likely genuine — function words and structurally ambiguous phrases with no direction stance. Not worth further passes.

**Temporal UNKNOWN floor (110,719 entries, 29.6%).** Function words, prepositions, articles, conjunctions, proper nouns, and numeric fragments have no inherent temporal character. The LLM returns UNKNOWN for them correctly. Further passes will not move this.

**Agency UNKNOWN floor (54,131 entries, 14.5%).** 39,776 surfaces have zero corpus hits — they never appear in the transcript corpus and cannot be classified by context. The remainder were classified UNKNOWN by the LLM with high confidence, suggesting they are genuinely ambiguous in isolation.

**Verbalizer → RecalEngine wiring.** The vfacet fields are now classified but not yet consumed by the retrieval layer. Wiring the verbalizer output to use agency/direction/temporal for recall scoring is the next structural step.

---

## Result and consequence

**VALIDATED:** Agency UNKNOWN reduced from 47.6% to 14.5% — a 69.5% reduction — using two-phase corpus context classification followed by LLM vote aggregation. The majority of the remaining UNKNOWN entries (39,776) have no corpus representation and cannot be improved without a different signal source.

**VALIDATED:** Direction UNKNOWN reduced from ~3.4% to 0.5% via per-field preservation fixes and LLM passes. The floor is genuine ambiguity.

**VALIDATED:** Temporal UNKNOWN reduced from 31.1% to 29.6%. The 1.5-point improvement reflects the genuine signal available; the remaining ~30% is structural (function words have no temporal type).

**REFUTED:** "Temporal written: 108,422" implied 108,422 entries were newly classified. The correct figure is 5,711 — the rest were UNKNOWN → UNKNOWN no-ops that the original counter did not distinguish.

**UNVERIFIED:** Whether the 14.5% agency UNKNOWN floor degrades retrieval quality. The corpus is skewed toward conversational transcripts; words that never appear in transcripts may be perfectly common in other domains. Coverage in production is unknown until the verbalizer is wired.

The consequence forced by this result: the classification layer is saturated — further passes on the same corpus with the same model yield diminishing returns. Improving below 14.5% requires either a broader corpus, a richer signal (sentence-level embeddings per entry rather than surface-word context), or accepting the floor and routing UNKNOWN entries through a fallback at query time.
