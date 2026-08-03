# 2026.08.03 — Derived From the Real Docs: Component Didn't Drift, Behavior Did

## 1. Problem / context

Yesterday's paper shipped the versioned-dictionary mechanism with two hand-authored CakePHP layers and a plain tag on them: **UNVERIFIED — nobody has checked the authored vocabulary against CakePHP source.** The layers dramatized the integration plan's illustration: Component (2.0: controller-attached logic block) becomes a DI-container service in 5.x, severity ARCHITECTURAL. The paper's closing line promised the test: derive the layers from a real corpus and let the same engine grade a dictionary we did not write.

This paper is that test. We pointed the derivation tool at the actual CakePHP book — both version branches — and compared what came back against what we had written. The headline: **the corpus overruled the seed.** The real 2.x and 5.x books define Component identically; our ARCHITECTURAL example does not survive contact with the documentation. A different classifier — Behavior — carries the genuine drift, and the engine found it unaided.

It took three rounds to get there, because the first two derivations produced garbage, each failure diagnosable and each fix deterministic. The failures are §5; they are the reason the result in §4 can be trusted.

## 2. Background

The pieces in play, all from the prior session records: `eloai_lsdf/corpus_ingest.py` derives a versioned layer from a documentation tree — definitional-sentence extraction against a term list, classifier skeletons (category/extends/label) copied from a template layer, `meaning` from the best candidate sentence, file+line provenance per meaning, `status: draft-derived`. `eloai_lsdf/version_diff.py` compares two layers: content-word delta, three-rule severity ladder, migration advisories. Both arbiters are canonical as of yesterday's correction: EPA from the built dictionary's affect asset via the verbalizer substrate (`semantic_add`), facets via `lookup_id -> lookup_vfacet_named`. No model call anywhere.

The corpus: `github.com/cakephp/docs`, branches `2.x` and `5.x`, cloned shallow into `Resources/CakePHP/` (third-party clones, git-ignored). English book only (`docs/en`).

## 3. Approach

The derivation pipeline, in its final (v2) form:

1. **Walk** the docs tree for `.md/.txt/.html/.rst`; refuse to proceed on a missing or file-free tree (a hard-won guard — §5a).
2. **Assemble paragraphs** before sentence-splitting: consecutive non-blank lines join into one text run; heading underlines, tables, and rst directives drop (§5b).
3. **Clean** rst/markdown inline markup (双backtick spans, `role <target>` references, emphasis markers).
4. **Extract candidates** per tracked term: copular patterns first (`Term is/are [a/an/the] ...`), verbal second (`Term provides/handles/lets ...`), meaning length-bounded 10–160 chars. **Subject-anchored** (added round four): the sentence must open with the term, so a sentence that merely contains the word is rejected — "A special *method* called whenever ... a shell" is copular, on-topic, and not a definition of Shell.
5. **Reject non-definitional leads**: a meaning starting with `now / typically / exactly / also / not / used / deprecated / renamed / ...` is migration-note or usage debris, not a definition (§5c). Require ≥3 content words.
6. **Rank**: a candidate from the file *named for the term* (`components.rst` defines Component) beats any other file; then copular beats verbal; then earliest wins (§5d).
7. **Resolve or omit** (added round four): only a copular candidate resolves a term; anything less means the corpus does not define the concept in this version, and the classifier is left out of the layer entirely.
8. **Emit** the draft layer with per-meaning provenance and `status: draft-derived`.

Term selection itself has two modes. The default inherits the tracked terms from the template layer's labels — which can only ask about concepts an older version already named. `--discover` (added round five) additionally harvests construct names from the corpus's own headings, `class` / `php:class::` declarations and filenames, filtered by a noun-shape test (≤3 words, plausible head, prose and generic-programming stoplists, framework's own name excluded) and a minimum file count that drops one-offs.

Then: derive one layer per version branch with the same template, and run the unchanged `semantic_diff` over the two drafts with `--epa --facets`.

## 4. Data and examples

Scan scale (per version):

| branch | files | sentences | candidates | resolved |
|---|---|---|---|---|
| 2.x | 145 | 14,391 | 43 | 4/4 terms |
| 5.x | 139 | 17,237 | 32 | 4/4 terms |

The derived meanings, verbatim:

| term | 2.x derived | 5.x derived |
|---|---|---|
| Component | packages of logic that are shared between controllers | packages of logic that are shared between controllers |
| Helper | component-like classes for the presentation layer of your application | component-like classes for the presentation layer of your application |
| Behavior | way to organize some of the functionality defined in CakePHP models | way to organize and enable horizontal re-use of Model layer logic |
| Shell | special method called whenever there are no other commands or arguments given to a shell | making it run as a cronjob to clean up the database once in a while or send newsletters |

**Component and Helper: unchanged.** The book's definitions are word-identical across a three-major-version gap. Our authored 5.4 layer's "service class resolved via dependency injection container" is not what the documentation says a Component is — CakePHP 5 still defines Components as controller logic packages. The authored ARCHITECTURAL advisory was a dramatization.

**Behavior: the genuine drift, found blind.** Both derived meanings are real definitions with provenance into the book, and the delta is the ORM rewrite extracted from raw documentation:

```
! CakePHP Behavior (cakephp_2.x_derived -> cakephp_5.x_derived)
  2.x meaning: way to organize some of the functionality defined in CakePHP models
  5.x meaning: way to organize and enable horizontal re-use of Model layer logic
  shared:   way, organize
  changed:  functionality, defined, cakephp, models -> enable, horizontal, re-use, model, layer, logic
  epa:      0.8636 shift
  facets:   agency SYSTEM -> OTHER; direction NEUTRAL -> STABLE
  severity: SIGNIFICANT - meaning moved; review call sites
```

Nobody wrote either side of that comparison. The 2.x model-centric phrasing giving way to "Model layer" and "horizontal re-use" is the 3.0 ORM transition, surfacing through two automatically-chosen sentences.

**Shell: weak on both ends, and honestly so.** The 2.x meaning describes the `main()` method, not the Shell itself — a near-miss copular match. The 5.x meaning is usage debris, and the deeper problem is that the *correct* 5.x answer is absence: Shells were replaced by Commands, and the concept survives in the book only residually. The extractor found *a* sentence because it was asked to; it should have been able to answer "this concept no longer has a definition here."

## 5. What broke

**(a) The silent zero.** The first run read **0 files** and wrote two empty drafts — and the diff then reported "No semantic changes," which is technically true of two empty layers and completely vacuous. Cause: the repo had been restructured upstream (the book moved from `en/` at the root into `docs/en`, with 5.x now building via VitePress), and the ingester treated a nonexistent directory as an empty-but-valid scan. Two fixes: a missing docs dir now raises, and a zero-file scan aborts before writing. A pipeline that can say "no changes" must not be able to reach that verdict from no data.

**(b) Line-based sentence splitting.** The second run derived fragments: *"exactly the same as building it within a regular"*, *"not central to what View does, and was"*, *"making it run as a cronjob to"*. The book wraps sentences at ~80 columns; splitting per line made every "sentence" a wrap-fragment. Fix: paragraph assembly before sentence-splitting. This was the dominant garbage source.

**(c) The copular trap.** `Component is now the required base class for all components` — a 2.0 migration note — matched the definitional pattern, as did usage statements. "X is/are ..." is necessary but nowhere near sufficient for "this sentence says what X *is*." Fix: reject meanings whose lead word marks migration prose or usage (`now`, `typically`, `called`, `deprecated`, ...). A word-list heuristic, and §6 records what it doesn't catch.

**(d) Earliest-wins archaeology.** With the whole book walked alphabetically, appendices and migration pages precede chapters, so debris like *"now on `Helper`"* out-ranked the chapter definition. Fix: filename affinity — `components.rst` outranks `appendix-*.rst` for Component. The book's own file naming is a free relevance signal.

**(e) What the failures did to the arbiters.** Worth stating: on the garbage rounds, the EPA and facet arbiters happily scored the fragments (Shell "drift" 1.4168 on round two). **The arbiters grade whatever meanings they are handed; they cannot rescue bad extraction.** Quality lives or dies at the meaning-derivation step.

**(f) Two more defects, only visible at corpus scale (rounds four and five).** After the paper above was drafted we implemented the deferred items — absence detection, subject anchoring, term discovery — and re-ran. Two failures appeared that the 10-file fixture could never have shown:

*The decapitated meanings.* The corpus derived `Method: "ccessible in all view, element and layout files"`, `Validation: "n important part of any application"`, `Name: "lways treated as case-insensitive"`. The optional post-copula article group had no word boundary, so in "is **a**ccessible" the regex matched article=`a`, meaning=`ccessible`. One missing `\b`, four mangled classifiers, and every downstream number (EPA, facets, severity) computed confidently on a truncated string.

*Generic English became framework vocabulary.* Term discovery harvested `Name`, `That`, `Class`, `Method`, `File`, `Type`, `Object`, `Data`, `Field`, `Variable`, `Output` from headings — real nouns, not CakePHP constructs. Once a term is generic, every incidental sentence looks definitional: `Class` resolved to "subclass of BadRequestException" (a sentence about one specific exception class), `Controller` to "easier to test and reuse" (a sentence from the testing chapter). The fix was a generic-programming stoplist plus rejecting the framework's own name (`CakePHP: "fast and easy to install"` — marketing copy, not a construct).

## 6. What we deferred and why

- **Absence detection.** ~~Deferred~~ — **done** same session. Only a *copular* candidate can resolve a term (a verbal mention proves the word occurs, not that the corpus still defines the concept), progressive-aspect meanings are rejected as actions, and an unresolved term is now **omitted from the layer** rather than emitted as a meaning-less skeleton. Omission is what lets the diff report honest removal instead of comparing label-vs-label as a false "unchanged".
- **Term lists per version.** ~~Deferred~~ — **done** same session. `discover_terms()` harvests construct names from the corpus's own headings, class declarations and filenames, so a version contributes vocabulary the template never named. This is what surfaced Middleware, Entity, Association, Mailer, Command, Datasource and CookieComponent — and it turned Shell/Command into a real removed/added pair.
- **The evidence rule** (`layer_policy.py`), written after the Component refutation: an authored layer is a hypothesis, a derived layer with provenance is evidence, evidence wins. A three-rung status ladder (`fixture` -> `draft-derived` -> `reviewed`), a validator that requires per-meaning provenance and rejects empty meanings, and `promote()` as the only sanctioned path to canonical. The two authored CakePHP layers are now labelled `fixture` in the files themselves, with the refutation dated inline.
- **Precision measurement — now the blocking item, not one deferral among several.** See §7.
- **A second corpus.** One framework proves the loop runs; two prove it generalizes. Candidates: Vue 2→3 (migration-heavy, good docs) or Rails guides across majors. Blocked behind measurement: adding a corpus before we can score one is more anecdote.
- **Glossary weighting and RENAME synthesis** carry over from the previous paper's deferrals, unstarted.

## 7. Result and consequence

**VALIDATED:** the derivation loop end to end on a real corpus — clone → derive (with provenance) → diff → scored advisory, deterministic throughout, 103 lane tests green. Behavior's ORM drift was found and graded (SIGNIFICANT, EPA 0.8636, agency SYSTEM→OTHER) from sentences no human selected.

**REFUTED:** the authored Component example. The real 2.x and 5.x books define Component identically; the ARCHITECTURAL advisory in yesterday's paper describes a migration story the documentation does not tell. The prior paper's UNVERIFIED tag on the authored layers is hereby resolved — against us, which is what the tag was for.

**VALIDATED, and a correction: the arbiter numbers are coverage-dependent, and we had been quoting them blind.** Asked whether the L-SDF work needed new dictionary vocabulary, we built a coverage instrument (`arbiter_coverage`) that reports what fraction of a meaning's content words the built dictionary can actually rate, and names the misses. First measurement on the derived CakePHP layers: **71.4% EPA coverage** — nearly a third of every meaning was invisible to the affect arbiter. Categorising the 49 misses:

| category | n | examples |
|---|---|---|
| morphological variants of known words | 30 | controllers, entities, methods, models, views, generating, provides, reused |
| genuinely absent software vocabulary | 11 | middleware, http, cli, php, psr-7, foreach |
| hyphenated artifacts of our own extractor | 4 | component-like, mini-view, re-use, well-defined |
| function words our stoplist leaked | 3 | any, even, has |

**61% of the gap was morphology, not missing vocabulary** — we were asking for `controllers` while the dictionary holds `controller`. The affect asset is keyed by surface and our lookup did no lemmatisation, the same gap the memory-recall path had already fixed. Adding lemma fallback (plural, -ing, -ed, hyphenated-compound head) plus closing the stoplist leak took coverage to **92.6% EPA / 96.3% facets, with no dictionary build touched**.

The correction: the shift values change when coverage does.

| classifier | EPA @ 71.4% | EPA @ 92.6% | change |
|---|---|---|---|
| Behavior | 0.8636 | 0.9841 | +14% |
| Controller | 1.9301 | 2.0311 | +5% |
| Validation | 0.7609 | 0.5224 | **-31%** |

Every EPA figure in this paper and its predecessor was computed without knowing its coverage; Validation's moved by a third. The severity ordering survived, but it survived by luck rather than method. **Any affect number quoted without its coverage is an unqualified number** — coverage now travels with the measurement.

What remains genuinely absent is a 12-word tail: `middleware`, `http`, `cli`, `php`, `psr-7`, `foreach`, `urls`, plus API identifiers (`consoleio`, `setcookie`, `withheader`, `assetmiddleware`) and the framework's own name. Several of those arguably should not carry affect ratings at all. The real words are a measured thinness in the affect asset's software vocabulary — **evidence to hand the dictionary session, not a change this lane makes**. Classifier ids remain out of the general dictionary entirely, per the settled band spec.

**VALIDATED:** term discovery contributes real vocabulary. Harvesting the corpus's own headings surfaced Middleware ("part of the new HTTP stack in CakePHP that leverages the PSR-7 request and response interfaces"), Entity, Association, Mailer, Plugin, Element, Datasource and CookieComponent — none of which the template named. The removed/added buckets now read as an accurate architectural history: CakeRequest, CakeResponse, CakeEmail, AppController, Datasource, CookieComponent, Model out; Application, Middleware, Command, Mailer, Association, Asset, Event, Plugin in.

**UNVERIFIED, and this is now the blocking item: we do not know the extractor's precision or recall.** Five rounds of tuning went: look at bad output, invent a rule, judge the new output by eye, move on. That is tuning by anecdote, and it has a measured cost we can point at — subject anchoring removed the Shell debris from 5.x but simultaneously **lost the true Shell definition in 2.x**, where the concept genuinely is defined, and lost Entity from 5.x. Precision was traded for recall with no instrument on either side. Current state per version is roughly 20 terms resolved against 20 unresolved, and of those 20 resolutions perhaps 12–14 look like genuine definitions of genuine constructs — "look like" being exactly the problem.

Two failures still standing illustrate it. `Controller` resolves from the testing chapter ("automatically used as the testing controller to test") because `controllers.rst` apparently contains no sentence our patterns match — a *recall* failure presenting as a bad pick, invisible without a labelled set. And several borderline terms (`Path`, `Structure`, `Header`, `Rule`, `Asset`) sit on the generic/framework boundary where my stoplist is one person's judgment on one corpus.

**So the next build is an instrument, not another heuristic:** sample ~100 term-bearing sentences from the corpus, stratified across accepted and rejected; hand-label each as definition or not; score precision, recall and F1; then run per-rule ablations — what does subject anchoring actually buy and cost, what does the copular-only absence rule cost in recall, does the lead-word filter earn its keep. Only after that do we tune against the number, and only after that do derived layers become promotable — it would be wrong to `promote()` a layer to canonical while its accuracy is unmeasured.

The larger lesson costs one sentence: **the mechanism was never the risk — the meanings were.** Every engine downstream of a meaning string (severity, EPA, facets) amplified whatever the extractor handed it, garbage and gold alike. The corpus work is where truth enters the system; five rounds in, we have made the meanings visibly better and still cannot say by how much.
