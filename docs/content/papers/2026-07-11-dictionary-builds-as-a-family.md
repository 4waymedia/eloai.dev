# 2026.07.11 — The Dictionary Builds as a Family: One Command, One Declared Suite

*Full write-up. The Field Notes teaser of the same title is cut from this. System 1 — the canonical dictionary — now compiles a dictionary and its supporting assets as a single declared product, and shipped its first full-suite package this way (`elo-browser-v01a`, 437,990 entries).*

## Problem / context

An ELO dictionary is not a file. It is a family: a canonical `surface → ID` map plus the derived assets that hang off those same IDs — facets (what a machine may do with a word), a metadata database, an affect channel, a denotative index, the browser's binary runtime files. The assets are meaningless apart from the dictionary, because IDs are assigned by frequency and one added corpus document can renumber the entire vocabulary. An affect table from build A, loaded against build B, attaches the wrong values to every ID. The bytes parse, the system runs, the understanding is silently wrong.

Producing that family used to be a manual sequence: run the core build, then remember to run affect, then metadata layer two, then the browser export, then the verification — in dependency order, or ship a corrupt family. We did ship corrupt families, more than once this month: a browser bound to a 13,905-entry affect table against a 236,645-surface substrate; a search index whose row→word mapping had drifted. The failure was never in the code. It was in the coupling — an asset paired, by hand, with the wrong dictionary.

This matters now because the substrate is in motion. `elo-browser-v01a` is `status=staged`; facets are re-derived per build; the plan is several test-group builds before the char-4 stabilization freeze. Every rebuild between now and then can reassign IDs. A build process that treats the family as a manual checklist is a build process waiting to mismatch one.

## Background

Three prior pieces made this a wiring job, not an invention:

- **The identity primitive exists.** Every dictionary LMDB stores a `dictionary_fingerprint` in its `meta` sub-DB — a deterministic hash over the forward DB's `(surface, id)` pairs. `artifact_identity.py` wraps it and every derived asset into a per-artifact identity record, referenced from the package `manifest.json` in an `artifacts` registry.
- **The cascade driver exists.** `build_assets.py` walks the asset DAG in dependency order, rebuilding only what is stale (fingerprint-guarded), writing each stage's ledger atomically, and reporting `SKIPPED (missing dep …)` for environment-blocked stages rather than failing the run.
- **The core builder exists.** `build_from_spec.py` turns one YAML spec into the dictionary + LLM profile cuts + (when declared) facets and meta layer 1, hashing every corpus source into a reproducible `corpus_fingerprint`.

What was missing was the declaration that ties them together — a statement of *what a given dictionary ships* — and a single command that reads it.

## Approach

Two additions, both in `semantic_compression/`.

**1. The asset suite (`build_suite.py`).** The build spec now carries a `suite`, a declaration of the finished product's bill of materials, plus optional per-asset overrides:

```yaml
build:
  size: char-4
  suite: full            # minimal | standard | full
  assets:                # optional explicit on/off over the preset
    epa: true
```

```
PRESETS = {
  "minimal":  {dictionary},                                  # edge / keyboard
  "standard": {dictionary, facets, meta},                    # apps, coding packs (default)
  "full":     {dictionary, facets, meta, epa, meta_layer2,   # the whole stack
               vectors, browser},
}
```

`build_suite.py` is the single source of truth for what a preset expands to, each asset's declared prerequisites, and its environment prerequisites. Two prerequisite classes, two behaviours: **declaration deps fail fast** — asking for `browser` without `epa` and `facets` raises at resolve time, so a build never half-derives — and **environment deps block softly** — no embedding model means `vectors` is marked `blocked` with a reason and skipped, the rest of the family builds, and the registry records it `present:false`. The resolved plan is previewable before any compute:

```
python build_suite.py builds/<name>.yaml     # per-asset build / blocked / off, with reasons
```

**2. The one command (`build_dictionary.py`).** A single entrypoint that runs the core build, then the asset cascade for whatever the suite declares — affect, metadata layer two, the denotative index, the browser export, the lifecycle stamp, and verification — chaining the two independently-runnable stages from one declaration:

```
python -m semantic_compression.build_dictionary builds/<name>.yaml
python -m semantic_compression.build_dictionary builds/<name>.yaml --dry-run   # plan only
python -m semantic_compression.build_dictionary builds/<name>.yaml --device cuda
```

Flags after the spec pass through to the cascade. `epa` and the browser export are no longer steps you must remember; they are consequences of the declaration.

The guardrail is unchanged from the family contract and now enforced end to end: every derived asset records the fingerprint of the dictionary it descends from, and `tools/verify_substrate_chain.py` walks the `manifest.json` registry and refuses any asset whose fingerprint has drifted — including a stale manifest not re-emitted after an asset was rebuilt. A build that fails that check is not shippable, regardless of how well it compresses.

## Data and examples

We built `elo-browser-v01a` from one command with `suite: full` (declared explicitly to exercise every asset and measure the resulting file sizes):

| property | value |
|---|---|
| entries | 437,990 |
| corpus tokens | 327,600,054 |
| corpus fingerprint | `b80e8706…` |
| declared suite | `full` (dictionary · facets · meta · epa · meta_layer2 · vectors · browser) |
| status | `staged` |
| produced by | `build_dictionary builds/elo-browser-v01a.yaml` |

The single command produced the package and stamped the entire recipe — corpus sources, per-source hashes, resolved suite — into its `manifest.json`, reproducible and auditable by construction. The `artifacts` registry records what actually built, so the declaration and the result are checkable against each other rather than assumed to agree.

Because a build is now a declared compilation, the same pipeline produces specialized families by changing the spec: a **medical** build packs the short IDs with diagnoses and drugs and ships a rich clinical meta suite; a **programming** build gives short IDs to syntax and APIs and skips affect on structural tokens; a **tiny-device** build ships `minimal` and nothing else. Each is its own family, bound by its own identity, none interchangeable.

## What broke

Two things, one of them on-theme.

**The development file mirror served silently truncated sources.** The sandboxed environment mirrors the working folder, and mid-session it pinned several files at stale lengths with mtimes that never advanced through multiple edits — and, worse, truncated at clean statement boundaries so a `py_compile` check passed on a file missing methods. A syntactically valid file with a third of its meaning gone is precisely the corruption this whole build-family effort exists to refuse: the bytes parse, the check passes, the content is wrong. The working rule we keep: *a compile check is not an integrity check.* Only content identity — the fingerprint — is. It is the same lesson the family's load rule encodes, arriving through the tooling instead of the data.

**The `--overrides` silent-degrade.** `facet_builder`'s override file resolves relative to the current directory, so invoking it by hand without `--overrides data/facet_overrides.tsv` loads **zero** overrides and produces a worse dictionary — `the` mis-tagged, function words as content — with no error. `build_dictionary`/`build_assets` pass it correctly; the trap only bites a manual sub-step. It is now documented as a gotcha with a "check the first log line reads `Loaded N overrides`, N > 0" instruction, but it is exactly the kind of quiet wrong-answer the declared, one-command path exists to remove.

## What we deferred and why

- **Verify folded into the command as a hard gate.** `build_dictionary` runs verification as the cascade's last stage, but a build that fails it currently reports rather than refusing to exist. Making "built" and "verified" a single atomic event — no shippable package without a green chain — is the near-term hardening.
- **Coverage counts in the identity record.** Assets declare coverage informally; `record_count` / `covered_ids` are not yet emitted per artifact. Adding them lets a consumer see *how much* of a sparse family an asset enriches, not just whether it is present.
- **The denotative index at scale.** `full` declares `vectors`, but the 768-d embedding index over the whole vocabulary is a heavy, environment-gated stage; it builds where the model is present and blocks softly elsewhere. The real semantic-search asset (`neighbours.bin`) is designed, not yet a frozen part of any family.
- **Vocabulary reconciliation.** The build-family design notes use `build_id` / `dictionary_hash` / `asset_type`; the shipped manifest uses `corpus_fingerprint` / `artifacts.<name>.kind`. The rename cascades into every consumer, so it is deliberate and tracked, not yet done.

## Result and consequence

- **VALIDATED** — `elo-browser-v01a` built from a single command with the full suite declared: 437,990 entries, corpus fingerprint `b80e8706`, every declared asset recorded in the manifest registry.
- **VALIDATED** — the suite resolver's two prerequisite behaviours: a missing declaration dep raises at plan time; a missing environment dep blocks softly and records `present:false`, the rest of the build proceeding.
- **VALIDATED** — backward compatibility: the legacy `build.with_facets` boolean still resolves (to the `facets` asset), so every pre-suite spec builds unchanged.
- **UNVERIFIED** — the fully-atomic verify-on-build. Verification runs in the cascade, but "no package exists unless the chain is green" is not yet enforced; a determined operator can still inspect a build that failed its own gate.

The consequence: a dictionary is now a *declared product*. You state what it ships, one command builds exactly that family in dependency order, and the fingerprint threads through every asset so a mismatch is a hard stop rather than a silent misread. The manual sequence that corrupted three artifacts this month is gone — not fixed, removed. And the same compiler now scales sideways into specialized dictionaries without a new pipeline, because "which assets, at what budget, for which domain" is a line in a spec.
