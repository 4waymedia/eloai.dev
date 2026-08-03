# 2026.08.02 — Versioned Dictionaries: Scoring CakePHP 2.0 -> 5.4 Meaning Drift Without a Model

## 1. Problem / context

A framework keeps its vocabulary while changing its architecture. CakePHP 2.0 and CakePHP 5.4 both have a thing called a *Component* — but in 2.0 it is a reusable logic block attached to a controller, and in 5.x it is a service class resolved through a dependency-injection container. Same word, different machine. A developer migrating between the versions — or an AI agent reading a 2.0 codebase with 5.x assumptions — will produce confidently wrong code, because the name gives no signal that the meaning underneath it moved.

Migration guides describe this drift in prose, unevenly, per framework, when they exist at all. Nothing *measures* it. The question for this build: can meaning drift between two framework versions be computed deterministically — no model call — and emitted as a migration advisory with severity attached?

This is Step 10 of the EloAI × L-SDF integration plan, the last of its ten build steps. Steps 1–9 (code ontology, entity schema, SQLite persistence, Python and Swift parsers extending the vendored `lsdf-core` generator, project writer, 12-tool MCP server, init wizard, POC gate) are covered by their own session records; this paper covers the versioned-dictionary mechanism and what it took to make the CakePHP comparison run.

## 2. Background

The substrate is the `eloai_lsdf` base ontology: 62 classifiers (entity/function/relationship/layer/access/type categories), locked at 0.1.0, `elo:` prefix validator-enforced. Language and framework layers compose additively over it — `BaseDictionary.load(overlays=[...])` merges a layer's classifiers on top of base, and **a collision on any existing id is an error, never an override**. The Swift layer (Step 9) was the first consumer of that composition rule: base + swift + swiftui = 62 + 8 + 6 classifiers, base untouched.

Every classifier entry is JSON with known fields (`category`, `extends`, `label`, `sigil`, `inverse`, `l_sdf`) plus an open `extra` dict that preserves anything else. That open dict is what makes versioned layers possible without touching the locked loader: a versioned entry carries two extra fields, `meaning` (a one-line English statement of what the construct *is* in that version) and optionally `migration` (ordered steps).

The English-ELO side of the plan — "English ELO reads doc_statements of each version" — refers to the EPA (Evaluation/Potency/Activation) affect norms carried by the main semantic-compression dictionary. That dictionary is heavyweight and host-bound; the design constraint here was that the diff engine must not depend on it.

## 3. Approach

**Two versioned layers.** `dictionaries/php/cakephp_2.0.dictionary.json` and `cakephp_5.4.dictionary.json`, four classifiers each, same ids where the concept persists:

| id | 2.0 meaning | 5.4 meaning |
|---|---|---|
| `elo:cakephp_component` | reusable logic block attached to a controller | service class resolved via dependency injection container |
| `elo:cakephp_helper` | presentation helper for view templates | presentation helper for view templates |
| `elo:cakephp_behavior` | shared model logic mixed into model classes | shared table logic attached to table classes |
| `elo:cakephp_shell` | command line task class run via cake console | *(absent)* |
| `elo:cakephp_command` | *(absent)* | command line task class run via cake console |

The 5.4 entries for Component and Command carry `migration` step lists (4 and 2 steps).

**The composition rule works in reverse.** These two files can never be loaded into one stack: they define the same ids, and the overlay loader's collision guard would reject the merge — correctly. Versioned layers are *alternative worlds*, and the machinery that makes normal layers safe (no id reassignment, ever) is exactly the machinery that forces versions to be compared rather than composed. We did not design around the collision guard; the collision guard *is* the design.

**The diff engine** (`eloai_lsdf/version_diff.py`). `semantic_diff(old, new, epa_fn=None)` reads both layer files raw (not through the stack loader) and walks the union of ids into four buckets:

- id in both, identical meaning → `unchanged`
- id in both, different meaning → `changed`, with the delta computed
- id only in old → `removed`
- id only in new → `added`

For a changed id, both meaning strings are reduced to content words (lowercase, 14-word stoplist, order-preserving, deduplicated) and set-compared into `shared` / `removed` / `added`. Severity is a three-rule ladder: **no shared words → ARCHITECTURAL** (nothing of the old meaning survives); **removed+added > shared → SIGNIFICANT** (the meaning moved, a core survives); otherwise **MINOR** (wording drift). The new version's `migration` list rides along on the delta.

**The EPA arbiter is injectable, not imported.** `epa_fn(word) -> (E, P, A) | None` is a constructor-level hook. When supplied, the engine computes each meaning's EPA centroid over its content words and reports the Euclidean shift between the two centroids. When absent, the `epa_shift` field is `None` and no EPA row appears in the advisory — the row is absent, not fabricated. The heavy English-ELO dictionary therefore never becomes an import dependency of the diff engine; on a host with the semantic-compression verbalizer substrate available, its Warriner-norm lookup slots straight into `epa_fn`.

**Output.** `format_advisory(delta)` renders the plan's advisory shape: old/new meanings, the word-level delta, severity with a one-line consequence, the numbered migration path, then removed/added ids. Exposed three ways: the `semantic_diff` MCP tool (the server's 12th tool — distinct from `diff`, which compares *scanned entities* by version tag), a CLI (`python -m eloai_lsdf.version_diff php/cakephp_2.0 php/cakephp_5.4`), and the Python API.

## 4. Data and examples

The Component advisory, verbatim engine output:

```
! CakePHP Component (cakephp_2.0 -> cakephp_5.4)

  cakephp_2.0 meaning: reusable logic block attached to a controller
  cakephp_5.4 meaning: service class resolved via dependency injection container

  Semantic delta:
    shared:   (none)
    changed:  reusable, logic, block, attached, controller -> service, resolved, dependency, injection, container
    severity: ARCHITECTURAL - requires structural change, not just rename

  Migration path:
    1. Extract logic from Component class
    2. Create Service class
    3. Register in DI container
    4. Inject via constructor instead of $this->ComponentName
```

Zero shared content words out of five on each side: the 2.0 meaning contributes nothing to the 5.4 meaning. That is the signature of an architectural break, and the severity rule finds it without knowing anything about PHP.

The full comparison:

| id | bucket | shared | removed → added | severity |
|---|---|---|---|---|
| `elo:cakephp_component` | changed | 0 | 5 → 5 | ARCHITECTURAL |
| `elo:cakephp_behavior` | changed | 2 (shared, logic) | 2 (model, mixed) → 2 (table, attached) | SIGNIFICANT |
| `elo:cakephp_helper` | unchanged | — | — | — |
| `elo:cakephp_shell` | removed | — | — | — |
| `elo:cakephp_command` | added | — | — | — |

Shell/Command is the rename story told honestly by two buckets: the removed id and the added id have byte-identical meanings ("command line task class run via cake console"), and the added side carries the 2-step rename migration. A future enhancement can join removed/added pairs on meaning similarity and emit them as a single RENAME advisory; today they are two lines.

The EPA hook, exercised with a toy scorer in tests (`controller` scored negative-potent, `dependency` positive): Component's `epa_shift` comes back positive and nonzero with the scorer, and `None` without it. **The shift value under a toy table proves the plumbing, not the semantics** — see §7.

Verification: 8 tests in `test_version_diff.py` (buckets, severities, advisory shape, EPA injection, MCP dispatch), full `eloai_lsdf` lane at **97 tests green** after this step.

## 5. What broke

**Our own severity expectation was wrong, and the engine corrected us.** The Behavior test was written expecting MINOR — "shared model logic mixed into models" vs "shared table logic attached to tables" *feels* like wording drift. The engine returned SIGNIFICANT: 4 changed words against 2 shared. Reading the actual CakePHP history, the engine is right — the 2.x Model-with-Behaviors world became the ORM Table world in 3.0; that is a real semantic move, not a rewording. We changed the test, not the rule. A severity model you can out-vote with intuition is not measuring anything.

**The `re.MULTILINE` class of bug appeared again in the same session.** Step 9's Swift symbol collector ran `finditer` with `^`-anchored patterns and no MULTILINE flag — it silently matched only at byte 0, producing an empty symbol table and zero call edges, caught only because a test asserted a specific cross-file edge. The version-diff engine avoids regex-over-file-shaped-text entirely (it reads structured JSON), which is partly a lesson from that morning.

**Earlier in the lane's history, a timed-out search nearly caused a breaking spec.** A sibling session, unable to find `eloai_lsdf` because its search timed out, concluded the `elo:` id syntax could not work (the tokenizer splits `elo:function` into three tokens) and spec'd a renamed 256-slot surface band — which would have violated the locked ontology's validator on all 62 classifiers. It was caught in review. The rule that fell out: classifier ids and compressed surfaces are different id systems; a tokenizer constraint on one says nothing about the other. The versioned-dictionary work inherits that rule — nothing here touches surface pricing.

## 6. What we deferred and why

- **Wiring the real EPA scorer.** The verbalizer substrate's Warriner lookup exists on the host but is faiss-backed and heavy; the injectable hook keeps the engine importable everywhere. Deferred until an advisory consumer actually wants affect-weighted severity.
- **Deriving version dictionaries from source.** The two CakePHP layers are authored seeds — accurate to well-documented history, but hand-written. The scanner pipeline (Steps 4–5) can scan two versions of a framework's codebase and draft the layers from extracted doc statements; that closes the loop from "authored" to "measured". Deferred: needs a real two-version corpus checked out.
- **Joining dictionary-level drift to scanned entities.** `EntityDB.version_diff` already answers "which *entities* vanished between tags"; combining it with `semantic_diff` would say "and here is *why*, per classifier" against a user's actual project. Deferred as the natural Step 6/10 follow-on.
- **RENAME advisory synthesis** (removed+added with matching meanings → one advisory), and a **PHP parser** — CakePHP projects themselves are config-only in the init wizard today.

## 7. Result and consequence

**VALIDATED:** deterministic meaning drift between two versioned dictionary layers, four-bucket classification, three-level severity, migration advisories in the plan's shape, over the CakePHP 2.0/5.4 pair — no model call anywhere in the path; 8/8 step tests, 97/97 lane tests.

**VALIDATED:** the additive-composition collision guard doubles as the versioning architecture — versioned layers cannot be merged, only compared, by construction.

**UNVERIFIED:** severity calibration against real migration outcomes. ARCHITECTURAL/SIGNIFICANT/MINOR agree with CakePHP's documented history on this pair, but a 3-rule word-overlap ladder has not been tested against frameworks with sparser meaning strings, and the EPA shift has only run under a toy scorer.

**UNVERIFIED:** the authored layers against CakePHP source. The meanings match the documented architecture; nobody has scanned 2.0 and 5.4 codebases to confirm the drafted vocabulary is complete.

The consequence: version drift is now a *queryable property* of the dictionary stack — an agent holding a 2.0-era codebase can ask `semantic_diff` what its vocabulary means today and get severities, not vibes. What it forces next is the derivation loop: scan two real framework versions, draft the layers from what the scanner extracts, and let the same engine grade a dictionary we did not write by hand.
