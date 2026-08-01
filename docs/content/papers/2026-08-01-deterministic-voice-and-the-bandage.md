# 2026.08.01 — A Deterministic Voice, and the Bandage It Surfaced

*Full write-up. The Field Notes teaser of the same title is cut from this. It packages the language-production layer — the last missing leg before a no-LLM system can say what it knows — and reports the silent bug that packaging exposed.*

## Problem / context

Our browser-resident system could already perceive, remember, recall, and track a conversation. It could not **say what it knows**. Its local reply floor was an affect note — "On dungeon, master — reads neutral" — emitted while holding a full taught paragraph about Dungeon Masters in its store. Language production was the only missing leg, and it has a hard constraint: deterministic, no language model, dictionary-grounded, and every sentence must cite the seeds it stood on. A sentence the system cannot cite is a sentence it does not emit.

## Background

A composition ladder had grown, rung by rung, each rung added against a live failure: read the *shape* of a turn from the dictionary's cue mask rather than a `?`; distinguish a definition question from a statement that merely embeds a relative "where"; cite a held intent instead of claiming ignorance of it; recognise that a seed which *mentions* a concept does not *define* it. Each rule carries a dated transcript in the code. The task this session was to package that ladder into three portable, tier-2 ops — `label`, `summarize`, `verbalize` — as pure JSON-in/JSON-out functions the browser can wire in, pinned by a conformance file so the port proves rather than reinvents.

## Approach

Four artifacts cross the boundary: a spec (op signatures + semantics + the eight invariants), a Python reference implementation that **absorbs** the ladder rather than duplicating it, a conformance JSON generated *from* the reference, and integration notes mapping the call sites.

The ops are a lookup over structure, not a generation from weights. `label` names a set of items with a short designator, taking content-vs-function from the facet utility bit — never a stopword list (a 41-word stoplist once made recall answer "should I drive or walk?" with "free from dirt — means there is no dirt"). `summarize` reduces items to a budget of grounded sentences and reports what it dropped — no silent truncation. `verbalize` is the target: given the discourse *shape* of the asking turn plus recalled seeds, it composes a reply **in that shape**, cites the seeds, and marks stance — a thing the user told you is said in told voice; a thing an inference licensed is said in inferred voice, cited to the reasoning step. No template manufactures a reasoning step from a told fact; that is the reasoner's job, licensed and cited, or it is not said.

The conformance generator refuses to emit a facet-dependent case in a facet-less environment — a certificate that encoded a silently degraded output would be worse than no certificate.

## Data and examples

The bar, and what `verbalize` now makes true:

```
You: do you know what a dungeon master is?
ELO: From what you taught me: a Dungeon Master is the organizer and referee of a
     Dungeons & Dragons game ...   (grounded on 1 seed, told)
```

Thirty-four tests green, including the two that matter most — the ops must *beat* what they replace, not merely run. `label` beats the old top-k topic labeller by dropping the function words it kept and preferring the learned multiword surface ("car wash" over "wash drive walk told"). `verbalize` beats the quoting fallback: asked "should I drive or walk?" with "You are 100 feet from the car wash" recalled, the old reply quoted the fact verbatim at a question it does not literally answer; the shaped reply names both options and states plainly which part it has nothing stored for. Thirty-one conformance cases (label 10, summarize 10, verbalize 11) pin every one of those outputs.

## What broke

Running the new op suite against the shared composer surfaced a **bandage** a parallel session had left. A dialog layer had been wired in ahead of fact-recall, and its final act was an acknowledge:

```python
if a and not is_question:          # a = parse_assertion("The system is broken")
    return ("Got it — noted.", "acknowledge")
```

It fires for **every** `X is Y` statement — and because it runs before the reaction logic, it **shadowed contradiction detection entirely**. "The system is broken" after "The system is stable" returned "Got it — noted." instead of "That conflicts with an earlier statement." Six reaction tests failed the moment the full path was exercised; the behaviour had been silently dead until then. The acknowledge was added for a real reason — to stop the recall path echoing a loosely-related memory — but it over-reached and masked the more informative reply.

The fix is one line: let social acts win, but let `acknowledge` fall through to the reaction path, whose own "novelty" branch already says the same "Noted" while remaining able to detect a conflict. The lesson is the sharp one: a bandage that returns something *plausible* is worse than a gap, because it hides the wound. Only a test that ran the whole composition path found it — a probe that stopped at the dialog layer would have passed.

## What we deferred and why

- **The browser port** — porting `verbalize` + the shape reader into the Rust reply path is the graduation gate; it proves against the conformance file (the JS/Rust runner is the second of the two runners).
- **Inferred voice against the reasoner** — `verbalize` marks stance today; wiring R1's licensing vocabulary (contributes_to / requires / evidence_for) so inferred content speaks in a cited inferred voice is the next rung.
- **Graduation, not a fork** — the module stays canonical in the working tree until the port passes; then a sync copies it into the package with the conformance file as its certificate. Two live copies of composition logic is the drift this project keeps paying to prevent.

## Result and consequence

- Deterministic, no-LLM language production packaged as three conformance-pinned ops: **VALIDATED** — 34 tests, 31 pinned cases, the two "beat" probes green.
- The dialog `acknowledge` shadowing contradiction detection: **REFUTED** as acceptable behaviour — it was silently masking the reaction path; guarded out, reaction restored.
- "Composing a reply is generation": **REFUTED** — it is a lookup over structure with provenance. The hard part was never producing words; it was the discipline of not saying what you cannot ground.

The thesis is the same one the auditable reasoner made on the input side, now on the output side: meaning is stored and retrieved, not computed — and a system that composes only what it can cite is a system whose voice you can check. The wound the bandage hid is closed, and the voice it was standing in front of can now speak.
