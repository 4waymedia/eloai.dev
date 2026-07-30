# 2026.07.29 — A Load Rule With Nothing to Compare Against: The Codec Vocabulary Carried No Fingerprint

*Full write-up. The Field Notes teaser of the same title is cut from this. ELO-Browser + semantic_compression — completing the §2 binding rule the coupled dictionary family shipped on 2026-07-10, and closing one of the two gaps the 2026-07-11 tri-state load rule left open.*

## Problem / context

The browser dictionary is not a file, it is a family: a codec vocabulary (`elo-browser-v01a.browser.json`, 261,872 entries) and three binary channels that are parallel arrays over the same vocab index `n` — affect (`epa.bin`), affordance (`facets.bin`), denotation (`neighbours.bin`). `DICTIONARY-FAMILY-INTEGRATION.md` §2 states the load rule in one sentence: verify all three headers carry the **same** fingerprint, *and that it matches the codec dictionary you decode with*. The reason is the hazard the family was built to refuse — a foreign asset parses cleanly and returns the wrong word for every id. Nothing crashes. The system is simply, quietly, wrong about what things mean.

§2 imposes two obligations. The browser enforced one of them. Inside `neighbours()`, two `assert_eq!`s checked that `neighbours.bin`, `epa.bin`, and `facets.bin` agree. The second obligation — that the family also matches the vocabulary resolving its ids — had no implementation, and could not have had one. `CanonDict` had no fingerprint field, because the JSON it deserializes had no fingerprint key, because `export_browser_vocab.py` never emitted one. Its header carried eight fields: `vocab_version`, `cut`, `entry_count`, `content_size`, `byte_fallback_start`, `special_tokens_start`, `total_vocab`, `entries`. Not one of them is an identity.

So the half of the rule that guards the most dangerous mismatch — assets from build A indexed by vocabulary from build B — was not weakly enforced or enforced-with-a-warning. It was unaskable. The producer never emitted the thing the consumer would have had to compare.

## Background

Three pieces already existed, which made this wiring rather than invention:

- **The fingerprint itself.** Every dictionary LMDB stores `dictionary_fingerprint` in its `meta` sub-DB — a deterministic hash over the forward DB's `(surface, id)` pairs. `export_browser_assets.py:154` already reads exactly that key to stamp the `.bin` headers.
- **The tri-state semantics.** Stage 06's D4 guard raises only when both sides are known and differ; Stage 07's `BuildIdentity.compatible_with` returns `True` / `False` / `None`, and **unknown never conflicts**. Both were published on 2026-07-11. There was no reason to invent stricter semantics for a fourth consumer.
- **The prohibition.** `BINDINGS.md`: *"drift is not a sin. **Silent** drift is"* — and, decisively for this change, *"Don't invent a second hashing scheme."*

One constraint governed the design: `export_browser_vocab.py` advertises **"No heavy deps (gzip + csv + json)"** in its own docstring, and the fingerprint lives in an LMDB.

## Approach

**1. Emit the identity from its existing source.** `read_dictionary_fingerprint(build_dir)` soft-imports `lmdb`, opens the build's `dictionary.lmdb` read-only, and reads the `meta` sub-DB key — the same source, the same bytes, as the emitter that stamps the `.bin` headers. Any failure (no lmdb, no LMDB, no key) returns `None`, and the header records the producer's explicit sentinel:

```python
"dictionary_fingerprint": dictionary_fingerprint or "unknown",
```

The soft import is the whole answer to the no-heavy-deps constraint. The alternative — hashing the `(surface, id)` pairs already in `token-ids.csv.gz`, which needs no dependency at all — is the second hashing scheme `BINDINGS.md` names.

**2. Carry it, tri-state, into the browser.** `CanonDict` gains `pub dictionary_fingerprint: Option<String>`, with the producer's sentinel normalised at the boundary so consumers reason about exactly one representation of unknown:

```rust
let dictionary_fingerprint = bj
    .dictionary_fingerprint
    .filter(|f| !f.is_empty() && f != "unknown");
```

**3. Enforce both clauses in one named place.** The two inline assertions moved out of `neighbours()` into `assert_family_binding(family_fp: &str)`, which adds the missing clause:

```rust
match canon().dictionary_fingerprint.as_deref() {
    Some(codec_fp) => assert_eq!(
        family_fp, codec_fp,
        "asset family / codec vocabulary fingerprint mismatch -- the .bin \
         channels index a different build than the vocabulary resolving ids"
    ),
    None => eprintln!(
        "[elo] codec vocabulary carries no dictionary_fingerprint -- family \
         binding to the codec is UNVERIFIED (asset predates the field)."
    ),
}
```

Known-vs-known is an `assert!`, because §2 says *"Reject on mismatch; do not 'best effort'."* Known-vs-unknown is a warning, because a vocab exported before July 2026 is not evidence of drift. That is the 06/07 tri-state, copied.

**4. Regenerate the shipped vocab**, so the clause asserts instead of logging UNVERIFIED.

## Data and examples

The regeneration, diffed before it was written:

| | prior shipped asset | regenerated |
|---|---|---|
| header keys | 8 | 9 |
| `dictionary_fingerprint` | absent | `b1790799…0ed7dd0` |
| entries | 261,872 | 261,872, **byte-identical** |
| `content_size` / `total_vocab` | 261,872 / 262,144 | unchanged |
| file size | — | 12,867,735 bytes |
| git diff | — | **1 insertion, 1 deletion** (single-line JSON) |

Artefacts now carrying `b1790799882521e594ff3776916d9fc74b4eab4b9b5b8b75a6025d4f30ed7dd0`, read directly from the shipped files:

| artefact | source of the value |
|---|---|
| `epa.bin` | header bytes `[16:80]` |
| `facets.bin` | header bytes `[16:80]` |
| `neighbours.bin` | header bytes `[16:80]` |
| `assets.meta.json` | binding record |
| `neighbours.meta.json` | binding record |
| `elo-browser-v01a.browser.json` | **new** — `dictionary_fingerprint` |

Six of six agree, so the new assertion passes rather than merely compiling.

| check | result |
|---|---|
| `export_browser_vocab.py --selftest` | 5/5 PASS |
| `wonder/composition_probes.py` | 26/26 |
| `wonder/definition_probes.py` | 26/26 |
| `wonder/compound_learning_probes.py` | 47/47 |
| 08 gateway (`unittest discover`) | **126/126 OK** (1 skipped) |
| `tsc --noEmit` | clean |
| `cargo check` | green |

## What broke

**The change that enforces §2 nearly violated §2.** The browser `include_str!`s the vocab at compile time, and every `n` in it is the join key for all three channels. Adding one header key means re-deriving all 261,872 entries from `token-ids.csv.gz` — and a projection that drifted by a single row would shift every id and point the assets at the wrong words. That is precisely the silent corruption the rule exists to refuse, introduced by the tool fixing the rule. It was caught only because we diffed the regenerated entry list against both existing copies *before* writing either one; they were identical, and the committed diff came back one line. The rule we are keeping: a change that adds an integrity field must prove, in the same run, that it changed nothing else.

**The cheap fix was the wrong fix, and the doc said so before we wrote it.** With "no heavy deps" in the module's docstring and the fingerprint locked inside an LMDB, deriving a hash from the CSV already in hand is the obvious move. It produces a number that is not the number in the `.bin` headers. A guard that compares two quantities which were never the same is worse than no guard — it fires on healthy builds until someone weakens it. We only avoided it because the instruction was to re-read the specs before finalising, and `BINDINGS.md` names this exact failure.

**The assertion is more fragile than it looks.** It only works because all three readers parse the header identically — `String::from_utf8_lossy(&b[16..80])`, no trim, no NUL handling. Had one reader trimmed and another not, the guard would panic on a *correct* family. Verified by reading all three; enforced by nothing.

**The environment, again.** A `git status` run inside the `semantic_compression` submodule through the mounted filesystem left a stale `index.lock` that the mount cannot unlink — the second occurrence this session, and it blocked the commit until it was cleared by hand. Rule kept: do not run git through the mount.

## What we deferred and why

- **Runtime vs. gateway substrate identity.** The third obligation, from the 2026-07-11 paper: the browser cannot compare its family against the gateway's, because RecalEngine still does not expose its fingerprint publicly. That paper filed it as the upstream follow-up; it remains filed.
- **Lazy verification.** `assert_family_binding` runs from `neighbours()`, so a session that never requests neighbours never verifies anything. Eager-loading all three channels at startup fixes it and gives back the lazy-load saving — an open trade, recorded in the function's doc comment rather than silently taken.
- **No test asserts the guard fires.** Proving rejection needs a deliberately mismatched asset in the tree, and the smallest honest fixture is another multi-megabyte vocab. Only the happy path is measured.
- **Other builds.** Only `elo-browser-v01a` was regenerated. Any other build's vocab still reports unknown, and correctly downgrades to a warning.
- **The producer can still ship unverifiable output.** With `lmdb` absent, the exporter writes `"unknown"` and the browser warns. That is the right tri-state, but it means the warning surfaces on the consumer's machine, not the build machine's.

## Result and consequence

- **VALIDATED** — §2 clause 1 (all three `.bin` share one fingerprint) still enforced, behaviour unchanged, now in one named function instead of inline in a `OnceLock` initialiser.
- **VALIDATED** — §2 clause 2 is enforced *and passing*: six artefacts carry `b1790799…`, `cargo check` is green, and the assert runs on first `neighbours()` use.
- **VALIDATED** — the regeneration is additive: 261,872 entries identical to both prior copies, one-line committed diff.
- **VALIDATED** — no regression: 126/126 gateway tests, 99/99 wonder probes, exporter selftest, `tsc` clean.
- **UNVERIFIED** — the rejection path. No run has produced a genuine mismatch, so we have measured that the guard permits a correct family, not that it refuses a wrong one.
- **UNVERIFIED** (unchanged since 2026-07-11) — runtime vs. gateway substrate identity.

The consequence is narrow and worth stating plainly: swapping the browser's asset subdir for a different build now fails loudly at first use instead of returning fluent, confident nonsense. The wider lesson is about where integrity gaps actually live. This one was not a missing check. The check was written, the semantics were already correct, the doc that mandated it had been published for eighteen days — and it could not run, because the producer three repositories upstream had never emitted the field the consumer needed to ask its question. An unenforceable rule reads exactly like an enforced one from inside the consumer.
