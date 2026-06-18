# EloAI Website — Editorial Brief
> Hand this document to a new Claude session to implement the changes.
> Last updated: 2026-06-12

---

## Context

EloAI started as a concept. It now has real systems, real names, and real
validated results. The website still uses the original filler content
(invented projects, invented subdomains, generic AI lab copy). This brief
replaces all of that with what is actually true.

**Rule: do not invent claims. Every metric and system name below is real.**

---

## The 8 ELO Systems (canonical list — use these exactly)

```
1. Intention   — Direction and purpose
2. Perception  — Recognition and filtering
3. Memory      — Continuity and recall
4. Wonder      — Curiosity and exploration
5. Emotion     — Weight and significance
6. Reasoning   — Structure and logic
7. Connection  — Linking knowledge together
8. Reflection  — Learning and improvement
```

**Build status:**
- System 2 (Perception): substrate shipped — vocabulary contract v0.3.1
- System 3 (Memory): Phase 3 complete — Mneme substrate
- System 5 (Emotion): EPA projection built (sub-component of Memory)
- System 7 (Connection): Seed flow graph built (sub-component of Memory)
- All others: design phase / locked

---

## Real Names and Terminology

| Name | What it is |
|------|-----------|
| ELO | The compression/vocabulary substrate. Canonical ID library. |
| Mneme | The memory substrate (System 3). Named after the Greek goddess of memory. |
| EPA | Evaluation · Potency · Activity. 3D semantic coordinate space per token. |
| Seed / MemorySeed | Atomic unit of meaning. Not a sentence — EPA-coherent token cluster. |
| SeedFlow | Session buffer layer. Ingest → flush → activate pattern. |
| vec4d | 4-dimensional float vector on each seed. Enables cosine retrieval. |
| temporal wave | Chronological scan of an entity's seeds. Primary retrieval path. |

---

## Validated Results (use these numbers — they are measured)

**System 2 — Perception (semantic_compression v0.3.1):**
- 20.1% fewer LLM tokens vs Qwen BBPE on long-form English
- 46.7% wire-format size reduction vs Qwen fixed-width encoding
- 64.2% file-size reduction vs raw UTF-8
- 374,189 vocabulary entries (206k words + 168k phrase atoms)
- Vocabulary contract: byte-exact round-trip on all 13 test documents
- Retrained Qwen2.5-3B on ELO vocabulary — pilot eval perplexity ~81
- 97.8% NN-transfer warm-start coverage

**System 3 — Memory (Mneme Phase 3):**
- LMDB temporal wave storage — 6 sub-databases
- 4D cosine similarity retrieval — no ML, no embedding API
- Activation resolves in <2ms on CPU across 10,000 seeds
- Source-agnostic: transcript, news, url, book, audio, live_event, human_exchange
- Contradiction detection inline during store — flagged for Reflection (System 8)

**Engineering story worth telling:**
The 26 most-common English words (the, and, of, …) were defined as primitives
in the config but never exported into the LLM tokenizer. The pilot briefly
trained on a vocabulary missing its own most-frequent words. Found during
validation. 30-line fix. ~50% improvement in key compression metrics.
Engineering hygiene matters.

---

## File-by-File Changes

### 1. `website/assets/projects.json` — REPLACE ENTIRELY

Replace the 6 invented projects with the 8 ELO systems as project cards.

```json
{
  "projects": [
    {
      "id": "perception",
      "glyph": "◈",
      "code": "SYS-02",
      "title": "Perception — ELO Substrate",
      "description": "Semantic token compression. Every word and phrase maps to a canonical ID. 20.1% fewer tokens vs Qwen BBPE. 46.7% wire-format reduction. Vocabulary contract v0.3.1 shipped.",
      "status": "active",
      "phase": "v0.3.1 shipped"
    },
    {
      "id": "memory",
      "glyph": "∿",
      "code": "SYS-03",
      "title": "Memory — Mneme",
      "description": "Temporal wave storage over MemorySeeds. 4D cosine retrieval — no ML dependency. Activation under 2ms. Source-agnostic: transcripts, books, news, conversations — stored identically.",
      "status": "active",
      "phase": "Phase 3 complete"
    },
    {
      "id": "intention",
      "glyph": "→",
      "code": "SYS-01",
      "title": "Intention — Direction and Purpose",
      "description": "Sets the goal. Drives all downstream processing. Without intention, perception has no filter. Design phase.",
      "status": "research",
      "phase": "design"
    },
    {
      "id": "wonder",
      "glyph": "?",
      "code": "SYS-04",
      "title": "Wonder — Curiosity and Exploration",
      "description": "Detects gaps in the knowledge graph. Generates questions. Triggers growth points when query confidence falls below threshold.",
      "status": "early",
      "phase": "locked"
    },
    {
      "id": "reasoning",
      "glyph": "⊹",
      "code": "SYS-06",
      "title": "Reasoning — Structure and Logic",
      "description": "Applies rules to seeds. Contradiction detection. Stage classification (0–5). Probability inference over the seed graph.",
      "status": "early",
      "phase": "locked"
    },
    {
      "id": "reflection",
      "glyph": "◐",
      "code": "SYS-08",
      "title": "Reflection — Learning and Improvement",
      "description": "Scores contradiction pairs surfaced by Memory. Promotes, compresses, and matures seeds over time. Feeds back into the system.",
      "status": "research",
      "phase": "design"
    }
  ]
}
```

Note: Systems 5 (Emotion) and 7 (Connection) are built as sub-components
of Mneme (Memory) and can be shown as part of that card or added as
additional entries. Do not show them as separate cards unless adding them
makes the grid work better visually.

---

### 2. `website/sections.jsx` — Hero section stats strip

Replace the 4 stat cells with real values:

| Key | Value |
|-----|-------|
| Active systems | 08 / running |
| Substrate | v0.3.1 · ELO |
| Memory | Mneme · Phase 3 |
| Founded | MMXXV |

Replace hero headline (current: "Building the future of artificial consciousness."):
```
"Eight systems. One organism."
```

Replace hero subline (current: generic lab copy):
```
"EloAI is building a cognitive architecture from first principles —
eight systems that together form something capable of intention,
perception, memory, curiosity, emotion, reasoning, connection, and reflection."
```

Replace hero CTA buttons:
- Primary: "Explore the 8 systems →" → href: #projects
- Ghost: "Latest discoveries" → href: #discoveries

---

### 3. `website/sections.jsx` — About section stats

Replace the 4 stats:

| Key | Value |
|-----|-------|
| Founded | MMXXV |
| Systems | 08 defined |
| Substrate | ELO v0.3.1 |
| Memory | Mneme |

Replace About headline: "A small lab. A long-horizon bet." → keep this, it's good.

Replace About body copy:
```
"EloAI is building a cognitive architecture from first principles — not
prompting a frontier model, not wrapping an API. Eight systems. Real math.
No VC pressure, no publication quotas. We publish when the work is real."
```

---

### 4. `website/sections.jsx` — Infrastructure section

The current subdomains (app, research, agents, atlas, noema, status) are
invented and don't exist yet. Two options:

**Option A (recommended):** Replace with the 8 systems as the "infrastructure"
framing — each system as a module card with its real status.

**Option B:** Remove this section entirely for now.

Do NOT keep the fake subdomain cards. They reference systems (atlas, noema)
that have nothing to do with the real EloAI architecture.

---

### 5. `website/cognitive-architecture.html` — Thesis page

This page is the most outdated. The current content is about "external
cognitive infrastructure" — generic AGI-era framing. Replace the thesis body
with the real EloAI architectural thesis:

**New title:** "Eight Systems. One Organism."

**New lede:**
```
Most AI systems are a single model. EloAI is eight systems — each a distinct
cognitive faculty, each mathematically grounded, built in sequence from the
substrate up. This is the architecture.
```

**New section structure (rail nav):**
- 00 — The Thesis
- 01 — The 8 Systems
- 02 — The Substrate (ELO)
- 03 — Mneme (Memory)
- 04 — Validated Results
- 05 — What's Next

**Section 00 — The Thesis:**
```
Intelligence is not one thing. It is the coordination of many faculties —
each necessary, none sufficient alone. Intention without memory loops.
Memory without reflection stagnates. Perception without emotion is blind
to what matters.

EloAI is building each faculty as a discrete, testable system. They share
a substrate. They pass structured data between them. They are not prompt
engineering. They are math.
```

**Section 01 — The 8 Systems:**
Display all 8 systems with name, one-line purpose, and build status.
(Use the canonical list from this brief.)

**Section 02 — The Substrate (ELO):**
```
Everything runs on ELO — a canonical vocabulary of 374,189 entries where
every English word and phrase maps to an integer ID. Not tokens. IDs.
Byte-exact. Deterministic. Portable to C.

The substrate is the contract. Every system above it speaks ELO.

Measured:
  20.1% fewer tokens vs Qwen BBPE on long-form English
  46.7% wire-format reduction vs Qwen fixed-width
  64.2% file-size reduction vs raw UTF-8
  Round-trip byte-exact on all 13 test documents
```

**Section 03 — Mneme:**
```
System 3 is Memory. We call the substrate Mneme — after the Greek goddess
of memory.

Mneme stores atomic units of meaning called MemorySeeds. Each seed carries:
  - entity_id and concept_id
  - a 4D vector (vec4d) for cosine retrieval
  - a charge value (EPA energy)
  - a timestamp for temporal ordering
  - a source type (transcript, book, news, live event, human exchange)

Storage is temporal-first. An entity's memory is a time-ordered wave.
Retrieval is pure 4D cosine similarity — no ML, no embedding API, no
round-trip. Activation resolves in under 2ms on CPU across 10,000 seeds.

Contradiction candidates are flagged inline during storage and queued for
System 8 (Reflection) to score.
```

**Section 04 — Validated Results:**
List the measured numbers from the Validated Results section of this brief.
Include the essentials-fix bug story — it's worth telling.

**Section 05 — What's Next:**
```
Mneme Phase 4: Reflection engine (System 8) — scoring contradiction pairs
with 4D cosine divergence.

System 2 R1 production training: 5,000 steps on the full 22,095-sequence
corpus, targeting parity with stock Qwen2.5-3B on standard benchmarks while
preserving the compression wins.

Systems 1, 4, 6: design phase.
```

---

### 6. `website/about.html` — if it contains filler, update

Review the about page. If it contains invented content (labs, team members,
programs like "Atlas" or "Noema" that don't match the real systems), update
or strip it.

---

## Tone Guidelines

- Direct. Technical. No hype.
- Say what is built. Say what is validated. Say what is next.
- Never claim something is shipped unless it appears in the Validated Results above.
- The aesthetic of the site (dark, monospace, sparse) is good — keep it.
- The naming (Mneme, EPA, seeds, temporal wave) is intentional. Use it.

---

## What NOT to change

- `discoveries.md` — already updated, leave it.
- `styles.css` — visual design is solid, no changes needed.
- `neural-bg.jsx` — keep the background animation.
- The easter egg links (elo.html, elov2.html) — leave them as-is.
- The overall page structure and component system — keep React + Babel setup.

