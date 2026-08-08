# 2026.08.07 — A Package Always Imports Itself: Seven Green Suites and a Broken Tree

*Full write-up. The Field Notes teaser of the same title is cut from this. R-D-concepts packaging lane; the day we renamed every Python package in the repo and learned that component-level verification cannot see the damage a rename does.*

## Problem / context

We renamed the distributions. Seven packages in `R-D-concepts/packages/` carried names that assumed one consumer — `eloai-context-assembly`, `eloai-extraction-pipeline`, `mneme`, `verbalizer` — and there are now several: a browser, a word processor, a messenger. So the substrate moved to a neutral namespace (`elo-context`, `elo-extraction`, `elo-mneme`, `elo-verbalizer`, `elo-recall`) and the product prefix was reserved for a future layer that composes on it.

Two lanes, working carefully and in good faith, also renamed the *import* names of their modules. Their packages went green. One recorded the state in the checklist as:

> `elo_extraction ✅ 2026-08-07 (110 tests green, 29 external consumers updating in parallel)`

The consumers were not updating in parallel. They were broken. `05-ExtractionPipeline/extraction_pipeline/` no longer existed, and every file in the tree that named it failed at import — including `recal_engine.py:114` and three `_bootstrap.py` path builders, which are the machinery that makes development imports resolve at all.

Nothing in the repository connected a module rename to its consumers. The suites that ran were the renamed package's own, and **a package always imports itself fine.**

## Background

This was a wiring job. The pieces were already here:

- **`tools/systems.toml`** — a registry declaring each package's `dist_name` and `import_name`. It had never been checked against reality.
- **`PipelineLab/pipeline_lab/conformance.py`** — the §6 anatomy checker, already reading each package's `pyproject.toml`.
- **`SYSTEMS.md` §2a** — three documented guard-evasion classes: runtime `sys.path` mutation, a stale package, and an implicit namespace package resolved from CWD. Today produced a fourth instance of the first.
- **`ELO_PACKAGING_STANDARD.md` §5.1** — "one buildable identity per distribution name," the rule written after `mneme`'s contradiction test passed against its source and failed against its installed package.

## Approach

**1. Stop deriving one name from another.** `conformance.py::_import_name` computed the import name from the distribution name (`elo-recall` → `elo_recall`). The first dist rename therefore made the `src/<import_name>/` check fail on a package nobody had broken. Dist and import names are deliberately decoupled during a phased rename, so the checker now reads what the wheel actually ships:

```python
def _import_name(pkg_name, dir_name, wheel_pkgs=None):
    for w in (wheel_pkgs or []):
        seg = w.rstrip("/").split("/")[-1]
        if seg and seg != "src":
            return seg
    return (pkg_name or dir_name).replace("-", "_")
```

**2. Delete the naming→tier inference.** The checker derived a package's tier from an `eloai-` prefix, so every plain-named `tier = "system"` package would have failed the moment the renames landed. Tier is now read only from `[tool.elo]` — a declared role, derived from nothing.

**3. Add a declaration guard (N12).** Assert that a package's shipped module equals its `systems.toml` `import_name`.

**4. Add a consumer guard, because step 3 is not enough.** This is the load-bearing one. `tools/check_imports.py` parses every `.py` in the tree with `ast` and asks a question that needs no declaration to answer:

```python
for mod, lineno in _top_level_imports(path):
    if mod in shipped or mod in stdlib or mod in _EXTERNAL:
        continue
    orphans.setdefault(mod, []).append(f"{rel}:{lineno}")
```

The constraint that governed the design: **a check that can be satisfied by editing a registry is not a check.** N12 compares metadata to metadata. `check_imports.py` compares imports to the filesystem.

## Data and examples

Run against the tree immediately after the two renames:

| module imported | executable import sites | resolves? |
|---|---:|---|
| `extraction_pipeline` | **15** | ✗ — renamed to `elo_extraction` |
| `src` | 7 | ✗ — vendored `lsdf-core-main` tests, `sys.path` injection |
| `substrate` | 6 | ✗ — PipelineLab adapters, pre-existing |

`extraction_pipeline` appears in **24 files** and **46 textual occurrences**; only 15 are executable import statements. The remainder are path strings, docstrings, and a `FORBIDDEN` tuple — which matters, because they cannot be fixed by the same rule (see *What broke*).

Package conformance across the seven packages, after N2–N6 landed:

| check | packages failing | resolved by |
|---|---:|---|
| `layer 2 composes a base` | 3 | finishing the dist renames |
| `no stuttering segments` | 2 | the import pass |
| `no reserved segments` (warn) | 4 | as encountered |

The stutter check found the defect it was written for, already in the tree: `recal_engine.recal_engine` and `context_assembly.context_assembly` — a module named identically to its own package.

Distribution installs, verified in the venv after the renames and `uv sync`: **seven distributions, seven packages, one each.** No `eloai_*` orphan resolves. Before the day's work there were seven `.pth` files for three logical packages, including a pre-reconcile `eloai_mneme 0.1.0` that still answered `import mneme`.

## What broke

**Our own new checker, on its first run.** It reported `semantic_compression` as an orphan at **88 sites**. It is not an orphan; it is a top-level directory, and every `_bootstrap.py` in the repo puts the repo root on `sys.path`. The checker's model of "shipped" only counted *children* of source roots. Caught because 88 was implausible — which is a bad reason to catch something, and would not have worked at 3 sites.

**The declaration guard we built to prevent this would not have prevented it.** N12 catches a rename that outruns its declaration. Both lanes updated `systems.toml` in the same change, so N12 passes for both. We built it, tested it against the actual failure, and found it insufficient — which is why the consumer-side checker exists at all. It is recorded in the spec as a stated limit rather than quietly relied upon.

**A forwarder that was already broken, differently than reported.** `semantic_compression/verify_verbalizer.py` was diagnosed as broken by a deleted compat alias. It was not: lines 15–17 injected `packages/eloai-verbalizer/src` onto `sys.path` and imported the real package. Retiring the alias did nothing; deleting the orphan directory is what broke it. An `is_dir()` guard meant the path insert failed silently and the import failed loudly one line later — so the traceback named the wrong cause.

**A test that now guards nothing.** `packages/elo-context/tests/test_smoke.py` asserts a list of `FORBIDDEN` modules never enters `sys.modules`. It lists `extraction_pipeline`. Nothing can import that name any more, so the assertion is vacuously true. The gate is green and it is testing nothing — the same shape as the conftest that hid 283 tests in the MCP lane, and not something either checker above can see.

**The documentation misdirected a lane, twice.** A blocker recorded as closed in a summary table was still written in future tense in the section body — "this will fail loudly the moment the renames land" — so a lane re-raised a gate that had been closed hours earlier. Status recorded only in a summary is invisible to anyone reading the prose.

## What we deferred and why

- **The import rename itself.** The argument for `elo_*` import names was PyPI collision — `verbalizer`, `mneme` and `context_assembly` are unqualified top-level names. But every package is `publish = false`; nothing is going to an index. The payoff is hypothetical, the cost is 185 files and seven tree-wide sweeps. Deferred until a real publish decision, with the reverts restoring a uniform state: `elo-*` distribution, established import name, seven for seven.
- **A `publish`-follows-layer rule.** A first cut warned when an `elo-*` package had `publish = false`, reasoning that layer 1 is publishable. That conflated *reusable* with *publishable* — first-party products are still not an index. The warn was deleted rather than kept as a lint.
- **The two known stutters.** `recal_engine.recal_engine` is a `git mv` plus one line, since 14 of 15 call sites use the package façade. It waits for the import pass rather than moving alone.

## Result and consequence

- **`VALIDATED` — component-level test suites cannot detect a rename's damage.** Two packages reported green (110 and 76 passing) while 15 executable import statements in seven other systems named a module that no longer existed. Reproducible: check out the tree at that commit and run `tools/check_imports.py`.
- **`VALIDATED` — a declaration-based guard is insufficient.** N12 passes for both real failures, because the declaration moved with the code. Measured against the actual event, not hypothesised.
- **`VALIDATED` — one distribution per package, verified in the venv.** Seven dists, seven packages, no orphan resolving.
- **`REFUTED` — "dist renames are low risk, no import churn."** Written in our own plan that morning; falsified by the first rename, which failed a check that derived the import name from the distribution name.
- **`UNVERIFIED` — that the deferred import rename is worth doing at all.** It buys namespace safety on a public index. Nothing is published, so the benefit is untested.

What this unlocks is narrow and useful: the tree now has a check whose answer does not depend on anyone's bookkeeping. `check_imports.py --check` is green only when every import in every file names something that exists. That is the property a rename must preserve, and until today nothing in the repository could state it.

The broader consequence is a rule we are keeping: **the unit of verification is the consumer, not the component.** A component always imports itself fine. That sentence is the whole finding, and it cost a day to learn precisely.
