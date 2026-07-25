# 2026.07.25 — Learning What "+" Means: Induction by Experiment, Not Symbol Lookup

*Full write-up. The Field Notes teaser of the same title is cut from this. Wonder faculty, first substrate; the deterministic learner behind the browser's teaching loop. Companion to the same day's paper on derived curiosity.*

## Problem / context

We wanted Elo to learn arithmetic from a teacher in conversation — not to have arithmetic. The test is small and unforgiving: type "2 + 2 = 4" into the browser and see whether the system ends up able to answer "what is 4 + 12?" without a language model anywhere in the loop.

The first version looked like it worked. Taught `2+2=4`, it replied *"If 2+2=4, does 3+3=6?"*, and on "yes" it could compute new sums. It was a fake. The operation was **hardcoded**: a table mapped `'+'` to Python's `add`, so the system recognized a known symbol and applied a built-in evaluator. It never learned anything. The user's verdict was blunt and correct — *"we created the same 'mess' that the LLMs do... our formula failed."*

That diagnosis is worth stating precisely, because it is the same hollow center in both systems: **an LLM has the rule baked into weights; ours had it baked into a lookup table. Neither induced it from the example in front of it.** For a project whose thesis is *learns from interaction*, generalization carried entirely by a prior we shipped is not learning. As induction, the first formula is **REFUTED**.

## Background

The scaffolding was sound and survived the rebuild:

- **A pose-then-ask loop** — the conjecture is put as a *question* ("does 3+3=6?"), never asserted, because induction is a guess and one example never establishes a rule.
- **Grounding** — refuse to build on a lesson that does not compute (`2+2=5`).
- **The gateway turn** (`memory_reply`) — where a taught fact, an answer, and a query are dispatched, deterministic and server-side.

What had to be thrown away was the core: "read the operator, apply the operator."

## Approach

**1. Replace the answer with a space.** From one example, learning the rule is *impossible* — infinitely many functions map (2,2)→4. So the learner holds every hypothesis in an explicit, legible library that fits the observation:

```python
HYPOTHESES = [("addition", lambda a,b: a+b), ("subtraction", …), ("multiplication", …),
              ("first squared", …), ("power", …), ("doubled sum", …), ("max", …)]

def teach(self, a, sym, b, c):
    fits = {n for n, fn in HYPOTHESES if _safe(fn, a, b) == c}   # 2+2=4 -> add, mul, sq, power
```

The operator symbol is captured as an **opaque token**. Nothing says `'+'` means addition.

**2. Ask the question that discriminates.** Rather than restating the example, search a small grid for the operand pair whose predictions most *split* the survivors — a real experiment:

```python
def _discriminate(self, cands, seed):
    best = None
    for a2 in range(1, 12):
        for b2 in range(1, 12):
            preds = {n: _safe(_FN[n], a2, b2) for n in cands}
            score = (len(set(preds.values())), -(a2 + b2))      # maximal split, small numbers
            if best is None or score > best[0]:
                best = (score, a2, b2, preds)
```

For `2+2=4` that yields *"does 2+3 = 5?"* — where add(5), mul(6), square(4) and power(8) all disagree.

**3. Prune by evidence, and bind only when one survives.**

```python
if verdict:   keep = {n for n in cands if preds[n] == posed}      # "yes"  -> 5 -> addition
elif value:   keep = {n for n in cands if preds[n] == value}      # "no, it's 6" -> multiplication
```

Only when a single hypothesis remains does the learner bind the symbol — and *then* it is operational: it can compute unseen inputs and generate fresh examples.

**4. Say what the bias is.** The hypothesis library is the inductive bias, and it is stated in the open at the top of the file. You cannot induce from nothing; every learner has priors. The difference from the failed version is that the bias is *a space searched with evidence*, not *a single answer assumed*.

## Data and examples

Learning outcomes, from real runs of `wonder/rule_induction.py`:

| Taught | Questions asked | Learned |
|---|---:|---|
| `2 * 2 = 4` (ambiguous: add, mul, sq, power) | 1 | multiplication |
| `3 * 4 = 12` (uniquely fits) | **0** | multiplication |
| `10 - 4 = 6` | 0 | subtraction |
| **`3 @ 4 = 7`** (symbol never seen before) | 0 | **addition** |
| `2 ? 2 = 5` (nothing fits) | — | **rejected**, no fabrication |

The fourth row is the proof the old trick is gone: **`@` is not in any table.** The learner worked out what an unknown symbol denotes from a single example by searching its hypothesis space. A hardcoded operator map cannot do that.

And the capability the failed version never had — using the rule:

```
YOU: what is 4 + 12?          ELO: 16
YOU: give me another example  ELO: 7+5 = 12
```

Live in the browser, over the gateway, a user taught three operations in one session and the system reported: `'+' means addition`, `'-' means subtraction`, `'*' means multiplication` — each learned from a single example plus confirmations. Gateway resident memory during this: **90 MB**.

## What broke

**We shipped fake induction and called it curiosity.** The first `inductive_conjecture` module passed a 36/36 probe set — every check green — while the thing it claimed to test was hardcoded. The probes measured that the *plumbing* worked (parse, predict, pose, refuse a bad lesson) and never asked the one question that mattered: *did it learn the operation, or recognize it?* A test suite that cannot fail for the reason the design would fail is decoration. The user caught it by reading the output, not the tests.

**The user's probe found the second hole.** Asked to compute `2 + 3 + 5`, the system returned **8** — silently. The parser was binary-only and grabbed the rightmost pair, dropping the leading `2 +`. Not a refusal: a confident wrong number, the exact failure mode this project exists to avoid. The fix was a scope guard (below), but the lesson is that the boundary of a learned rule has to be *represented*, or it cannot be respected.

**Equal operands can't test order.** Taught `4 * 4 = 16`, the commutativity probe never fired — the generated question would have been "is 4\*4 the same as 4\*4?", which decides nothing — so the property stayed permanently unknown and the system reported "I still don't know about: commutes" forever. Now the probe varies the second operand.

## What we deferred and why

- **Precedence.** With `+`, `-` and `*` learned, a user confirmed `5 + 2 - 1 * 2 = 12` folding left to right. That conflicts with standard precedence (conventionally 5). Elo has no precedence prior, so the teacher is the authority and the wrong rule was accepted. Making precedence a *probeable dimension* ("does `*` come before `+`?") is the honest fix, and it is not built.
- **Non-arithmetic relations.** The same machinery should extend to any `(a, relation, b) → c` fact, but only arithmetic has an evaluator today.
- **Hypothesis library growth.** Seven candidates is deliberately small. Growing it per failure is how this slides back into a hand-authored expert system.

## Result and consequence

- **REFUTED** — the first formula's "generalization" was symbol lookup over a hardcoded operator table, not induction.
- **VALIDATED** — the rebuilt learner identifies an operation by discriminating experiment, learns a **symbol it has never seen** (`3 @ 4 = 7` → addition), asks **zero** questions when one hypothesis already fits, prunes correctly from a corrected answer, and refuses lessons that do not compute.
- **VALIDATED** — once learned, the rule is operational: unseen inputs computed (`4 + 12 = 16`), fresh examples generated, three operations learned in one live browser session at 90 MB resident.

The consequence is a learner whose knowledge is *earned and legible*: you can read its entire inductive bias in one list, watch which hypothesis each answer eliminates, and see exactly when it commits. That is a different foundation from a model that has absorbed arithmetic implicitly and cannot tell you which prior it is using — and it is the floor the companion paper builds curiosity on.
