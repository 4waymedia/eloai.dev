# 2026.07.25 — Curiosity Is Knowing Where You Stop: Derived Questions, and a Learner That Checks Its Teacher

*Full write-up. The Field Notes teaser of the same title is cut from this. Wonder + Reflection over the rule learner; the foundational core the whole loop stands on. Companion to the same day's paper on induction by experiment.*

## Problem / context

Once Elo could learn what an operator means, it started asking questions — and they were fake. Taught `1 + 5 = 6`, it asked *"does 2+3+5 = 10?"*: numbers with no relationship to the lesson, because the probes were a hardcoded list (`seq = [2,3,5]`, `fn(3,7)`, `fn(5,0)`). The user's objection was exact: *"why does it come up with the same examples you gave me? That doesn't feel like true curiosity. It feels like a programmed response."*

Randomizing the numbers would have been cosmetic. The real defect was that the questions were **a checklist, not a derivation** — nothing about them came from what the system had or hadn't seen. And the same missing representation produced a worse bug: asked to compute `2 + 3 + 5` after being taught only a binary rule, it answered **8**, silently, because it had no idea its knowledge was binary-only.

Those two failures — canned curiosity and confident overreach — have **one root**: the learner had no map of its own competence.

## Background

Two things already existed and did the load-bearing work:

- **The rule learner** (companion paper) — hypothesis space, discriminating experiment, symbol→operation binding. It knows *what* it learned.
- **The gateway turn** — deterministic dispatch of teach / answer / query, server-side, no LLM.

What was missing sat between them: a representation of *what the evidence actually covered*, and priors saying which dimensions exist to be covered at all.

## Approach

**1. State the foundations.** Every wall hit while teaching arithmetic was a missing prior, so we wrote them down — 17, in four domains, each with the failure it prevents:

```
LOGIC      sameness · negation · implication · generality · hypothesis_space
QUANTITY   number · zero · sign · magnitude
STRUCTURE  token_role · denotation · arity · composition · grouping
TIME       before_after · persistence · revision
```

The rule at the top of the file matters as much as the list: *only concepts presupposed by learning itself belong here; anything teachable is knowledge, not a prior.* Growing this per failure is how a project slides into hand-authored whack-a-mole.

**2. Track evidence, derive gaps.** The learner records which regions each observation covered, then reports what is *untested*:

```python
def _observe(self, sym, a, b):
    e["signs"].add("negative" if v < 0 else "positive")
    e["magnitudes"].add("large" if abs(v) >= 100 else "small")
    e["orders"].add((a, b)); e["has_zero"] |= (v == 0)

def gaps(self, sym):        # -> ['composition','zero','sign','magnitude','order']
```

**3. Build each question from the user's own lesson.** Curiosity anchors on the numbers actually taught:

```python
a, b = self.evidence[sym]["operands"][-1]          # the latest lesson
if gap == "composition": question = f"does {a}{sym}{b}{sym}{third} = {v}?"
if gap == "sign":        question = f"does it still work below zero — is {a}{sym}({nb}) = …?"
```

**4. Refuse what hasn't been earned.** `compute_seq` will not fold an n-ary expression until chaining is confirmed — the scope card is the honesty guard.

**5. Check the teacher.** Every posed probe carries what Elo *expects* under its own rule. A verdict that contradicts it raises a surprise rather than being absorbed.

**6. Let the teacher direct the learning.** `"I only want you to verify twice"` sets a probe budget; unasked edges stay open and reportable, never silently marked confirmed.

**7. Think across rules.** `reflect()` compares scope cards to each other rather than examining one rule at a time.

## Data and examples

**Curiosity is now derived — different lessons produce different questions:**

| Taught | Elo asks |
|---|---|
| `1 + 5 = 6` | does 1+5+5 = 11? · is 1+0 = 1? |
| `7 + 2 = 9` | does 7+2+2 = 11? · is 7+0 = 7? |
| `20 + 30 = 50` | does 20+30+30 = 80? · is 20+0 = 20? |
| `4 * 3 = 12` | does 4\*3\*3 = 36? · is 4\*0 = 0? |

Two probe types appeared that no hardcoded list had — **negatives** and **large magnitudes** — because the *foundations* name sign and magnitude as dimensions and the evidence had never touched them.

**The honesty guard, before and after earning chaining:**

```
before:  "what is 2 + 3 + 5?"  ->  I've only learned '+' for two numbers;
                                    I don't know yet whether it chains.
after:   "what is 2 + 3 + 5?"  ->  2 + 3 + 5 = 10.
```

**Checking the teacher** (the user answered a true claim with "no", deliberately):

```
ELO: does 2+8+8 = 18?
YOU: no
ELO: That surprises me — I work it out as 2+8+8 = 18, so I expected 'yes'.
     You said 'no'. Am I wrong, or was that a slip?
YOU: I slipped, good catch
ELO: Thanks — I'll take my reading then. [continues with the next probe]
```

It does not cry wolf: answering "no" to *is 5-1 the same as 1-5?* matches its computation, so no surprise fires.

**Teacher-directed learning:** probes asked per rule went **5 → 2** after *"I only want you to verify twice"*, with `negatives, large, commutes` left open and still reported as unknown.

**Thinking across rules** — after learning `+`, `-`, `*`:

> *"'+', '-', '\*' all chain — I can fold any of them over a list. '+', '\*' give the same answer either way round, but '-' does not — order matters for some operations and not others. '+', '-', '\*' each have a number that leaves the other unchanged."*

Nobody taught any of that. Elo derived **identity elements** and the **commutative/non-commutative distinction** by comparing its own scope cards.

**Curiosity that resolves.** Meeting `5 + 5 - 1` for the first time, it recognizes familiar parts in a new arrangement, asks, and — once answered — stops asking: `10 + 4 - 2` is answered directly ("left to right, as you confirmed").

## What broke

**The probes were a checklist and we shipped it as curiosity.** Worse than cosmetic: because the numbers were fixed, the questions were *unrelated to the lesson*, which is exactly what made it feel mechanical. The fix was not randomization but derivation — the questions had to come from a representation of coverage that did not exist yet.

**Confident wrong answers before the scope card.** `2 + 3 + 5 → 8`. A binary rule silently applied to three operands. The system had no way to know it was overreaching because it had no notion of arity as a dimension of its own competence.

**Natural affirmations were silently discarded.** The confirm pattern only matched at the start of a turn, so *"you are correct."* and *"I slipped. good catch"* fell through as ordinary statements. Elo asked a good question, the user answered it clearly, and the learning **was thrown away** — twice in one session, including a structure it had just wondered about. Confirmation is part of the learning loop; matching it narrowly loses knowledge invisibly.

## What we deferred and why

- **Precedence as a probeable dimension.** A user confirmed `5 + 2 - 1 * 2 = 12` (left to right); standard precedence gives 5. With no precedence prior, Elo cannot question it.
- **Emitting edges as `wonder_question` seeds** so open questions appear in the browser's reflection panel. The seed mechanism exists; the curiosity currently surfaces in conversation only.
- **General third-person anaphora.** The discourse work covers recency + type ("use it", "add them"); pronouns with named antecedents still need the participant roster.

## Result and consequence

- **VALIDATED** — curiosity is derived from evidence gaps against the foundational core: different lessons yield different, lesson-anchored questions; negative and large-magnitude probes emerged from the priors rather than a list.
- **VALIDATED** — the scope card doubles as an honesty guard (`2+3+5` refused until chaining is earned) and as introspection ("can you add multiple numbers?" answered from it, including what remains unknown).
- **VALIDATED** — Elo detects a teacher's contradicting verdict, reports it, and accepts a concession without absorbing the error; probe budget honored 5 → 2 with unasked edges kept open.
- **VALIDATED** — cross-rule reflection surfaced identity elements and the commutativity distinction, neither of which was taught.

The consequence is the sentence in the title: the same representation that lets Elo *refuse* what it hasn't earned is what lets it *wonder* about it. A map of your own competence has two edges — the inside, where you can answer, and the outside, which is exactly what there is to be curious about. Build one and you get honesty and curiosity from the same structure; skip it and you get confident wrong answers and canned questions, which is what we shipped first.
