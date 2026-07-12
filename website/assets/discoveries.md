# 2026.07.11 — A Tri-State Load Rule: Context Assembly Refuses Mixed-Dictionary Memory

Two dictionary builds can assign the same ID to different words: one build's 184 is "doctor," another's is "system." A field read against the wrong build does not fail — it parses cleanly and means something else. Our context assembler was exposed to exactly this. Stage 07 blends memory fields from multiple providers into one working context for reasoning, and through v0.2.1 it kept no record of which dictionary build encoded each field. With the current dictionary still staged and IDs free to move on every rebuild, that was a misread waiting to happen.

The fix is provenance plus a load rule, not a new dependency. Every provider may now report the build its field is bound to, read off the engine by pure duck-typing — a rich identity surface if one exists, a bare fingerprint string if not, nothing if neither. The assembler compares identities tri-state: same family, definite mismatch, or unknowable. **Unknown never conflicts** — semantics copied from Stage 06's existing index guard rather than invented stricter — so every pre-identity upstream, including all of v0.2, stays valid unchanged. Policy is ignore, warn, or reject; default warn records conflicts in diagnostics and proceeds. Under reject with an expected identity from the caller's manifest, a foreign memory field raises **before a single seed is scored**.

The accounting: **77 unit tests (24 new)** and the integration check pass on the real tree, with **zero new dependencies** — the core stays pure stdlib. The default path is behavior-preserving; an explicit test holds that even under reject, an upstream with no identity assembles exactly as before.

Mid-session, our own tooling staged a demonstration of the failure mode. The development environment's file mirror silently truncated a module at a clean statement boundary — the compile check passed on a file missing its last three methods. Bytes parse, check passes, meaning gone: the precise shape the load rule exists to refuse. A compile check is not an integrity check; only content identity is.

The full write-up has the rest: the policy table, the four duck-typed identity surfaces, what we deferred — per-seed identity, facet fingerprints riding the extra field, the ELO-ID budgeter — and the public fingerprint accessor Stage 06 still owes.

---

# 2026.07.10 — Three Channels, One Fingerprint: The Dictionary Ships as a Coupled Family

A dictionary that carries understanding without a language model can't be a lookup table — it has to be a coupled *family*, several layers of meaning bound so tightly a word can't mean one thing in storage and another in a reply. We built and shipped that family for the browser dictionary (261,872 words): three parallel arrays over one vocab index — **affect** (`epa.bin`), **affordance** (`facets.bin`), **denotation** (`neighbours.bin`) — each stamped with the dictionary's content fingerprint and refused at load if it doesn't match. The three answer different questions: facets what you may *do* with a word, epa how it *feels*, neighbours what it *means*. The denotation channel exists because affect isn't meaning: EPA put `car` next to `credentials`, so a 768-d embedding index carries the `car → truck` that EPA never could.

Building it exposed real drift. A whole channel had no emitter — the vocab file the browser and neighbours both key off was produced by a tool that had drifted out of the repo, so a from-scratch build couldn't run; we rebuilt it as a deterministic projection and proved it reproduced the old file **byte-for-byte**. Our "atomic" write had never actually run on Windows, where `os.fsync` on a read-only handle throws `EBADF`. The neighbours export took 40 minutes doing 85k searches one at a time; batched into a single matrix multiply it took seconds. On a 5090 the full family then built in one clean pass — **258,254 words embedded in 22 s**, epa 79.6% populated, neighbours covering 84,864 words at ~15 each.

The best result was a build we *didn't* do. Before giving phrases their own denotation we measured whether they need it — `cos(compose(words), embed(phrase))` — and found the conversational corpus has almost no lexical phrases: 160k candidates, only **11,818 fully composable**, and the low-scoring "idioms" were pragmatic formulas (`thank god`, `good luck`) or ASR stutters (`china china`). So instead of phrase assets we added hygiene gates that cut the miner pool **232,983 → 50,347**, and filed composition for the domain builds that actually have lexical terms. Measuring first turned a month of building into an afternoon of not building. The full write-up has the channel formats, the four failures, the compositionality table, and why the verbalizer — now that it finally has denotation as well as affect — has a real shot at forming sentences.

---

# 2026.07.08 — Memory-Grounded Replies Without an LLM, and Why Rendering Was Not the Hard Part

We wanted the system to reply — answer a question, react to a statement — deterministically, from what it has stored, no language model. The assumption was that we were nearly there, because the verbalizer already turns internal state into words. That assumption was wrong, and the reason is the whole point: rendering a thought is not composing a response, and the gap between them is exactly what a language model usually papers over.

The verbalizer renders one seed beautifully — `entity [relation] concept: gloss, emotion, grounding`. What it had no notion of is *relation between turns*: taking a new statement and saying how it stands against what is already in memory. **That relating step is the reply, and it did not exist.** `verbalize_seed` gives a diagnostic reading of a single item; a response has to reach across items. Once we saw that, the "missing 20%" turned out to be most of the actual work.

So we wrote a pure composer and formalized it into the verbalizer. It is a *lookup, not a generation*: a turn ending in `?` is answered from stored seeds, anything else is reacted to, across six templated shapes — contradiction, agreement, novelty for statements; conflict, recall, unknown for questions. Store "The system is stable" then "The system is broken" and it replies **"That conflicts with an earlier statement: 'The system is stable'."** Ask about something never mentioned and it doesn't bluff: "I have nothing stored about database yet." No model produced any of it — each sentence is a template filled from the actual seeds, and every response records the seed ids it stood on plus a confidence.

The composer is **substrate-free** — it duck-types seeds and takes contradictions as data, so it composes without opening the dictionary and its ten tests run in a millisecond. The point is the shape of the thesis: responding becomes a lookup over structure, not a generation from weights, which buys two things weights don't — the reply cites its own evidence, and it costs nothing to run. Templated and narrow today, but it is a foundation an AI can actually answer from: it says only what it has stored, quotes where it got it, and admits when it knows nothing. The full write-up has the six shapes, the two honest limits, and why replies are only as good as the concept underneath.

---

# 2026.07.08 — An Auditable Reasoner, and the Whack-a-Mole It Exposed in Our Concepts

We finished Reasoning R1 — a deterministic symbolic reasoner that emits contradiction verdicts and single-hop inferences, every step carrying full provenance — and ran it on real memory for the first time: 9,868 seeds from seven transcripts. It worked flawlessly and told us something we did not want to hear. **9,868 seeds produced 3,525 reasoning steps with 100% replay to real seed ids** — and the derived claims were `like contributes_to remember`, `um enables little`, `go temporal_before get`. The reasoning was perfect; the concepts feeding it were mostly discourse fillers and bare verbs.

Then the whack-a-mole. Concept extraction had scored 5/5 on a clean 190-sentence corpus, but real ASR — no punctuation, wall-to-wall "like" — is a different world. We added a filler stoplist: resolved contradictions dropped from 3,473 to 3,105, a modest 11%. We added a verb stoplist for the residual (`go`, `know`, `make`) and the count went the *wrong way*, up to 3,318. Removing the verb-concepts didn't delete those seeds; it redistributed them onto commoner words, collapsing many small clusters into fewer large ones — and since contradiction fires on same-concept pairs, a bigger cluster means quadratically more of them.

The finding: **per-class stoplists are whack-a-mole.** The contradiction volume isn't driven by any word class — it's driven by two structural things a blacklist can't touch. Every seed sits under one `unknown` speaker (the transcripts carry no speaker labels), so same-entity contradiction is combinatorial; and on messy ASR the concept is wrong across *every* part of speech at once. So we stopped blacklisting. The replacement is a **positive gate** — accept a concept only if it grounds to an in-dictionary content noun — and we moved tuning out of source edits into an instrumented lab where a live "percent content nouns" metric scores each change.

The reasoner's first contribution wasn't a conclusion; it was a diagnosis. Because every bad claim replays to the seeds that made it, **an auditable reasoner is also a probe** — it made a foundational weakness impossible to hide. The full write-up has the measurement table, why the verb fix backfired, and the entity-collapse problem we deferred.

---

# 2026.07.05 — Concept Extraction 4/5 to 5/5, Grounded and Converged Without a Lemmatizer

The concept extractor sat at 4/5. The holdout was "The server failed because memory was exhausted," which returned `memory` — the last noun, a real noun, but the *cause* in a subordinate clause, not the subject. The rule that fixed it is a dozen words: the concept is the last noun *before the first subordinator*. The trap was in which words count. Our first set included `that`, so "The logs confirm that the server failed" cut the clause at `that` and returned `logs` — the reporting subject — discarding the real concept sitting one clause over. A complementizer introduces the concept; it does not subordinate it. Drop `that` and the relativizers, keep `because` and `when`, and A4 resolves to `server` across all ten phrasings. **4/5 → 5/5.**

Then two things the concept still lacked. It was a bare string — `server` and `servers` were different concepts — and nothing tied it to the dictionary. Grounding fixed the second: a read-only lookup returns whether the concept is in-dictionary, its `(E, P, A)` coordinate from the affect substrate, and its semantic bucket. Concepts became comparable by distance, not just equality — no schema change, a capability a consumer opts into.

Convergence fixed the first, and this is the part we are happy with. To merge `servers` into `server` you would reach for a lemmatizer. We didn't. We reduce the surface — plural to singular, then best-effort derivational — and accept a reduction only if it is itself an in-dictionary noun. **The dictionary is the lemmatizer.** That gate is also the safety: `news` reduces to `new`, and `new` is in the dictionary, but it is not a noun, so the merge is refused. `process` survives an `-ss` guard. And the example that motivated the whole phase, `parser`/`parsing` collapsing to one concept, *did not merge* — `parse` is not an in-dict noun on this build, so the gate declined to invent a canonical the dictionary will not vouch for. **That is the gate working, not failing.**

Twenty-one tests green, including an end-to-end check where the real extractor emits a plural and convergence collapses it to `system`. The spine the memory layer keys on is now reliable, grounded, and convergent. The next thing to read it is Reasoning.

---

# 2026.07.04 — Concept Extraction: 0/5 to 4/5, and the Noun Tagger Already in the Pipeline

Last week's post ended on a cliffhanger: `concept_id` — the field the whole memory layer keys on — was extracting the wrong word (`arrived` for "message arrived," `late` for "the response was late"), and our first fix scored **0/5**. This is the resolution, and the fix was smaller and more embarrassing than the failure suggested.

The 0/5 fix was in the **wrong layer**. We made the *selection* rule smarter — exclude adverbs, prefer nouns — when the real loss was upstream: the object noun was never in the candidate list. The entity detector tags `felt`, `joyful`, `message`, and `arrived` all as "object," and the tier filter drops the noun from the content chunks before selection ever sees it. You can't select a word that was already thrown away.

The second instinct — ground it in the dictionary — was right in spirit, wrong in fact. The dictionary has **no part-of-speech signal**: the old `pos_tag` table is empty, the `temporal` facet doesn't discriminate (`message` and `arrived` are both EVENT), and the semantic bucket is uniform across nouns and verbs. That's by design — the dictionary is organized by *semantic role*, not grammar, and POS is meant to be derived in extraction.

Which is where it already lived. `noun_lexicon.py` — a rule-based, no-model noun tagger (WordNet list + determiner context + suffix rules) — had been in the pipeline the whole time. The only thing wrong was that concept selection was reading tier-filtered chunks instead of the **raw sentence**. Run the tagger on the raw tokens, take the last noun: **0/5 → 4/5.** `message`, `response`, `pattern`, `system` all correct; the fifth (`server` vs `memory`) is a genuine subject-vs-cause ambiguity, not a bug.

The lesson is the plainest kind: the deterministic signal already existed, and the whole failure was feeding the selector the wrong tokens. The full write-up has the dead ends in detail, the dictionary-POS refutation, and why the verb side stays a known gap until System-2 meta-facets land.

---

# 2026.06.29 — Segmenting Any Text by Coherence, Without Training on the Answer

We had 366 hand-built outlines for our transcripts — human tables of contents, chapter by chapter. The obvious move was to train a model to reproduce them. We didn't. There is no *correct* segmentation: competent annotators disagree on where chapters begin and how many there are, so fitting one outline teaches a model nothing about what a boundary actually *is*. We built a general, deterministic **formula** instead, judged only by whether its boundaries fall at real drops in semantic cohesion — never by agreement with a human outline.

`segmentation_formula` reads the signal, not a template: encode each unit → score the cohesion valley at every gap → cut at an unsupervised threshold → recurse for subsections → label each span by its distinctive terms. The baseline is **pure standard library — no model, no dictionary — so it runs anywhere.**

Then the result that made the case. On *"All Wars Are Bankers' Wars"* (43 minutes, 100 chunks), we swept the one boundary knob and let the intrinsic coherence score speak. It **peaks at 7 chapters. The independently authored human outline has 6.** We optimized for internal coherence and landed within one chapter of someone who'd watched the video — with no access to their answer. The boundaries also track the real narrative: Revolution → Jackson's bank war → Lincoln's greenbacks → Smedley Butler → JFK → Bretton Woods → Libya → the closing argument.

The point isn't a leaderboard number; it's the method. A trained segmenter is a black box that mimics one editor. This is **six named steps you can read, one knob you can reason about, and a judge that needs no labels** — offline, deterministic, and composing straight into the substrate (swap the lexical signal for 4D/EPA and the same formula gets sharper). We kept the outlines as a sanity glance, not a target. Coherence, it turns out, agrees with the humans more often than fitting them would.

---

# 2026.06.29 — Learn Procedures, Not Weights

Today's AI learns a skill by nudging billions of opaque parameters from thousands of examples. We think there's another way when you have a substrate that doesn't drift: store the skill as a **formula** — a named, readable, version-controlled *procedure*, not a pattern baked into weights. Learning then becomes *editing and growing procedures*, not retraining.

A formula is declarative: an `intention`, a few example inputs for routing, named `slots`, and ordered `steps` drawn from a **closed vocabulary** of operations — `parse`, `recall`, `detect_boundary`, `cluster`, `label`, `infer`, `decompose`, `validate`. Every op carries a **compute tier** (0 = deterministic local, 1 = substrate, 2 = a language model), and the rule is *push every step to the lowest tier it can run at* — so the vocabulary is both the procedure contract and the cost-control. The system runs a loop: a prototype router **selects** the formula, the engine **executes** its steps into an auditable trace, measurable criteria **score** it, and a reflection loop **refines** it (and eventually induces new ones).

This isn't abstract — `segmentation_formula` is a real, working instance: six named steps, runs offline in pure stdlib, improvable by one knob, judged with no fitted reference, and it recovered roughly human chapter structure on a real document. You can open it and read exactly what it does.

The trade is honest. You give up the raw, scale-bought capability of a giant model; you get **data efficiency** (a few steps, not 10,000 examples), **auditability** (the procedure explains itself), **legible failure** (open it and fix a step), and **privacy/cost** (most steps never touch a model). And it's not fringe — it's the shape already working in production agentic systems that steer capable models with explicit instruction files instead of retraining them. A formula is *direction*; its ceiling is the substrate beneath it.

---

# 2026.06.29 — The Browser Thinks Before a Token Is Spent

The expensive thing in modern AI is the model call — tokens, GPU time, a network round-trip, and handing your request to a remote service. But most of the work between a request and a plan is *structural*: figure out what was asked, recall context, decompose the task, propose a checklist, ask the few questions that matter. On a substrate that's deterministic and portable, none of that needs a model — so it should run **in the browser, before a single token is sent.**

We make this a rule with three tiers. **Tier 0** is deterministic and local: parse, classify, detect boundaries, route, recall local memory, propose the plan, surface the choices — no model, no network. **Tier 1** is substrate/edge work (deeper recall, the seed graph, verbalizing) — still no language model. **Tier 2** is the model, the last resort, for the irreducible generation only — and even then the payload is *compressed ELO IDs*, not raw text. Every step is authored at the lowest tier it can run at; a step that keeps escalating to tier-2 is a signal to add a deterministic op, not to pay the bill.

This isn't aspirational — it's already running. Our text-segmentation procedure does the entire "understand the structure of this 43-minute transcript" job at **tier-0, pure standard library, offline, zero tokens.** It joins prior results that ship the dictionary to the browser and identify nouns by lookup-plus-rules with no AI at all.

What you buy: **bandwidth** (turns that never hit the network), **cost** (no GPU to parse or plan), **latency** (instant local steps), **privacy** (the request and memory stay on-device), and **fewer round-trips** (clarify and plan *before* the one call you make). The model stops being the first thing you reach for and becomes a co-processor of last resort, behind a single seam, on a compressed payload.

---

# 2026.06.28 — Finding the Noun Without an AI

The regression corpus had cracked the spine of seed extraction: every concept assertion failed, `concept_id` came back `arrived` instead of `message`, `today` instead of `pattern`, `trusts` instead of `system`. The pipeline had no reliable way to tell a noun from a verb, and no part-of-speech tags to lean on. We gave it one, with **zero AI** — a word list and a rule about the word *the*.

The diagnosis was better than a clean failure. The code meant to surface a sentence's nouns selected "high-tier content," and *high tier* means high affect: a token is Tier-H when its evaluation magnitude `|E| ≥ 0.6`, or it is an emotion or modal verb. Affect is not noun-hood, so the filter failed in both directions at once. It kept the emotional words — in "she felt joyful and the message arrived," `felt` and `joyful` sailed through as content "objects," a verb and an adjective masquerading as the subject. And it dropped the real nouns — `server`, `pattern`, `system` are emotionally flat, `|E| ≈ 0`, so they fell to the low tiers and were filtered out before selection ever ran. That is why our first fix, a smarter selection rule, scored **0 of 5**: you cannot select a noun that was thrown away upstream.

You do not need a neural tagger to find a noun. You need a precomputed lookup and a few rules — essentially a Brill tagger with the learning removed. A **noun lexicon** from WordNet/Wiktextract, ~1 MB and a B-tree lookup, plus the rule that does the heavy lifting: a determiner or possessive immediately before a word makes it a noun. "the server," "its memory" — decisive, and it settles homographs for free (`felt` is a fabric in the lexicon, but "she felt" is not a determiner frame, so it stays a verb). Suffix rules and verb and adjective exclusions cover the rest.

Run on the sentences that broke the day before: "she felt joyful and the message arrived" → `['message']`; "the server failed and memory exhausted" → `['server', 'memory']`. The neutral concrete nouns surface; the high-charge verbs are correctly rejected. The thing the sentence is about is finally in the candidate list — the precondition for ever selecting it. That is the recurring move: affect lives in the EPA norms, token identity in the dictionary, and now part-of-speech in a lexicon plus rules. None of it wakes the model.

---

# 2026.06.27 — Lexical Recall for the Seed Store: Exact Match, Expansion, and One Shared Dictionary

Memory had two recall paths — temporal (pull an entity's seeds in time order) and vector (rank by 4D cosine similarity). Neither answered the question recall exists for: *which stored memories are about this concept?* We verified the gap at the schema level: `memory.lmdb` opens six sub-databases (`seeds`, `sid`, `cls`, `src`, `contra`, `meta`). **Not one is lexical.**

The fix is a surface-keyed inverted index over the seed store, fed by verbalizer query-expansion and ranked by the vfacet layer. Four phases: an LMDB sidecar (`recal_invindex.lmdb`) with postings and seed-term maps; an indexer that runs each seed's text through the surface segmenter; ingest wiring that indexes on flush; and a query path that expands queries into surfaces, looks them up, unions the postings, and ranks by vfacet. The query path runs **two passes** — L0 exact-match on literal query terms (so known surfaces always return their seeds, including out-of-vocabulary words) and L1 semantic expansion unioned on top.

It went in cleanly. Then the full test suite found three collisions a unit test never would.

**py-lmdb refuses to open the same environment twice in one process** — `lock=False` does not change this. Three components each opened the same `dictionary.lmdb`: the verbalizer substrate, the seed-surface segmenter, and the fingerprint reader. Alone, fine. Together — which is exactly what recall with indexing does — they collided. Fix: a process-wide shared env cache routing every read-only open through `get_env(path)`. That fix had its own trap: the cache module gets imported under two names from different import paths, producing **different module objects with separate module-level state**. We pinned the registry to a single attribute on `sys`, making it a true process singleton.

Then two smaller cascades the collision had been masking: an all-OOV query (`parser`) has no EPA rating, so the verbalizer can't build a centroid — which aborted the whole call. Fix: wrap expansion so no centroid means serve exact-match only. An OOV surface has no vfacet, so its node carried an empty facet `{}` — consumers asserting a `direction` key failed. Fix: exact-match nodes now carry a full `UNKNOWN` facet.

The principle that fell out: **read-only shared resources load once and are shared; writable per-instance stores stay isolated; queries degrade gracefully.**

---

# 2026.06.27 — A Regression Corpus for Seed Extraction, and the Concept Gap It Surfaced

We had built the recall half of memory — the surface index, exact and semantic recall, facet ranking — but never tested the half it all depends on: whether extraction turns a sentence into a *good* seed. The field that matters most is `concept_id`. The inverted index, resonance, contradiction detection, and the seed-field graph all key on it. If the concept is wrong, everything downstream is keyed on the wrong thing, silently. So we built a test corpus to find out — and it found exactly that.

First, real seeds: `build_memory.py` ran a transcript corpus (14,807 YouTube transcripts on hand) through extraction and ingest. Then a controlled corpus: 190 sentences in ten groups, each holding an event fixed and varying one dimension (emotion, agency, certainty, framing, time, relational stance, abstraction, contradiction, emergent joining). Each group has a known invariant — what should stay stable, what should vary. A fixture encodes those invariants as assertions.

**The feeding bug (fixed).** First build produced only 90 seeds from 14 transcripts. The pipeline makes one seed per *item*, and we were feeding whole 30-second chunks (several sentences each). Splitting chunks into sentences was **~6× richer**: 5 chunks → 5 seeds; same 5 chunks sentence-split → 29 seeds; 6 transcripts sentence-split → 419 seeds.

**Lexical recall works.** With 50 real seeds indexed, exact queries returned the right topical group every time: `deadline`→all A3, `server`→all A4, `system`→all A7, `recall`→all A9.

**The fixture's verdict on extraction.** 7 invariants passed — entity stays stable where it should, charge grades with emotion, entity varies correctly across the agency group. But **every concept assertion failed**:

`concept_id` = `concept.object`, and `concept.object` = the **last** high-tier content word in the sentence. The content filter admits any word above a frequency tier that isn't a function word — it filters by **frequency, never by part of speech**. So verbs (`arrived`, `trusts`), adverbs and temporals (`today`, `late`, `new`), and actual object nouns (`message`, `pattern`, `system`) all compete equally, and whichever lands last wins. In these sentences that's usually a sentence-final verb or trailing temporal — not the noun the sentence is about.

The selection-level fix failed — and that's the finding. A three-layer object anchor scored **0/5**; a corrected version reached only **2/5**. The cause runs deeper: the object noun is frequently *absent* from the pipeline's candidate lists. The entity detector tags `felt`/`joyful`/`message`/`arrived` all as category `object` (no noun signal). **REFUTED** as scoped: concept extraction's real gap is upstream **noun identification**, not the selection rule.

---

# 2026.06.26 — Query Expansion as Memory's Recall Front-End

ELO's memory can recall a stored seed two ways: temporal wave (every seed for an entity in timestamp order) or vector similarity (rank by 4D cosine). Neither answers the question recall exists to answer: *which stored memories are about this concept?* There is no lexical path — no route from a word, or a cluster of related words, to the seeds whose content mentions them.

Separately, ELO has a component built to enumerate the conceptual neighborhood around an idea: the **verbalizer**. It was not wired into memory. This work maps how it should connect, builds the one dependency that was fully determined, and is deliberately honest about what is specified versus what is built.

The design is **expansion, then recall**: query text → segment to surfaces + optional EPA centroid → verbalizer expands into related surfaces → look up surfaces in an inverted index → rank with memory's existing logic. That requires a component memory does not have: a surface-keyed inverted index over the seed store. We specified it; we did not build it yet.

**The "is it in the dictionary?" filter is a trap.** Space, period, comma, bang and apostrophe each have a real dictionary entry with a short Tier-0 ID, so a membership check passes them straight through. `' '` would land in nearly every seed — worst-case selectivity, storage, and query cost at once. The only filter that works keys on token *class* (`classify() == CLASS_WORD`), not dictionary membership.

**Vector search looked like the obvious bridge. It is blocked.** The verbalizer lives in 3D EPA space; seeds carry a 4D `[Em, Cg, In, Cx]` psychological signature on different natural axes. No projection between the two exists. `RecalEngine.similar()` cannot consume a verbalizer coordinate. The bridge has to ride the discrete surface join.

**OOV words turned out to be the best keys.** The segmenter keeps unmatched, out-of-dictionary words as surfaces (`parser`, `LIKELY_IMPACTS`). These have no facet/EPA backing, so the verbalizer can't expand to them — but they are precisely the discriminating terms a user would recall a seed by. Resolution: index content-word surfaces including OOV; they are recallable by exact surface match even when expansion can't reach them.

The spine of the whole integration is one decision the data keeps reinforcing from different angles: **bind to the surface, not the ID.** Vector search can't bridge the spaces; the two dictionaries don't share IDs; the provisional IDs are still moving. The surface survives all three.

---

# 2026.06.26 — vfacet Agency Classification: 47.6% to 14.5% Unknown via Two-Phase Corpus Context

The temporal LLM pass reported writing 108,422 entries. The actual improvement was 5,711. The rest were UNKNOWN written back as UNKNOWN — no-op writes the counter did not distinguish. That mismatch pointed at a deeper bug: the temporal scan was iterating `b'vfacets'` keys, which are Base64 IDs like `g4ZH`, not surface words. The LLM received ID strings and said so: *"I'm missing the actual words/phrases."* It classified them anyway via fallback index-matching, and **~179,000 entries received corrupt temporal values** before we caught it. STATE inflated to 42.8%. Recovery required a `--force-temporal` flag that re-ran the pass over `b'forward'` (the surface → id map) and overwrote the garbage.

The ID bug was the loudest failure. There were quieter ones. Pass 1 (deterministic) recomputed direction from EPA data and wrote the result unconditionally — including UNKNOWN when no EPA entry existed — overwriting LLM-set direction values from a prior pass. Direction UNKNOWN jumped **1,766 → 51,455** after a single Pass 1 re-run. LLM Pass 2 had the same issue: the write block did not check whether the existing value was already good. Fix: per-field preservation in both passes — never overwrite a non-UNKNOWN classification with UNKNOWN, regardless of what the current pass computed.

Agency required a different tool. After deterministic classification and two LLM passes, **agency UNKNOWN sat at 47.6%**. Most words are ambiguous without context: "advised" can be self-directed or other-directed; "build" can be personal or systemic. We built a two-phase corpus context classifier. Phase A indexes the 14,807-file transcript corpus once, mapping anchor words to chunk texts in a single O(corpus) pass. Phase B looks up each unknown surface in that index and extracts ±25-word windows with the target highlighted. The LLM classifies each window; a majority vote written only if the winning label meets a minimum confidence fraction.

Two runs — `--min-matches 2` then `--min-matches 1 --min-confidence 0.7` — moved agency UNKNOWN from **47.6% to 14.5%** (54,131 of 373,918 entries). The residual is largely the 39,776 surfaces with no corpus presence at all; a different signal source is required to go further. Direction closed at **0.5% UNKNOWN**. Temporal reached a structural floor at 29.6% — function words, prepositions, and proper nouns have no inherent temporal type and the LLM correctly returns UNKNOWN for them.

---

# 2026.06.25 — One Dictionary, Both Ends

The plan for the ELO Browser was never just compression. It was to make the browser the place you talk to ELO AI — and to do that over a channel where the *model's tokenizer is the dictionary*. Same surfaces, same IDs, same facets on both ends. If that holds, a captured page and a chat message are already in the model's native language; nothing has to be re-tokenized.

Getting there meant admitting a wrong turn. We'd been raising token density by baking space-prefixed word variants into the dictionary. Then we actually read the canonical codec and found the density was supposed to come from the **codec**, not the dictionary: drop the single space between two words on encode, put it back on decode (plus lowercase + a case marker). Measured on a real transcript dictionary, that one transform took us from 3.6 to 5.4 characters per token. The variants were compensating for a transform the browser's codec simply didn't have yet.

So we built the dictionary the canonical way instead of by hand. `elo-browser-v01` is the v0.4 general corpus — transcripts and books — with the website/HTML vocabulary folded in (the general dictionary covered ~0.5% of it), built to the full 262,144-token cut, with the semantic facet layer and a per-surface meta DB. Then we ported the canonical encoder, decoder, and the LLM tokenizer into the browser's Rust core — tokenizer, implicit-whitespace, caps, phrase matching, the tier-tagged binary, and the integer ID stream the model consumes.

The honest part is how we knew it was right. We generated conformance vectors straight from the Python pipeline — text in, exact `.elo` text, exact binary, exact model IDs out — and made the Rust match them byte-for-byte. It caught a real bug: our first ID stream produced numbers above 262,144 because we'd inverted the wrong ID scheme. The test failed, we fixed it, and now all three conformance suites pass. The browser emits exactly what the trained model will consume — by construction, not by hope.

Live in the app, typing a sentence into the console now shows the real thing: around **2× more context** than a standard tokenizer and **~2× smaller on the wire**, fully lossless. (A phrase-rich sentence hits 7.9 chars/token; the corpus average is nearer 5, ~1.26×. We quote the average.) Both wins are independent — even at token parity, the transferred stream is smaller *and* still semantically queryable.

One dictionary, one tokenizer, both ends — verified. The next post is the one we've been building toward: training the model against it.

---

2026.06.24 — Two Dictionaries Are Better Than One

One codebook can't do everything. We encoded Frankenstein with the *web/structure dictionary* and got **1.00×** — no compression at all, because a novel isn't structure. Encoded with the *text dictionary*, the same book came in at **1.17× lossless**. Flip to data and the boundary flips too: on JSON, the web dictionary's byte hit-rate is **1%**; the text dictionary's is **46%**.

The fix is *not a bigger dictionary*. We already tried that — scaling the web dictionary from 318 to 14,487 entries barely moved the ratio, because the bottleneck was never structural vocabulary. The fix is **multiple dictionaries**, each owning what it's good at, with the right one selected per stream. The browser now ships two built-in codebooks — **structure** and **text** — auto-discovers any others dropped in a folder, and lets you switch between them; the samples auto-select the codebook they were encoded with. The last step is **selection without a human**: a dictionary identity stamped into each `.elo` so the browser detects which codebook a page needs.

The principle underneath: **compression ratio comes from the dictionary, not the format or the language.** Routing content to the codebook that owns it — structure, text, domain experts — is the lever.

Why any of this is trustworthy. Every claim, ours or a model's, gets tagged **VALIDATED**, **REFUTED**, or **UNVERIFIED** against the real data before it ships. This stretch alone: *"2.35× compression" was refuted* as a general claim and corrected to **1.15×**. An early text-dictionary estimate showed impossibly good numbers because it used placeholder bytes gzip crushed to nothing — caught, re-run with real IDs, reframed. *"ELO beats Brotli" was refuted* and narrowed to what the data supports.

And the honest limit: multi-dictionary gains at scale are still **UNVERIFIED**. We've shown the boundary and built the selector; the routed end-to-end pipeline is prototyped, not yet benchmarked. We'd rather say that than round it up.

---

2026.06.24 — The Codebook Is the Index

Compress a page with standard tools and the output is opaque. To ask "how many forms are on this page?" you have to decompress the whole thing and parse it. An ELO page is different: it's a stream of **dictionary IDs**, and the *same ID that reconstructs a token also carries its meaning*. The browser can read a page without rendering it.

**Structure without parsing.** A structural query — count the links, headings, images, forms, landmarks — scans the compressed stream and skips the content payloads entirely. It touches about **11% of the bytes**, runs **~5× faster** than decode-then-parse, and matches a ground-truth parse exactly on every tag the dictionary covers. gzip and Brotli can't do this at all; their output means nothing until fully decompressed.

**Meaning, precomputed.** The dictionary carries more than shape. Every word has **EPA affect coordinates** — Evaluation, Potency, Activity — from the Mneme substrate (13,905 words): *love* reads strongly positive, *fear* negative, *power* high-potency. Every entry also has a **4-byte facet**: a semantic bucket, a composable logic-cue mask (**CAUSE**, **CONTRAST**, **INFERENCE**, **CONDITION**…), and a utility class. All of it assigned once, by deterministic rules, with no model.

In the browser these are **native Rust lookups**. Type a word, get its affect and facets instantly. Load a page, get its aggregate emotional tone — we ran it over all of *Frankenstein*, ~20,000 words, immediately. Scan a page, get its reasoning cues with the words that trigger them. *Memory-speed, offline, zero inference.*

The honest line is the one from our own spec: this is **queryable lexical and logical structure at zero inference cost** — not "it understands text." Accuracy is bounded by dictionary coverage. We know the boundary precisely because a count check caught our facet scanner miscounting `<aside>` as a link; we fixed it and re-ran to **100% agreement**. The claims here are the ones that survived the check.

---

# 2026.06.24 — A Browser That Ships the Dictionary, Not the Page

Every browser re-downloads the same structural knowledge on every page load. The same `<!DOCTYPE html>`, the same `class="`, the same Tailwind and Bootstrap classes — megabytes of text every browser already understands, sent again to every user, forever. The idea behind the ELO Browser is to stop doing that: **ship the structure once, as a dictionary inside the browser**, and send pages as compact ID streams the browser decodes locally.

It runs. We built a **lossless `.elo` codec** — greedy longest-match over the dictionary, everything unmatched kept as a literal, so `decode(encode(x)) == x` by construction — first in JavaScript, then ported to Rust. On top of it sits a real desktop browser: **Tauri v2**, a Rust core with the **14,487-entry dictionary** resident in RAM, a React + Tailwind front end. Pages decode and render byte-exact — **145/145** across a nine-category corpus, `cargo test` **4/4** on the native codec.

**On compression, the honest result.** A static dictionary does not beat Brotli on raw bytes. It beats *gzip* (ELO→gzip is **~4–10% smaller** than gzip alone), and ELO→Brotli wins on the framework-heavy pages a browser actually serves — Tailwind, Bootstrap, Foundation. It loses to Brotli on prose, because prose isn't structure. Brotli already ships its own ~120 KB web dictionary, so raw ratio was never going to be where this wins.

We know that because we checked. Our first sample showed **2.35×**. So we ran an independent 100-page benchmark, watched it fall to **1.15×**, and traced why. *We corrected the claim rather than keep the flattering one.*

Ratio isn't the point anyway. The point is that a page arrives as **dictionary IDs the browser can *read* without rendering** — structure, affect, and reasoning, queryable in the compressed form. That's the next post.

---

# 2026.06.22 — Phrase Affect Coverage: 0% to 97.8% Without a Model Call

The problem was scope. Forty percent of the dictionary is multi-word phrases — "at the end of the day," "long-term," "in order to." The Warriner affect lexicon we started from covers single words only. So every phrase had zero affect coverage, and overall only 4.4% of dictionary content carried an emotional reading at all. A semantic machine that can't reason about the affective weight of 40% of its vocabulary is missing something fundamental.

The obvious fix — send 167,000 phrases to an LLM — is expensive, non-deterministic, and impossible to reproduce. We didn't do that. We let deterministic structure carry as much as it could and used AI only on what structure couldn't reach.

Three passes, all deterministic:

**Compositional inheritance.** Most phrases are compositional — their affect follows from their words'. "Long-term interest" is a weighted average of "long," "term," and "interest." We already had word affect scores. Applying the rule to phrases cost nothing. Phrase coverage: 0% → 62.9%. Overall: 4.4% → 29.9%.

**Lemmatization before lookup.** "Running" inherits from "run." One rule, no model. Word coverage: 7.4% → 17.2%. Phrases: 62.9% → 74.3%. Overall: 29.9% → 40.3%.

**Broader lexicon.** NRC-VAD v2.1 adds 54,801 entries, including ~10,000 multi-word expressions. Its new words cascaded into more compositions; its phrase ratings covered many directly. Phrases: 74.3% → 97.8%. Overall: 40.3% → 56.7%.

Before the NRC merge went in, we ran a correlation gate. Valence agreed well (0.81). Dominance didn't — 0.33 between the two sources. They were measuring the same named axis with different underlying assumptions. A blind merge would have corrupted the Dominance dimension across the entire dictionary. We merged by priority instead: trusted source wins the overlap, the rest flagged as lower-confidence pending further validation.

The genuinely hard residual that actually needs a model call: 3,645 entries. That's what's left after structure did everything it could.

---

# 2026.06.22 — Three Layers Inside Every Compressed ID

When you compress a file with standard tools, the output is opaque. You can't search it, filter it, or reason about it without decompressing first.

EloAI compression doesn't work that way. Every ID in the output stream carries three embedded layers that make the compressed representation directly machine-operable.

**Dictionary.** Each word or phrase maps to a compact Base64 ID, tiered by use case — char-2 (~1,300 entries, for edge and keyboard devices), char-3 (~83,000, for on-device applications), char-4 (417,841 and growing, for full LLM vocabularies). Compression is byte-exact — decode reproduces the original string exactly, no approximation.

**Facets.** A 4-byte record on every ID encoding what kind of thing it is: semantic category, logical/discourse role, whether it's content vs. filler vs. structural. This is the operational layer. Find every causal claim in a document. Strip filler tokens. Locate questions. Route content by type. All of it directly on the compressed stream — no decompression, no NLP pipeline.

**Affect.** EPA coordinates (Evaluation, Potency, Activity) on every ID, derived from Warriner norms and extended across phrases and lemmatized forms. The compressed stream becomes a navigable semantic space. You can measure the emotional trajectory of a document without ever reconstructing it as text.

The encoding step and the meaning-annotation step are the same operation. This is what makes 78–98% meaning reconstruction without an LLM achievable: the structure crystallized at build time does the work that would otherwise require inference at query time.

---

# 2026.06.22 — What the Validation Gate Caught: Three Errors in One Session

The rule: every external claim gets tagged VALIDATED, REFUTED, or UNVERIFIED with evidence before it affects the build. AI suggestions, lexicon assumptions, third-party data — all of it goes through the gate.

In the affect coverage work, the gate caught three errors in a single session. Any one of them would have shipped silently without it.

**Error one: wrong scale.** A lexicon we'd been treating as scaled 0 to 1 was actually −1 to +1. The values looked plausible in isolation. The error only surfaced when we checked the distribution against known anchors.

**Error two: magnitude mismatch.** A rescaling suggestion — intended to normalize the two sources before merging — would have put them on different absolute magnitudes, not the same one. The proposed fix would have introduced the error it was meant to prevent.

**Error three: axis disagreement.** Before merging NRC-VAD, we ran a correlation gate. Valence: 0.81. Dominance: 0.33. Both lexicons have a Dominance axis. They aren't measuring the same thing. A naive merge would have corrupted an entire semantic dimension across the full dictionary.

These are ordinary errors. They're not edge cases — they're the normal result of combining data sources built by different teams with different assumptions. They don't announce themselves.

The infrastructure makes the gate enforceable: every dictionary build carries a corpus fingerprint and provenance record for each artifact. When a source is merged, the merge conditions are recorded. When a discrepancy surfaces later, you can trace exactly where it entered and why it was accepted. Nothing is a mystery blob.

---

# 2026.06.19 — The Dictionary Is Not a Dictionary

The thing we've been calling a dictionary isn't one.

A lexicographic dictionary maps words to definitions. A compression lookup table maps strings to shorter strings. The EloAI semantic machine does neither. Every entry in the system simultaneously exists across five dimensions: a **compression address**, a **vector position in EPA space**, a **semantic facet**, a **Surov process stage affinity**, and a **relational co-occurrence cluster**. The ID is not a shorthand for the word. The ID is the address of a semantic object with all five dimensions active at once.

This changes what the system is. When you encode a document, you are not compressing text. You are converting a string into a sequence of addresses into a multidimensional semantic space. The compression ratio is a byproduct. The semantic structure is the point.

Two practical consequences fall out immediately. First, **meaning is stored, not computed**. An LLM reconstructs meaning at inference time from fragments. The semantic machine stores meaning as structure at build time and retrieves it at ~100ns per lookup. Second, **the system is fully inspectable**. Every output can be traced back to the exact IDs that produced it. The reasoning is auditable. The weights of an LLM are not.

The naming catches up with the reality eventually. We're calling it the **semantic machine** now.

---

# 2026.06.19 — 39 Sextillion Parameter-Equivalents From a 7MB File

LLMs are described by their parameter counts. GPT-3 at 175B. GPT-4 estimated at 1.8T. These numbers index how much meaning the model compressed into static weights during training.

The EloAI semantic machine has a different parameter story. Each of the 83,226 entries carries five layers totaling ~39 dimensions per ID. Stored, that's about 3.2 million values — modest by any measure. But the machine doesn't operate on stored values alone. It operates on combinations. Every time you add IDs together to form a semantic object, you are sampling from a combinatorial space whose size grows faster than any fixed parameter count can track.

The math: the number of unique 10-ID combinations across 83,226 entries is approximately 1 sextillion. Each combination produces a unique 39-dimension semantic object. **Effective parameter-equivalents: 39 sextillion.** From a file that fits in 7MB of RAM.

The more important distinction is not the number. It is what the parameters do. LLM parameters are **frozen** — a snapshot of meaning baked in at training time. The semantic machine's parameter-equivalents are **generative** — they emerge at query time from structure that was loaded once at startup. Adding a new word to the dictionary does not add 39 parameters. It adds 83,226 new two-ID combinations, 83,226² new three-ID combinations, and so on. The effective parameter space expands combinatorially with every new entry. No retraining required.

The comparison to LLMs is not a claim of equivalence. It is a claim of architectural difference. The LLM learns meaning. The semantic machine stores it. For a large class of tasks — topic extraction, semantic search, document comparison, routing, classification — **storage beats computation by orders of magnitude**.

---

# 2026.06.19 — Vector Addition as the Inference Engine

The core operation of the semantic machine is **not a forward pass. It is addition.**

Each ID carries a vector position in EPA space — Evaluation, Potency, Activity — derived from Warriner et al. affective norms and projected outward via corpus frequency. Adding any number of IDs together produces a new semantic object whose EPA centroid is the mean of the constituent vectors, whose stage affinity is the weighted average of the constituent stage profiles, and whose relational cluster is the union of constituent co-occurrence sets. Five LMDB lookups per ID. Pure arithmetic after that. No model call.

This is why 78–98% meaning accuracy without an LLM is achievable. **The reconstruction problem is solved at build time, not at inference time.** By the time a query arrives, every semantic relationship that matters has already been crystallized into the ID space. The algorithm adds vectors. The structure does the rest.

The bottleneck is **the lookup count, not the lookup cost**. A single LMDB read is ~100ns. The fix is straightforward: collapse all five layers into one 84-byte packed binary record per ID, load the full 7MB array into RAM at startup, and reduce every lookup to an L3 cache hit at ~5ns. A 100-word document goes from 500 LMDB reads to 100 array reads. At a million documents per day, that difference is measured in hours of wall-clock time recovered.

The C migration path — `sc_encode`, `sc_decode`, `sc_open_library`, `sc_close_library` — makes this essentially free at the hardware level. At that point the bottleneck shifts entirely away from lookup and onto computation, which is where it belongs. The semantic machine becomes fast enough to run on every keystroke in an IDE, on every token in a streaming inference pipeline, on every document in a corpus of arbitrary size. **Without touching a GPU.**

---

# 2026.06.18 — Elo Packaging Standard: From Scratch Concepts to Distributable Wheels

The informal folder structure that has served the project since inception — drop a concept in `R-D-concepts/`, hack until it works, then copy-paste into the main codebase — has been replaced with a formal three-stage lifecycle: **Incubate → Develop → Distribute**.

`R-D-concepts/` remains the zero-friction scratch space. Anything that survives long enough to be imported by another module graduates to `packages/` as a proper Python package with a `pyproject.toml`, a semver tag, and a changelog. Anything that needs to leave the monorepo builds to a wheel in `dist/` and publishes by explicit choice — proprietary packages stay private by default.

The current package index reflects where each piece of the stack actually sits:

**`elo-file-format`** — v1.0 spec complete. The binary layout, tier system, and byte-fallback tables are frozen. This is the contract everything else compiles against.

**`semantic-compression`** — v0.3.0 shipped and validated. Still running as a loose module; packaging pass is the next commit.

**`eight-engines`** — skeleton lives at `elo_dev/*.py`. 12 modules, 1,656 lines, all tests passing. Needs the `pyproject.toml` wrapper before it can be a dependency.

**`semantic-meanings`** — Stage 2 work, locked until the EPA projection contract is finalized. Do not start.

**`elo-core`** — the integration layer that wires the stack together. Not started. Depends on everything above it.

The main value of this isn't ceremony — it's that `pip install elo-semantic-compression` is now a real end state instead of a hypothetical. Packaging discipline forces the API surface to be explicit, which has already caught two implicit dependencies that were invisible when everything lived in the same namespace.

---

# 2026.06.17 — Logic Matrix: The Filtering Layer That Makes Attention Computable

A persistent failure mode in early eight-system iterations was that every Seed triggered every system — expensive, noisy, and not how cognition works. The **Logic Matrix** is the fix: a 329-line admission gate that evaluates each incoming Seed against the current context and decides whether it enters the pipeline at all.

The scoring model is a weighted sum across twelve activation dimensions: relevance to current goals, semantic distance from recent Seeds, recency, emotional significance, structural novelty, and several others. Each dimension produces a float in `[0.0, 1.0]`; the weighted combination yields an **attention score**. Seeds below a configurable threshold are rejected before any of the eight systems ever sees them.

This mirrors a well-documented principle: biological attention systems don't amplify everything — they suppress most of it. The interesting research question isn't "what did the system notice?" but "what did it choose not to notice, and why?"

Two practical outcomes from running the Logic Matrix in tests:

**Rejection is the common case.** Across 50 test Seeds, the matrix admits roughly 30% by default threshold settings. The other 70% are discarded. This is a feature, not a failure — the pipeline only processes what clears the attention bar.

**Threshold tuning is nontrivial.** Setting the bar too low floods the eight systems with noise. Setting it too high means genuinely important Seeds are dropped before Intention can evaluate them. The right threshold appears to be context-dependent; static configuration is a known limitation of the current implementation.

Vector DB upgrade (Chroma or Pinecone) will let the Logic Matrix do semantic nearest-neighbor scoring instead of heuristic weighting. That's the path to dynamic thresholds.

---

# 2026.06.16 — Seven Developmental Stages: Why Training Sequence Matters More Than Data Volume

The training pipeline shipped in `training_pipeline.py` doesn't fine-tune a model in the conventional sense. It runs a seven-stage developmental sequence — each stage targeting a specific cognitive capability — and uses the eight-system pipeline to integrate each training example into memory.

The stages in sequence: **Sensory and Language Basics** → **Imitation** → **Guided Correction** → **Skill Isolation** → **Mixed Practice** → **Self-Reflection** → **Responsibility Training**.

The design is deliberately analogous to human developmental progression. A child doesn't learn ethical reasoning before they can parse sentences. The sequencing isn't arbitrary — later stages assume capabilities established by earlier ones.

Two things validated in testing that weren't assumed in design:

**Memory integration works as the learning mechanism.** Rather than updating weights during the simulated pipeline, each successfully processed training example is stored in the Memory system as a `Seed` with type `SeedType.FACT`. The model's "learning" is its accumulating semantic memory. After a full pipeline run, `ocean_model.memory.size` reflects how many examples were integrated. This is a weak proxy for learning — real fine-tuning hooks are deferred — but it gives the pipeline an observable state change to verify against.

**Stage seven is structurally different from the others.** The first six stages are capability-building. Stage seven — Responsibility Training — is constraint-building: uncertainty acknowledgment, limits, judgment under ambiguity, ethics. It's the only stage where the success criterion is *not* maximizing task performance. This asymmetry is intentional and reflects a design principle: capability and judgment are separate training targets that shouldn't be collapsed into a single loss function.

All five test cases pass. Full pipeline execution verified end-to-end.

---

# 2026.06.15 — v0.1.0: Eight Systems Implemented, Five Tests Pass, Pipeline Runs End-to-End

First complete version of the eight-system cognitive framework. All modules written, wired, and tested. The `Irin` orchestrator coordinates the full pipeline: a Seed enters through the Logic Matrix, passes through all eight systems in sequence, and produces a structured result from Reflection on the other side.

**What shipped:**

12 modules, 1,656 lines. Each of the eight cognitive systems — Intention, Perception, Memory, Wonder, Emotion, Reasoning, Connection, Reflection — is a standalone class with a `process(seed, context)` method and a typed result dataclass. They share no state. `Irin` is the only thing that knows the sequence.

The LLM interface wraps Ollama with a schema-driven structured generation call — `structured_generate(system_prompt, user_prompt, schema)` returns a validated dict or raises. The MockLLM in tests returns canned responses keyed on system prompt content, which is enough to validate pipeline wiring without a live model.

**What the tests actually exercise:**

- Seed creation and field defaults
- Logic Matrix admission and rejection on threshold
- `Irin.ingest_seed()` — full Logic Matrix + eight-system pass
- Full processing cycle with result propagation
- Seven-stage training pipeline with memory verification

**Known gaps going into v0.2:**

Memory is in-process only — no persistence across runs. Real LLM integration is untested; MockLLM responses are structurally correct but semantically flat. The training pipeline simulates learning via memory storage rather than actual weight updates. Serialization for `Irin` state is unimplemented.

These are deferred deliberately, not overlooked. v0.1.0's job was to prove the architecture wires together correctly. It does.

---

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