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
4. **Extract candidates** per tracked term: copular patterns first (`Term is/are [a/an/the] ...`), verbal second (`Term provides/handles/lets ...`), meaning length-bounded 10–160 chars.
5. **Reject non-definitional leads**: a meaning starting with `now / typically / exactly / also / not / used / deprecated / renamed / ...` is migration-note or usage debris, not a definition (§5c). Require ≥3 content words.
6. **Rank**: a candidate from the file *named for the term* (`components.rst` defines Component) beats any other file; then copular beats verbal; then earliest wins (§5d).
7. **Emit** the draft layer with per-meaning provenance and `status: draft-derived`.

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

## 6. What we deferred and why

- **Absence detection.** A term whose only surviving mentions are non-definitional should resolve to *removed-in-this-version*, not to its best debris sentence. Sketch: require a copular candidate for "resolved"; below that, report unresolved and let the diff's removed/added buckets speak. Deferred to the next round — it changes the resolved/unresolved contract.
- **Precision measurement.** The lead-word filter and copular patterns are heuristics tuned on one corpus. The honest next step is a hand-labeled sample (say 50 definitional / 50 non-definitional sentences from the book) and a measured precision/recall, not more tuning by anecdote.
- **A second corpus.** One framework proves the loop runs; two prove it generalizes. Candidates: Vue 2→3 (migration-heavy, good docs) or Rails guides across majors.
- **Term lists per version.** The template supplies one term set for both versions; Shell/Command really want version-specific tracking (Shell in 2.x, Command in 5.x), which the template model doesn't express yet.
- **Glossary weighting and RENAME synthesis** carry over from the previous paper's deferrals, unstarted.

## 7. Result and consequence

**VALIDATED:** the derivation loop end to end on a real corpus — clone → derive (with provenance) → diff → scored advisory, deterministic throughout, 103 lane tests green. Behavior's ORM drift was found and graded (SIGNIFICANT, EPA 0.8636, agency SYSTEM→OTHER) from sentences no human selected.

**REFUTED:** the authored Component example. The real 2.x and 5.x books define Component identically; the ARCHITECTURAL advisory in yesterday's paper describes a migration story the documentation does not tell. The prior paper's UNVERIFIED tag on the authored layers is hereby resolved — against us, which is what the tag was for.

**UNVERIFIED:** both Shell meanings (near-miss extraction, no absence handling), and severity calibration generally — still one framework, now with one confirmed drift instead of a staged one.

What this forces for the next round of tests, in order: absence detection (turn Shell from wrong-answer into honest-absence), a measured precision/recall for the definitional filter against a hand-labeled sample, and a second framework corpus to test generality. After those, the loop is credible enough to feed derived layers into the `semantic_diff` MCP tool as a standard step of `lsdf init` — version drift computed from the target framework's own documentation at setup time, with every meaning carrying the line of documentation it stood on.

The larger lesson costs one sentence: **the mechanism was never the risk — the meanings were.** Every engine downstream of a meaning string (severity, EPA, facets) amplified whatever the extractor handed it, garbage and gold alike. The corpus work is where the truth enters the system, and it took a refuted example of our own making to measure that properly.
