# 2026.07.31 — A Trained zstd Dictionary Beats Us at Compression: The Ratio Was Never the Claim

Yesterday we published that dictionary-then-gzip beats gzip alone on prose — 10 of 10 books, mean 0.85x. True, and the wrong benchmark, for a reason that takes one command to find: `zstd --train`. If a format's argument is "ship a dictionary and compress against it," the honest comparison is against other formats that ship dictionaries. We had picked a competitor for being beatable.

A 2.1MB trained zstd dictionary compresses four held-out books to **118,050 bytes**. `elo + xz` needs **158,212** — and 13MB resident on the receiver instead of 2.1MB. **25% worse at six times the size.** Nor does low duplication rescue it: on 20,000 unique, fully in-vocabulary words Elo still loses (2.04x vs 2.25x), because general compressors entropy-code and Elo substitutes and stops. On random identifiers the file *expands*, to 0.81x.

Training zstd's dictionary on `.eloB` streams instead of raw text looked like the answer — 4.78x, a 21% win. Re-run on three different books it **reversed to a loss**. The cause was not method: that sample is 97% a 4.7MB biographical reference work with 42,020 OOV proper names, plus Shakespeare. Same code, opposite verdict, different books. It survived only because the rule was to re-run good-looking results on a fresh sample before believing them.

What does hold is domain match. The build was made from 327M tokens of transcripts, and transcripts are where it wins: **6.03x against 5.72x**, +5.4%. Technical prose +1.3%. Proper-noun-heavy books −1.9%. Markup −13%.

And one property nobody designed. Encoding *Alice*, the emitted id stream — what a receiver without the dictionary sees — has its most frequent symbol at **11.2%**, not the 38.7% of the raw token stream, because implicit spaces are dropped and 46% of tokens are absorbed into multi-word phrase ids. **Only 92 of 7,453 distinct ids (1%) are uniquely determined by frequency rank**; 4,796 appear exactly once. Letter-frequency analysis has nothing to grip. Known plaintext is still fatal, and the dictionary is a static global key — so this is obfuscation with measured limits, never confidentiality.

The full write-up has the four-codec tables, the dictionary-scaling saturation, the entropy "floor" that wasn't one, and why these are complements rather than competitors.

---

# 2026.07.31 — The Teaching Loop Closes: Elo Asks What It Doesn't Know, and Then Knows It

Asked **"do you know what a car wash is?"** — twice, directly — Elo answered by quoting the nearest seed containing the words: *"From what you have told me: 'I want to wash the car'"*. No curiosity fired. The wonder system pinged every turn about surface novelty while the clearest epistemic gap in the conversation — a definition question it could not answer — triggered nothing. The machinery to file open questions existed; filing is not asking. A system that writes its ignorance down and never says it out loud does not get taught.

The fix was wiring, not invention. The dictionary has shipped a 16-bit logic-cue mask over 304 curated surfaces since the build family landed, and nothing consumed it — the reply path chose between two templates on whether the query ended in `?`. Now the cue mask names the shape of the question, a definition-shaped question whose recall holds only *mentions* says that split plainly and **asks** — *"I have not been told what 'car wash' means. What is it?"* — and the trailing question opens a capture slot. The next turn is heard as an answer, acknowledged, and kept. Live, on a fresh store: gap detected, asked, taught, captured, served back grounded on the taught seed. Reply-shape probes went **3/10 → 11/11**; the gateway suite grew to **145/145**.

Every defect on the way was found in a live transcript; the suites caught none of them first. The best one: taught *"a car wash is a place **where** you take your car…"*, Elo said *"That answers my question — noted"* and then re-asked the question in the same breath — the relative clause's `where` carries a QUESTION cue, and the shape reader called the teach a question. The rule kept: an assertion verb before the first question-cued surface makes the turn a statement. Runner-up: **"yes" was a stopword**, so accepting Elo's own circle-back offer tokenized to nothing and went nowhere.

The full write-up has the probe tables, the four live-transcript failures, the intent guard that forbids claiming ignorance while holding the answer, and why the inference to "drive" is deferred to the reasoner rather than faked by a template.

---

# 2026.07.30 — Two Kinds of Redundancy: Dictionary-Then-gzip Wins on Prose and Loses on Markup

The `.elo` transport is two-stage — encode to dictionary ids, then gzip — and that only pays if the stages compose. There is a specific reason to doubt they do. gzip earns its ratio on long repeated literals, and a web page is full of them: `<div class="`, repeated attribute names. Dictionary encoding replaces exactly those with short unrelated ids, attacking the redundancy gzip depends on. Nobody had measured it.

Ten public-domain books through the production `.eloB` encoder: **10 of 10 beat gzip alone, mean 0.85x**, range 0.81x to 0.98x. The outlier explains itself. `modern_english_biography` lands at 0.98x and logs **42,020 OOV tokens**, against **97** in Frankenstein — it is a biographical reference work, wall-to-wall proper names, precisely the content no fixed vocabulary can hold. The win tracks OOV density.

Markup runs the other way, 1.07x to 1.14x worse. The principle underneath: **the dictionary captures global redundancy, gzip captures local redundancy.** A nine-character word recurring across a 327-million-token corpus becomes a two-byte id because the dictionary was trained on that distribution; gzip only ever sees 32KB at a time. Markup's redundancy is long literal repeats inside that window, and replacing them with short ids destroys matches gzip would have found for free.

Three things broke. The production encoder **cannot encode any captured web page** — the OOV capitalisation mask has a one-byte length prefix, and real pages carry tokens up to **18,775 characters** of base64, so the markup half is model-derived and weaker for it. The model itself masked the finding: it put the biography at 0.85x, indistinguishable from the novels, and had the paper shipped on those numbers it would have claimed a tight band that does not exist. And the first measurement pointed the opposite way entirely — 1.11x–1.21x worse everywhere — because it measured the pipe-delimited *text* stream, which is not what `.elo` ships.

The full write-up has the ten-book table, the OOV counts behind the outlier, the CAP-field defect, and why the consequence is a per-document branch rather than a fix.

---

# 2026.07.30 — Coverage Answers the Wrong Question: A Page at 98% Coverage That Expands

A dictionary build closed a vocabulary hole: structural characters that captured web pages use constantly and a conversational corpus never contained. Article pages improved as intended — on live cnn.com the browser's transfer ratio moved **1.17x → 1.28x**, with OOV roughly halved across every captured sample. Then a Google results page came back at a poor ratio with **98% coverage**, and the two numbers looked contradictory. If nearly every token resolves, what is costing the bytes?

They are not contradictory. They answer different questions, and only one was being asked. Coverage asks *did we find an id*. It does not ask *did the id save a byte*. A text stream pays `len(id) + 1` per token — the id plus one delimiter — so a one-character token costs two characters to encode one. It expands no matter how common it is or how completely the dictionary covers it.

That page is **64.2% single-character tokens**, mean token length 2.83. The largest line items are punctuation the build had *already fixed*: `-` costs 70,322 characters, `{` and `}` 42,744 each. They have ids now. They still expand, because no id can be shorter than the one character it replaces. The delimiter alone accounts for **696,079 characters — 22.3% of the stream**. The remaining OOV is the minifier, not language: `gm3`, `jsaction`, `TgQPHd`. For scale, the page's readable content is **13,213 characters out of 1,967,703 — 0.67%** — and it says what it has to say in **581 unique words**.

Two of our own measurements were wrong first. The frame test queried the LMDB, which holds all 437,995 entries, and concluded both builds behaved identically — but the browser loads a 261,872-entry cut, and `{` sat at rank 276,119: in the database, unreachable by the encoder. A test that queries a superset of what the system uses will report that everything is fine. And the first cost model omitted the delimiter, putting unprofitable entries at a comfortable 7.5%; adding the per-token constant moved it to **27.9% of corpus occurrences**.

The full write-up has the per-sample before/after table, the cost attribution, the deferred format changes, and why extracting the readable text — 149x less input, and the obvious-looking win — is not available to a lossless format at any ratio.

---

# 2026.07.30 — The Delimiter Had No Id: Markdown Tables Were Not Losslessly Representable

The text stream separates token ids with a pipe, and a token the dictionary does not know is emitted as `OOV:A:` followed by the raw character. Those two facts are incompatible. A pipe in the source becomes `OOV:A:|` — an encoded part that *contains the delimiter* — so splitting the stream back apart hands the decoder a fragment and an empty string where one token used to be.

A markdown table is pipes. Three lines of table, encoded under `elo-browser-v01a`: **12 encoded parts carried the delimiter, and 42 parts became 54 on re-split** — twelve phantom tokens injected into the frame by the document's own content. One captured CNN page carried **24,874** such parts. Every markdown table the system had read was corrupt at the frame level, and nothing raised.

The cause was absence, not rarity. `|`, `` ` ``, `~` and `\xa0` were not in the dictionary at all. `{` and `}` were — at rank 276,119, beyond the 261,872-entry cut the browser loads, so present in the LMDB and unreachable by the encoder. **Presence is what the database records; reachability is what the encoder gets.** Eleven surfaces are now declared as a structural floor, landing at ranks 51–63 inside every profile cut down to `tiny`. The delimiter itself never moved: with the pipe carrying a real id, no encoded part can contain a pipe.

The fix failed silently the first time. The build recorded `force_include_count: 10` and changed nothing — `|` came out holding a Tier-1 id at rank 437,989, outside every cut, because a second sort two hundred lines below the rank floor re-ordered by raw frequency. Its comment read *"should already be by frequency desc"*: true when written, false afterward. And `"\r"` was declared, injected, and unmatchable — `tokenize` returns `'\r\n'` as a single token, so every Windows-authored file paid the OOV price while the forced surface sat unused and the count still reported 10 of 10. It measured declaration, not coverage.

The full write-up has the per-build surface table, the frame-integrity assert, the three findings that turned out to be our own reader bugs, and the deferred `0x1F` divergence.

---

# 2026.07.29 — A Load Rule With Nothing to Compare Against: The Codec Vocabulary Carried No Fingerprint

The browser dictionary is not a file, it is a family: a codec vocabulary of 261,872 words plus three binary channels — affect, affordance, denotation — that are parallel arrays over the same index. The rule governing it is one sentence: verify all three channel headers carry the same fingerprint, **and that it matches the vocabulary you decode with**. The hazard is specific. A foreign asset parses cleanly and returns the wrong word for every id. Nothing crashes; the system is quietly wrong about what things mean.

Half that rule was enforced. The three channels were checked against each other. The clause guarding the worse mismatch — assets from build A indexed by a vocabulary from build B — had no implementation, and could not have had one. `CanonDict` had no fingerprint field because the JSON it deserializes had no fingerprint key, because the exporter never emitted one. Its header carried eight fields; not one of them was an identity. The check was not weakly enforced. It was unaskable.

The fix reads the fingerprint from the same LMDB the `.bin` emitters already read, carries it into the browser as an `Option<String>`, and compares tri-state — known-vs-known asserts, known-vs-unknown warns, because a vocabulary exported before July is not evidence of drift. Those semantics were copied from Stage 06's index guard and Stage 07's load rule rather than invented. **Six artefacts now agree on `b1790799…`**, so the new assertion passes rather than merely compiling.

The change that enforces the rule nearly violated it. Adding one header key means re-deriving all 261,872 entries, and the browser compiles that file in as the join key for all three channels — a projection that drifted by a single row would shift every id and point the assets at the wrong words. It was caught only because we diffed the regenerated entries against both existing copies *before* writing either one: identical, and the committed diff came back one line. The tempting shortcut was worse still — hashing the CSV already in hand needs no dependency and produces a number that is not the number in the headers. `BINDINGS.md` names that failure by name.

The full write-up has the artefact table, the test counts, the fragility nothing enforces, and the two clauses still unverified.

---

# 2026.07.27 — Numbers Were Not Mangled, They Were Deleted: A Second Tokenizer With No Digit Class

A probe failed on `18th century`. The compositionality table said the phrase was trusted; the encoder said it had never seen it. The obvious read was a keying mismatch — the table is built from dictionary surfaces, the encoder from its own normalization, and those drift. That read was wrong, and the truth was worse. The encoder wasn't rendering `18th century` badly; it was rendering it as `th century`. And then: `"I have 3 cars"` → `[i, have, cars]`. `"it cost $40"` → `[it, cost]`. `"call me at 555 1234"` → `[call, me, at]`. **Every number in every sentence was gone** — not truncated, absent. A system built to remember what you told it could not represent *how far*, *how many*, or *how much*.

Two layers caused it. `_TOK_RE` has no `\d` anywhere in it, so `re.findall` silently discarded bare digits and matched `18th` at offset 2 as `th`. And `is_punct = not raw[0].isalpha()` flagged any digit-initial token as **punctuation** — which `EncodedSpan.chunks` excludes by design. Even correctly tokenized, numbers would still have been dropped one step later. The scope keeps this from being a much larger claim: the **compression path was never affected**. The dictionary carries the digit tokens directly (`100`→`mn`, `18th`→`rLb`, `3`→`gdf`), so the byte-exact round-trip stands. The loss lived entirely in the *meaning* path — a second tokenizer, different module, different vocabulary.

The first fix made it strictly worse: adding the digit class alone moved `18th century` from `th century` to nothing at all, because the token now matched the numeric branch and was then flagged punctuation by the untouched second layer. And an hour before finding the cause, we had written the symptom into a docstring as a permanent limitation — carefully hedged, internally consistent, describing a symptom as a cause. A limitation written into a docstring is a claim, and deserves the same validation as a result.

The near-miss is the part that stings. The failing probe was on a numeric phrase, so the first instinct was that it had sampled badly, and the fix was to filter sampling to alphabetic phrases only. That change was written. It made the suite green. Had it shipped, the one signal pointing at a total loss of numeric meaning would have been suppressed by a test that looked *more* rigorous for having a filter in it.

The full write-up has the before/after table, the dictionary IDs proving compression was untouched, the six suites that stayed green, and why this is the second defect in one day caused by two implementations of one concept drifting apart.

---

# 2026.07.27 — Non-Compositionality Finds Idioms, Not Compounds: A Signal That Cannot Tell "Good Luck" From "Hard Drive"

Teaching Elo a compound works — say *"car wash is one thing"* and every later mention files under it. But most compounds never get taught; they just get used. So the next capability is discovery, and there is a measure that looks purpose-built for it. **Compositionality** is the cosine between a phrase's composed word vectors and its direct embedding: high when a phrase is its parts (`red car`), low when the whole diverges (`hot dog`). The build already ships 132,384 of these scores. Low compositionality means the meaning isn't the sum of the words — which is what a compound is.

The reasoning is wrong and the data says so plainly. Low compositionality means **idiomatic**, and the most idiomatic things in a conversational corpus are not compounds but pragmatic formulas. We enumerated the complete population — every phrase that could ever pass all four detection signals — and hand-labelled it: **198 phrases, 28 genuine compounds, 14.1% precision.** The rest are `sounds good`, `good luck`, `go ahead`, `too late`, `good job`. (Labelling was incomplete — `monetary policy` and `patriot act` sat in the reject pile — so read 14.1% as a floor, nearer 20%.) Running a full phrase-inventory hygiene pass, which genuinely fixed the miner, moved it 14.1% → 14.7%. Tightening helps precision and destroys reach: the strictest rule we measured hits ~59% but can ever ask about **17 phrases in the entire corpus**.

And the canonical target is unreachable. Run live, `car wash` has no compositionality row at all — it was never mined — so the signal cannot fire on the example the work is named after. Only teaching reaches it.

The instructive part is that a spec in this repo had already measured this exact CSV and written the conclusion — *"Not now for conversational/browser builds — the data says the payoff isn't there"* — before we started. It sat in a folder that wasn't connected. That is an explanation, not an excuse: the standing rule is to read the spec for every term, and "I couldn't find one" should have been a question, not a green light.

The full write-up has the population tables, the four false-positive families, the two defects a mocked suite hid, and why a POS tagger would help but could never separate `good call` from `hard drive`.

---

# 2026.07.27 — A Correct Gate With an Incomplete List: 36.8% of a "Lexical" Phrase Set Wasn't

The phrase miner turns raw n-grams into dictionary phrase atoms, and its default output is noisy by design — PMI is a score weight rather than a filter, so the most frequent fragments win whether or not they are phrases. The spec prescribes five hygiene gates to isolate genuinely lexical phrases. All five were implemented. A hygiened candidate file already existed. The problem was visible on its first line: `and you know`, then `and then`, then `and i think`. The edge-function gate exists precisely to reject a phrase starting with `and`. It was enabled. It did not fire.

The gate was correct; its lookup was blind. `config.FUNCTION_WORDS` contains no conjunctions — no `and`, `but`, `or`, `so`, `because`, `if`, no `not`, no wh-words: **40 words missing** against the substrate's list. And the omission is *deliberate and right*. Its own docstring says so: those words are already FUNCTION via a LOGIC_SEED cue, and we measured that 32 of the 40 do resolve that way. The set is correct for facets, which consults both paths, and wrong only for a caller doing raw set-membership, which sees one path and not the other. Two consumers, one constant, two different definitions of "function word" — invisible until something downstream counted. **18,536 of 50,347 entries (36.8%)** carried one of those words on an edge. Re-mining with the gates asking `assign_facet()` for the authoritative answer: **50,347 → 23,918 survivors, and zero function-word edges.** `config.FUNCTION_WORDS` was left untouched, so every dictionary build stays byte-identical.

The best failure was that the fix appeared to change nothing. The first corrected run produced 50,347 again — because `facets.py` uses bare imports and the natural package-qualified import raises, so the guard fell back to exactly the raw test it was meant to replace. A warning written defensively before it was needed printed and said so. Without it we would have shipped a bit-for-bit identical miner under a commit message claiming a 36.8% improvement. A fallback that degrades a result must say so at the moment it degrades it; a `try/except` that quietly substitutes a worse answer is a bug with a polite face.

The full write-up has the stage-by-stage counts, the before/after list heads, the near-miss where we almost edited the wrong constant, and the measured negative that hygiene does not improve compound detection.

---

# 2026.07.27 — What the Mocks Could Not See: A Green Suite, a Duplicated Parser, and a Test That Asserted the Bug

Two days ago we reported a 36/36 probe set that passed while the module it tested was hardcoded, and drew the rule: a test suite that cannot fail for the reason the design would fail is decoration. This is what happened when the same family of failure was walked into from three new directions. The compound-learning work was built in a sandbox with no lmdb, no 2.1GB dictionary, no index — every test used mocked `TokenChunk` objects. **26 checks, all green.** The mocks were faithful to the dataclass. The suite was still worthless in a specific way.

Pointed at the real encoder and dictionary — a `lmdb` wheel fetched and installed offline — it went to **47 checks, zero skips**, and three defects surfaced within minutes. Signal C checked `assign_facet()`'s *bucket* and passed anything bucketed TOPIC; against the real classifier `assign_facet("to")` returns `bucket=TOPIC, utility=FUNCTION`, the identical bucket to `car`, so function words sailed through a check written to exclude them. A docstring claimed the encoder computes word tier via `classify()`; it does not — it reads a prebuilt LMDB template, whose build-time tier returns **H** for `to`, `that`, `this`, `it` where a live `classify()` returns **F**. And compound confirmation shipped its own yes/no parser while the gateway had owned `_verdict()` for months; they had already diverged, so "spot on" was understood for one kind of question and silently not for another. Separately, **126 existing tests** covering the modified modules had never been run. They pass: 116 + 10.

The worst one was ours and it was subtle: the suite pinned `too late` as the *expected positive detection*. `too late` is a discourse formula — exactly the false-positive class the design was fighting. Written while looking at output and judging "it fired, the mechanism works", never asking whether it fired on the right thing. Anyone later tightening the detector would have seen that case go red and concluded they had broken something. The fix is a real compound as the positive case plus a **known-false-positive ledger**, where a failure is documented as *good news* — delete the entry, don't loosen the detector.

The full write-up has the before/after signal dumps, the tier table, the four broken things, and why mocking your collaborators rather than your inputs turns a test into a mirror.

---

# 2026.07.26 — Compounds Are Taught, Not Mined: Why "Car Wash" Was Never in the Dictionary

Ask Elo about a car wash across three sentences and it files the memories in three places. "I drove to the car wash" lands under `drive`; "the car wash was closed" under `closed`; "I hate that car wash" under `hate`. The thing the person is actually talking about is never the key, because the seed former ranks candidate concepts by emotional loading and `car` and `wash` are two ordinary adjacent words. The obvious fix is to make the dictionary know `car wash` is one unit — it was built by mining a 186-million-token corpus, so a common compound should be in there and the work should be a lookup.

It is not in there. We checked seven common compounds — `car wash`, `ice cream`, `high school`, `hot dog`, `front door`, `credit card`, `cell phone` — against both the 167,876-entry mined candidate list and the dictionary's templates sub-db. **Zero hits, all seven.** Scaling the corpus does not help, because what a conversational corpus is full of is discourse formulas and ASR fragments, not compounds. So the mechanism became teaching: an anchored grammar for *"'car wash' is one thing"*, a store the phrase scanner consults **before** the dictionary, and trust tiers that record how a piece of knowledge arrived (TAUGHT 0.9, CONFIRMED 0.8). Taught phrases persist as plain JSON, not into `dictionary.lmdb` — that is a build artifact the next build silently regenerates, and JSON means a person can open the file and correct what Elo believes it was taught. After teaching, `car wash` chunks as one atom and later mentions file under it, not under the sentence's loudest verb. 47/47 against the real encoder and dictionary.

Two things broke worth keeping. The concept fix was aimed at the wrong field first: the seed former treated `is_phrase` as "this is a relational connector", when it means "this matched any multi-word dictionary entry" — a much larger set. And we started coding before reading the subsystem's own spec, and were told so: *"the teaching/learning should become a formula. You need to refer to the documentation on formulas."* The repo's standing rule is to read the spec for every term before building on it, and it earns its place by being the rule most often skipped under momentum.

The full write-up has the mining measurements, the teaching grammar, the restart-persistence gate, and why a tracking document written for an already-refuted approach had to be superseded within hours.

---

# 2026.07.26 — The Answer Was Already Computed: Five Fixes That Consumed What the System Already Knew

Asked **"If the car wash is 100 feet away, should I drive my car there or walk?"**, the system answered: *"From what you have told me: 'free from dirt - means there is no dirt'."* Grounded, cited, and confidently irrelevant — and it happened **after** connecting the memory gateway to a browser whose local replies had been serviceable. More machinery, worse answers. The diagnosis made it interesting: at five separate layers, the information for the right answer was already computed — shipped in the dictionary, returned by a function, carried on a struct — and the consumer at each layer used something cruder. The dictionary's 16-bit cue mask went unread while replies branched on a trailing `?`. The per-surface CONTENT/FUNCTION verdict went unread while recall filtered with a 41-word stoplist. The ranker computed how many query surfaces each seed matched, carried the count onto the result, and sorted without it.

The user's own retest supplied a controlled experiment: the same question phrased twice, differing only by *"my car there"*. One phrasing recalled the dirt definition — it had won on `there` and `means`, two function words the stoplist missed and the dictionary correctly marks FUNCTION. The other phrasing recalled the right fact. Dropping one contentless word changed the answer entirely. After the fixes, both phrasings converge to identical surfaces, the distance fact (4 matches) rises past the definition seed (2 matches) from a tie, and the reply composes instead of quoting: *"You told me: 'You are 100 feet from the car wash.' Between drive and walk — nothing I have stored says how you weigh that. What matters to you here?"* Reply-shape probes: **3/10 → 10/10**.

Two of the breakages were our own. A one-line sort fix applied with a global replace edited the identical line in a second ranking function whose type lacks the field — six tests red inside a minute, caught by the suite, not by care. And the diagnostic built to read recall's rankings printed `score=?` for every candidate: it read `score`; the field is `verbal_score`. The instrument had to be debugged before the system could be — with the wrong conclusion already written up.

The full write-up has the ranking tables, the two-phrasing experiment, the five consumers in order, and why the inference to "drive" is deferred to the reasoner rather than faked.

---

# 2026.07.25 — Learning What "+" Means: Induction by Experiment, Not Symbol Lookup

We wanted Elo to learn arithmetic from a teacher in conversation — not to have arithmetic. Type "2 + 2 = 4" into the browser, and see whether the system ends up able to answer "what is 4 + 12?" with no language model in the loop. The first version looked like it worked: taught 2+2=4, it replied *"If 2+2=4, does 3+3=6?"* and could then compute new sums. It was a fake. The operation was **hardcoded** — a table mapped `'+'` to Python's `add`, so the system recognized a known symbol and applied a built-in evaluator. It never learned anything. As induction it is **REFUTED**, and the hollow center is the one it shares with a language model: an LLM has the rule baked into weights, ours had it baked into a lookup table, and neither induced it from the example in front of it.

The rebuild does the real thing. From one example, learning the rule is *impossible* — infinitely many functions map (2,2)→4 — so the learner holds every hypothesis in an explicit library that fits (add, multiply, square, power all give 4), captures the operator as an **opaque token**, and then asks the question that best *splits* the survivors: "does 2+3 = 5?", where add says 5, multiply 6, square 4, power 8. A "yes" prunes to addition; "no, it's 6" prunes to multiplication. Only when one hypothesis remains does it bind the symbol — and then it is operational, computing 4+12=16 and generating fresh examples. The proof it isn't the old trick: taught `3 @ 4 = 7`, it learned that **`@` means addition**. No table contains `@`.

The instructive failure is how we missed it. The first module passed a **36/36** probe set — every check green — while the thing it claimed to test was hardcoded. The probes measured that the plumbing worked and never asked the one question that mattered: did it *learn* the operation, or *recognize* it? A test suite that cannot fail for the reason the design would fail is decoration; the user caught it by reading the output, not the tests. A second probe found the next hole: asked for `2 + 3 + 5`, the binary-only parser silently returned **8**.

The full write-up has the hypothesis library, the discriminating search, the learning table (0 questions when one rule already fits, 1 when ambiguous, refusal when nothing fits), and why a legible inductive bias is a different foundation from an implicit one.

---

# 2026.07.25 — Curiosity Is Knowing Where You Stop: Derived Questions, and a Learner That Checks Its Teacher

Once Elo could learn what an operator means, it started asking questions — and they were fake. Taught `1 + 5 = 6`, it asked *"does 2+3+5 = 10?"*: numbers with no relationship to the lesson, because the probes were a hardcoded list. The objection from the person teaching it was exact: *"that doesn't feel like true curiosity, it feels like a programmed response."* Randomizing the numbers would have been cosmetic. The real defect was that the questions were a **checklist, not a derivation** — and the same missing representation produced a worse bug: asked to compute `2 + 3 + 5` after being taught a binary rule, it answered **8**, silently. Canned curiosity and confident overreach have one root: the learner had no map of its own competence.

So we wrote the foundations down — 17 priors across logic, quantity, structure and time, each recording the wall it prevents, with a hard rule that only concepts *presupposed by learning* qualify (anything teachable is knowledge, not a prior). The learner now tracks which regions its evidence actually covered — sign, magnitude, order, zero, arity — and derives what is untested. Questions are built from the numbers the user taught: `1+5=6` asks about 1 and 5; `20+30=50` asks about 20 and 30. Two probe types appeared that no hardcoded list had — negatives and large magnitudes — because the priors name those dimensions and the evidence had never touched them. The same scope card is the honesty guard: `2+3+5` is refused until chaining is confirmed, then answered.

Two results we didn't expect to land this cleanly. Elo now **checks its teacher**: every probe carries what it expects under its own rule, so when the user answered a true claim with "no", it said *"That surprises me — I work it out as 2+8+8 = 18, so I expected 'yes'. Am I wrong, or was that a slip?"* — and on "I slipped, good catch" kept its own reading. And **thinking across rules**, it reported that all three operations chain, that `+` and `*` give the same answer either way round but `-` does not, and that each has a number leaving the other unchanged. Nobody taught it identity elements or commutativity; it derived both by comparing its own scope cards.

The full write-up has the 17 priors, the gap derivation, the teacher-directed probe budget, and the failure where natural affirmations ("you are correct") were silently discarded — throwing away learning the user had just given.

---

# 2026.07.24 — Recall Was Not Conversation: A Deterministic Dialog-Act Layer (43/43)

Two weeks ago the browser closed the memory loop — on send, it resolved the message against the live substrate and answered from what the user had actually said. That post's own example was the tell that we weren't done: *"whats your name?" → "On name — reads neutral. ↳ from memory: 'Your name is Elo.'"* It recalled correctly and then said something no one would call a conversation. It led with a diagnostic, appended the memory as a footnote, and had no notion of the *kind* of turn it was answering. A pile of stored seeds is not a conversation any more than a dictionary is a sentence.

The concrete failure that opened the work: with both "my name is Paul" and "your name is Elo" stored, **"what is your name?" returned "Your name is Paul."** — the recall matched on the attribute (`name`) and ignored *whose*. The fix makes the question carry its possessive and the answerer require both to agree — same attribute **and** same subject — before it answers, flipping voice on the way out. "what is **your** name?" no longer matches "**my** name is Paul"; it resolves to Elo and answers "My name is Elo." On top of that sits a deterministic dialog-act cascade: thirteen acts — greet, introduce, be-named, identity, state, opinion, location, origin, values, accept-a-chat, thanks, farewell, acknowledge — classified above recall, first match wins, with fact questions and bare statements deliberately falling through so memory still owns them. No model touches any of it.

The best failure was a green light that meant nothing — again. After the possessive fix, a live test *still* returned "Your name is Paul." The code was correct; run directly it rejected the mismatched subject. The gateway was running old code: the edit was committed but the process hadn't been restarted, and two stale `.pyc` builds sat ready to reload. The fix was operational, not source — kill the bound process, clear the cache, relaunch. A test whose red is unrelated to the source under test wastes exactly as much time as a false green. The probe set caught its own gap, too: "can we chat?" was tagged accept_meta but classified as nothing, one missing clause; it went 42/43 → 43/43.

The full write-up has the thirteen acts, the possessive matcher, the reply-cleanup that stopped stating affect, the must-fall-through negatives, and why this is the floor the coming curiosity phase stands on.

---

# 2026.07.24 — A Constitution, Not a Memory: Authoring the Self a Verbalizer Speaks From

Once Elo could take a conversational turn, it needed a self to take it *from*. "Who are you?", "where do you run?", "what do you value?" aren't recall queries — there's no seed in episodic memory that answers them, and there shouldn't be. A first pass hardcoded a persona dict inside the response composer. It answered the small-talk, and it was wrong in two ways that only get more expensive with time. It was in the wrong repository — `response.py` is shared infrastructure that twelve projects depend on, and Elo-specific identity has no business inside a generic compression library. And self-facts can't go in episodic memory yet, which isn't a temporary inconvenience but deixis: a user asks "what is **your** name?" while Elo's own assertion is "**my** name is Elo," and under surface-possessive matching those don't match. A self-fact filed into memory would be unreachable by the very question it answers.

So we separated the two kinds of memory. `elo_core.json` at the repo root is Elo's constitution — name, location, influence, moral stance, guidance — authored, slow, curated, read *directly* by the persona and never through recall. Episodic memory (`memory.lmdb`) stays what-you-told-it: learned, fast, accumulating. The verbalizer was already substrate-free by its own docstring ("callers supply the memory context"), so the correct move was to make identity caller-supplied too: `dialog_reply(query, self_model=…)`, with the gateway loading the constitution and passing it in, and the in-module dict demoted to a standalone fallback. Moral stance ships descriptive — text the persona speaks — not enforced; enforcement waits on the faculties that would gate it.

The instructive break: we shipped the self into shared infrastructure and had to pull it back out. It worked in the demo, which is exactly why it was easy to leave in the wrong place — the lesson the repo keeps re-teaching. A smaller one: TOML lost to a Python-version landmine. The natural format for a hand-edited, commented constitution is TOML, but `tomllib` is 3.11-only and the gateway had both 3.10 and 3.11 bytecode present, so the file would load or not depending on which interpreter ran. JSON loads on every Python with no dependency; a config format you can't guarantee will parse isn't one.

The full write-up has the five fields, the loader projection, the two-store table, and why this clean seam lets the coming preschool phase pour episodic seeds in without ever disturbing the self they attach to.

---

# 2026.07.11 — The Browser Recalls, It Does Not Opine: Closing the Memory Loop Over MCP

The whole ELO thesis is that a device can do semantic work without a language model at inference time. We had the pieces — a dictionary that carries meaning, a memory substrate that stores and recalls, a deterministic response composer, an MCP gateway fronting all of it — and had never connected the last six inches: a running browser talking to the live memory gateway and answering from what the user actually said. The client code existed and was dead. `eloAi` appeared in exactly one file; the console called none of it. "It hasn't worked" was literally true — it had never been called.

This session we wired it. On send, the console runs its local deterministic read and, in the same breath, resolves the message against the live substrate over MCP, then weaves the recalled memory into the reply itself rather than a side panel; `remember` writes the turn back so a later message recalls it. Live, with the gateway up: "whats your name?" → "On name — reads neutral. ↳ from memory: 'Your name is Elo.'" The answer is retrieval, not generation. It recalls what it was told and quotes the seed.

The best failure was a green light that meant nothing. The first gateway probe passed 9/9 and we nearly reported the loop closed — but two runs shared the same default seed text, so recall could return an *earlier* run's seed and the substring check "passed." A unique per-run marker fixed it: only a marker match is a round trip. A test whose green is unrelated to its claim is exactly the drift the fingerprint discipline exists to refuse — and we walked into it hours after writing that rule down. We also predicted the wrong break: the open-mode scope hole was supposed to lose the write, but an isolation probe showed entity genuinely filters and the scope-less calls simply share a server default. REFUTED, by measurement.

And the honest boundary: the browser sends plain text, not dictionary IDs — mneme re-encodes it with its own space, so two semantic systems are bridged by a string, not yet one ID space. The full write-up has the probe tables, the charge-first recall we re-ranked in the browser, the four things that broke, and why "recalls, doesn't opine" is the honest shape of intelligence without a model.

---

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

# 2026.07.09 — A Car Next to "Credentials": EPA Measures Feeling, Not Meaning

We wanted cheap semantic similarity for the dictionary and reached for EPA — Osgood's Evaluation/Potency/Activity, three interpretable numbers per word — partly on an inherited claim in our own notes that those factors "explain 70–90% of semantic variance." If true, three floats would be a startling bargain. So we measured it, the simplest way: build the EPA substrate (67,936 words from Warriner ∪ NRC-VAD) and do exact nearest-neighbour search. If EPA is meaning, a word's neighbours are its synonyms.

They aren't. `car`'s nearest neighbours are `credentials` (0.066), `attention` (0.079), `decoration` (0.081). The retrieval is perfect — a car, credentials, and a decoration genuinely sit together because they *feel* about the same: similarly evaluated, potent, active. EPA can't tell them apart because denotation was never in the representation. The space is affect-shaped, too: `happy` has **zero** neighbours within a tight radius while `big` has **1,939** — it only "works" for the sparse extremes, and even there it's measuring feeling, not reference. And the axes aren't equal: cross-source agreement runs **E = 0.814, A = 0.613, P = 0.328**, so Potency is barely a third of a correlation — anything imputing agency from it is building on sand.

So the "70–90% of variance" line was an overclaim, and it's **REFUTED** — the kind of confident inherited generalization our validation loop exists to catch. The fix wasn't to repair EPA but to stop asking it to be meaning: we added a 768-d `all-mpnet-base-v2` index for denotation (`car → truck, vehicle, automobile`) and kept EPA for its real job — affective dynamics under Affect Control Theory, never synonymy. Two axes, two channels, and the discipline to never impute from Potency. The full write-up has the numbers, the Osgood/Heise grounding, and why this measurement bought the two-channel architecture the coupled family shipped the next day.

---

# 2026.08.01 — A Deterministic Voice, and the Bandage It Surfaced

Our system could perceive, remember, recall, and track a conversation — and still could not say what it knows. Its local reply floor was an affect note, "On dungeon — reads neutral," emitted while holding a taught paragraph about Dungeon Masters in its store. This week we packaged the missing leg: three deterministic, no-LLM ops — label, summarize, verbalize — that let it compose language from what it holds, cited, offline. Packaging them surfaced a bug that had been silently live.

The ops are a lookup over structure, not a generation from weights. verbalize reads the *shape* of a question from the dictionary's cue mask (never from a "?"), composes a reply in that shape, cites the seeds, and marks stance — a thing you were told is said in told voice; an inference is said in inferred voice, cited to the reasoning step. **No template manufactures a reasoning step from a told fact** — that is the reasoner's job, licensed and cited, or it is not said. Thirty-four tests, including the two that matter: label beats the old topic labeller by dropping the function words it kept; verbalize beats the quoting fallback, naming both options of a choice instead of quoting a fact at a question it does not answer. Thirty-one conformance cases pin every output so the browser port proves rather than reinvents.

Then the bandage. A parallel session had wired a dialog layer ahead of fact-recall, and its final act — "Got it, noted." — fired for *every* "X is Y" statement. Because it ran first, it **shadowed contradiction detection entirely**: "the system is broken" after "the system is stable" returned "Got it, noted" instead of "that conflicts with an earlier statement." Six reaction tests failed the moment the full path was exercised; the behaviour had been silently dead. The acknowledge was added for a real reason, and over-reached.

The fix is one line — let it fall through to the reaction path. The lesson is sharper: **a bandage that returns something plausible is worse than a gap**, because it hides the wound, and only a test that ran the whole path found it. The full write-up has the op contract, the two "beat" probes, and why composing a reply is a lookup, not a generation.

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