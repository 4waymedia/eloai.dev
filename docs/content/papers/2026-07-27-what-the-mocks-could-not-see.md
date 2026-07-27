# 2026.07.27 — What the Mocks Could Not See: A Green Suite, a Duplicated Parser, and a Test That Asserted the Bug

*Full write-up. The Field Notes teaser of the same title is cut from this. Verification discipline across wonder / mneme / 08; the defects found when a mocked suite was finally pointed at the real encoder and dictionary. Extends the 07.25 finding that a green probe set can test the wrong thing.*

## Problem / context

Two days earlier this project published a finding worth repeating: a **36/36** probe set passed while the module it tested was hardcoded. The conclusion drawn then — *"a test suite that cannot fail for the reason the design would fail is decoration"* — is a good rule, and this paper is what happened when the same family of failure was walked into again from three new directions.

The compound-learning work was built in a sandbox without the project's Python environment: no lmdb, no 2.1GB dictionary, no 793MB index. Every test used mocked `TokenChunk` objects. **26 checks, all green.** The mocks were faithful to the dataclass, the logic under test was real, and the suite was worthless in a specific way that took a real run to expose.

## Background

- **`conjecture_probes.py`** establishes the house pattern: measured checks, real dependencies, clear skips.
- **`08-MCP-ToolInterface/tests/`** (117 tests) and **`Memory/mneme/tests/`** (10) already cover the gateway and encoder.
- **`tool_api._verdict()`** already parses yes/no answers to posed questions, via `_AFFIRM_RE` / `_DENY_RE`.
- **The device bridge** exposes the user's machine, where the real artifacts live — the missing piece was a Python `lmdb` wheel, installable offline.

## Approach

**1. Stop simulating and run against the real system.** A matching manylinux wheel was fetched, transferred, and installed offline into the workspace that has the real repo mounted. The suite went from 26 mocked checks with two skips to **45 checks, zero skips** — real encoder, real dictionary, real store.

**2. Print the mechanism, not the verdict.** A green count says nothing about *why*. A scratch script dumped per-signal state for each test sentence:

```
'It is too late to fix that now.'
  chunks: [('it','H'),('is','F'),('too','M'),('late','H'),('to','H'),('fix','H')…]
    pair 'too late'  A=True B=True (cos=0.4036) C=True  D=False -> CANDIDATE
    pair 'to fix'    A=True B=False(cos=None)   C=True  D=False -> rejected
```

That `C=True` on `to fix` is a bug made visible. A pass/fail count would never have shown it.

**3. Run the tests that already existed.** Before writing any more of our own.

## Data and examples

| suite | before | after |
|---|---|---|
| compound probes (mocked sandbox) | 26 pass, 2 skip | — |
| compound probes (real system) | — | **47 pass, 0 skip** |
| `08-MCP-ToolInterface/tests` | never run | **116 pass, 1 skip** |
| `Memory/mneme/tests` | never run | **10 pass** |
| `conjecture_probes` | — | 36/36 |
| `phrase_miner --selftest` | — | PASS |

Defect 1, Signal C, before and after the fix — the same sentences, the same code path:

```
before:  'to fix' C=True   'that now' C=True   'wash this' C=True
after:   'to fix' C=False  'that now' C=False  'wash this' C=False
         (and 'too late' C=True, 'car wash' C=True — genuine pairs unaffected)
```

Defect 2, the tier claim, measured both ways:

| word | live `classify()` | encoder's chunk (from LMDB) |
|---|---|---|
| `to` | F | **H** |
| `that` | F | **H** |
| `this` | F | **H** |
| `it` | F | **H** |

## What broke

**A defect that mocks could not express.** Signal C checked `assign_facet()`'s *bucket* and passed any word bucketed TOPIC. In the mocks every chunk was hand-built, so the question never arose. Against the real classifier, `assign_facet("to")` returns `bucket=TOPIC, utility=FUNCTION` — the identical bucket to `car`. Only the UTILITY field separates them. Function words were sailing through a check written to exclude them.

**A docstring that confidently described code it had not read.** Signal A's rationale claimed the encoder computes tier via `word_classifier.classify()`. The encoder imports only `get_tier_name`; for dictionary words it reads a prebuilt LMDB template and takes the build-time tier. The claim was plausible, adjacent to true, and wrong — and it had been used to justify a design decision. It is now corrected, and the leak is asserted as a *known condition* so that a future dictionary rebuild which fixes it fails loudly rather than quietly making the docs stale.

**A parallel implementation of something the gateway already owned.** Compound confirmation shipped with its own yes/no parser. `tool_api._verdict()` had done that job for months. The two had already diverged: `indeed`, `spot on`, `you got it` and `not quite` were understood for conjecture answers and silently not for compound answers. Nobody would have noticed until a user said "spot on" to the wrong question. The gateway now calls its own helper first; the compound parser is demoted to the vocabulary `_verdict` has no reason to know (`one thing`, `two things`, `separate`).

**The worst one: a test that asserted the bug was correct.** The suite pinned `too late` as the *expected positive detection*. `too late` is a discourse formula — precisely the false-positive class the whole design was fighting. The assertion had been written while looking at output, judging "the detector fired, the mechanism works", and never asking whether it fired on the *right thing*. The consequence is worse than a missing test: anyone later tightening the detector would have watched that case go red and concluded they had broken something, and the test would have argued them out of a real improvement.

The fix is a genuine compound (`hard drive`, verified end-to-end) as the positive case, plus a **known-false-positive ledger** — `too late` and `sounds good` asserted as *undesired current behaviour*, with the instruction written into the file:

> A failure here is GOOD NEWS: the detector stopped returning a discourse formula. Do not "fix" it by loosening the detector — delete the entry and update the precision figures.

That inverts the meaning of red for those cases, which is the only honest way to keep a measured shortcoming in a suite without laundering it into a specification.

## What we deferred and why

- **A CI harness.** All five suites are run by hand. Real, and out of scope for a session whose subject was the code under them.
- **The vendored `tests/lsdf-core-main/` collection error.** Pre-existing, unrelated (`No module named 'src'`), untouched deliberately.
- **Shrinking the false-positive ledger.** Requires the precision work in the companion paper, which is a product decision rather than a defect.

## Result and consequence

- `VALIDATED` — **Three defects survived a green mocked suite** and were found within minutes of a real run: a bucket-vs-utility confusion, a false docstring claim, and a duplicated parser.
- `VALIDATED` — **126 existing tests covering the modified modules had never been run.** They pass: 116 + 10.
- `VALIDATED` — **The known-false-positive ledger works as a pattern**: measured shortcomings stay visible in the suite without being asserted as correct.
- `REFUTED` — **"The mocks are faithful, so the suite is meaningful."** The mocks were faithful to the dataclass and useless for the questions that mattered, because the defects lived in code the mocks stood in for.

The 07.25 paper found tests that could not fail for the reason the design would fail. This is the adjacent failure: tests that *pass for the wrong reason*, and one that had gone further and encoded a defect as a requirement. The distinction that matters is between mocking your **inputs** and mocking your **collaborators**. Mocking a `TokenChunk` is fine. Mocking `assign_facet` — the thing whose answer the design depends on — removes the only component that could disagree with you, and a test where nothing can disagree is a mirror. The cheapest guard found here is not a framework: it is printing the intermediate state and reading it, once, on real data. Every one of these defects was obvious in a single dump of per-signal verdicts and invisible in a pass count.
