# 2026.07.11 — A Tri-State Load Rule: Context Assembly Refuses Mixed-Dictionary Memory

*Full write-up. The Field Notes teaser of the same title is cut from this. Stage 07 (Context Assembly) v0.3.0 — the first downstream consumer to implement the dictionary build family's load rule.*

## Problem / context

A dictionary build is not a file; it is a family of assets that are meaningless apart from each other. The build-family spec states the hazard exactly: Build A assigns `184 → doctor`, `906 → murder`. Build B assigns `184 → system`, `906 → medical doctor`. An asset from A loaded against B attaches the wrong meaning to every ID. The bytes still parse; the system still runs fast; its *understanding* is silently corrupted.

Stage 07 — Context Assembly — is a downstream consumer of ID-bearing surfaces. It blends fields from multiple context providers (persistent memory today; conversation, world, tool, system later) into one working context for the reasoning layer. Through v0.2.1 it did this with **no record of which dictionary build encoded each field**. Two providers bound to different builds would be merged without complaint, and nothing downstream could ever detect it.

This matters now, not eventually, because S1 IDs are provisional. The current general dictionary (`general_v0.4_char4`, 417,841 entries) is status=staged; facets are re-derived per build; the plan is 5–10 test-group builds before the char-4 stabilization freeze. Every rebuild between now and then can reassign IDs. A consumer that cannot tell builds apart is a consumer waiting to misread one.

## Background

Three prior pieces made this a wiring job rather than an invention:

- **The coupling primitive exists.** Every dictionary LMDB stores a `dictionary_fingerprint` in its `meta` sub-DB — a deterministic hash over `(surface, id)` pairs of the forward DB. `artifact_identity.py` wraps it into a per-asset identity `{version, fingerprint, status, bound_refs}`.
- **The rejection semantics exist.** Stage 06 (RecalEngine) already guards its inverted index with what we call the D4 guard: `assert_fingerprint` raises only when `got is not None and expected is not None and got != expected`. An *unknown* fingerprint on either side is not a mismatch. This is the correct semantics for a substrate in transition, and we copied it rather than inventing stricter ones.
- **The seam exists.** 07's provider architecture (DECISIONS D1) already makes the provider the unit of source identity: every seed is tagged with the provider that supplied it. Identity of the *encoding build* belongs at the same seam.

One constraint governed everything: 07's core is stdlib-only with zero runtime dependencies, and its upstream contract is five duck-typed methods on whatever object you hand it. The identity read had to cost nothing and require nothing.

## Approach

Five changes, all in `07-ContextAssembly/context_assembly/`, shipped as v0.3.0:

**1. `BuildIdentity` (types.py).** A frozen dataclass: `{build_id, dictionary_hash, dictionary_release, status, extra}`, all optional. `key()` prefers the composite `build_id` (the family spec's target contract) and falls back to `dictionary_hash` (today's fingerprint) — so when the substrate widens the fingerprint into a composite `build_id` (build-family evolution step 1), 07 needs no change. `extra` is an opaque tuple of key-value pairs for the richer per-build information the family now exposes (facets fingerprint, `meta_fingerprint`, coverage); it does not participate in comparison.

The core is the tri-state comparison:

```python
def compatible_with(self, other):
    """True (same family), False (definite mismatch),
    None (unknowable -- either side has no identity)."""
    if other is None:
        return None
    a, b = self.key(), other.key()
    if a is None or b is None:
        return None
    return a == b
```

Unknown never conflicts. Every pre-family upstream — including all of v0.2's — remains valid without modification.

**2. `read_build_identity` (adapter.py).** Pure duck-typing, never raising. Richest surface first: a `build_identity` / `dictionary_identity` attribute or callable returning a `BuildIdentity` or a mapping (the shape `artifact_identity.make_identity` emits — it accepts `dictionary_hash`, `dictionary_fingerprint`, or `fingerprint` as the hash key); else a bare `dictionary_fingerprint` / `dict_fingerprint` string; else `None`. A broken surface (raises on call) falls through to the next.

**3. Providers carry identity (providers.py).** `ProviderResult.identity` is the build a provider's field is bound to. `SeedFieldProvider` fills it from its engine. `gather()` keeps the full per-provider identity map and selects a **reference identity**: the wave-owning provider's — the persistent-memory backbone defines the family the context "speaks" — else the first known.

**4. The load rule (assembler.py, Phase 2b).** `AssemblyOptions.identity_policy` ∈ `ignore | warn | reject`, default **warn**, plus `AssemblyOptions.expected_identity` — the build the caller (08, a reasoning layer configured against a specific `manifest.json`) is bound to, which overrides the field's own reference. Under `reject`, any definite mismatch raises `BuildIdentityMismatchError` before a single seed is scored. Under `warn`, the conflict strings land in `diagnostics.identity_conflicts` and assembly proceeds. Under `ignore`, nothing is compared but the identity is still recorded.

**5. Output.** `WorkingContext.build_identity` carries the reference family; `diagnostics.identity_policy` / `identity_by_provider` / `identity_conflicts` make every assembly auditable; all of it serializes through `to_dict()`. The configuration hash folds in the policy and expected key, so `context_id` remains a faithful function of everything that shaped the context.

## Data and examples

Policy behavior on a two-provider assembly where the memory backbone reports fingerprint `aaaa…` and a tool provider reports `bbbb…`:

| policy | outcome |
|---|---|
| `ignore` | assembles; identity recorded; no comparison |
| `warn` (default) | assembles; `diagnostics.identity_conflicts == ("provider 'tool' field is bound to build 'bbbb…', reference is 'aaaa…'",)` |
| `reject` | raises `BuildIdentityMismatchError: dictionary build mismatch -- refusing to assemble a mixed-family context: …` |
| `reject`, both `aaaa…` | assembles; conflicts empty |
| `reject`, tool has no identity | assembles; unknown is not a mismatch |

Caller-side binding:

```python
expected = BuildIdentity(dictionary_hash=manifest_fp,
                         dictionary_release="v0.4.0", status="staged")
ctx = asm.assemble("self", options=AssemblyOptions(
    identity_policy=IDENTITY_REJECT, expected_identity=expected))
ctx.build_identity                    # the family this context speaks
```

Test accounting:

| suite | tests |
|---|---|
| engine + invariants (existing) | 43 |
| provider provenance + readiness seam (existing) | 10 |
| build-identity load rule (new) | 24 |
| **total** | **77** |

The 24 new tests cover the tri-state semantics, all four duck-typing surfaces (attribute, method, mapping, broken-then-fallback), reference selection in `gather()`, all three policies, `expected_identity` match/mismatch/unknown, the invalid-policy guard, and determinism of `context_id` with identity present. `verify.py` (lmdb-free integration) passes unchanged; the run on the real tree confirmed **77/77 OK** and all integration checks green.

## What broke

Two things, one of them uncomfortably on-theme.

**The session's file mirror served silently truncated modules.** The sandboxed environment we develop in mirrors the working folder. Mid-session, the mirror pinned `types.py` at 401 lines (the true file: 509) with an mtime that never advanced — through multiple edits and a full atomic rewrite. Worse: `assembler.py` was truncated *at a clean statement boundary*, so `python -m py_compile` **passed** on a file missing its last three methods. A syntactically valid file with a third of its meaning gone is exactly the failure shape this whole feature exists to refuse — the bytes parse, the check passes, the content is wrong. The workaround was to run the suite against an exact injected copy of the true sources, then re-verify on the real tree (which passed 77/77 first try). The lesson we are keeping: *a compile check is not an integrity check*; only content identity is.

**Test-layout convention.** The new suite first used a relative import (`from .fakes import …`), which `unittest discover` rejects in this repo's layout; the existing suites import `from tests.fakes`. Trivial, but it cost a debugging round on top of the mirror confusion because the failure surfaced identically (import error on a file that "looked" correct).

## What we deferred and why

- **Per-seed identity.** Identity is compared per provider *field*, not per seed. A provider that internally mixes builds is undetectable at this seam. Deferred deliberately: the provider is the unit of source identity by design (D1), and no current provider mixes builds.
- **Facet-aware recall.** 06 v0.7.0's `facet_rank()` / `recall_field()` surface is still unconsumed by 07. `BuildIdentity.extra` is where facets/meta fingerprints will ride; the integration is next, not now.
- **Render output.** Renderers do not emit identity — it is machine-level provenance for 08 and audit, not prompt content. A render profile with a `[BUILD …]` header can be added without contract change if a consumer wants it visible.
- **Exact ELO-ID budgeting.** `ContextBudget.unit="elo_ids"` remains reserved. It needs an injectable coster bound to a specific build — now *expressible* (pair the coster with `expected_identity`) but not yet built.
- **Upstream accessor.** RecalEngine guards its own index with the fingerprint internally (`read_dict_fingerprint`) but does not expose it publicly. Until it grows a `dictionary_fingerprint` / `build_identity` accessor, production identity arrives via a wrapper or engine attribute — the duck-typed read accepts either. Filed as the upstream follow-up.

## Result and consequence

- **VALIDATED** — 77/77 unit tests and `verify.py` pass on the real tree (PowerShell, the developer's venv), including 24 new identity tests.
- **VALIDATED** — the default path is behavior-preserving: with no identity anywhere, `build_identity` is `None`, conflicts are empty, and assembly is unchanged from v0.2.1; an explicit test holds this even under `reject`.
- **VALIDATED** — zero new dependencies; the core remains pure stdlib and the identity read is pure `getattr`.
- **UNVERIFIED** — the live production flow. No engine in the current pipeline exposes an identity surface yet, so end-to-end identity (dictionary LMDB → 06 → 07 → 08) has run only against test doubles. It becomes checkable the moment 06 exposes its fingerprint publicly.

The consequence: 08 can now *pin* its context to a build — hand `expected_identity` from the manifest it was configured against and set `reject`, and a stale or foreign memory field fails loudly instead of reading plausibly and meaning something else. And when the family contract widens `dictionary_hash` into the composite `build_id`, 07 requires no change: `key()` already prefers it.
