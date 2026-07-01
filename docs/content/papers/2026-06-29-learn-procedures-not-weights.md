# 2026.06.29 — Learn Procedures, Not Weights

*Full write-up. The Field Notes teaser of the same title is cut from this.*

## Problem / context

Contemporary AI installs a new skill by nudging billions of opaque parameters, usually
from thousands of examples. That is powerful and also costly, non-reproducible, and a
black box in the hot path. We are building the alternative: if a system has a stable,
reproducible semantic substrate — a representation that does not drift — then "knowing
how to do X" can be a **procedure expressed in that representation**, explicit and
editable, rather than a pattern distilled into weights. We call such a procedure a
**formula**, and the claim is that for a large class of tasks this representation is
preferable because it is auditable, data-efficient, and fails legibly.

## Background

There are three ways to install a behavior. **Fine-tuning** adjusts weights from many
labeled examples — opaque, costly, irreproducible. **In-context prompting** describes the
behavior to a capable model — flexible, but the reasoning still happens in opaque weights
and can't be inspected or improved on its own. **Explicit procedures** represent the
behavior as a readable artifact the system executes — auditable and editable, bounded by
the expressiveness of the procedure language and the substrate beneath it. This is the
same pattern already load-bearing in production agentic systems, where a highly capable
model is *directed* by explicit instruction files rather than retrained per behavior —
external evidence that "capable substrate + explicit, editable direction" is a real
architecture, not a toy.

## Approach

A formula is a declarative artifact with a fixed schema: `name`, `intention` (the
selector target), `kind` (generative | analytic | interactive | reflective), router
`signature` prototypes, `slots`, ordered `steps`, measurable `success` criteria,
`provenance`, `confidence`, `status`. Steps are not code; each names a `stage`, an `op`
from a **closed vocabulary**, its inputs/output, and a **compute tier** (0 = deterministic
local, 1 = substrate, 2 = language model). The vocabulary spans gather (`parse`, `recall`,
`resolve_scope`), analyze (`classify`, `detect_boundary`, `cluster`, `infer`), compose
(`label`, `structure`, `decompose`, `verbalize`, `select`), interact (`propose_choice`,
`propose_plan`), and validate (`validate`, `flag`). The authoring rule — *push every step
to the lowest tier it can run at* — makes the vocabulary simultaneously the procedure
contract and the cost-control mechanism. New ops are added deliberately, never invented
inline.

The system runs a loop: a few-shot prototype router **selects** the formula for an
intention; the engine **executes** the steps over the working context into an auditable
trace; measurable criteria **score** the result; and a reflection loop **learns** — it
updates confidence, refines step order and parameters, and induces new formulas from
recurring successful traces. Learning is refinement and induction over *procedures*, not
weight updates. Formulas compose (a `decompose` op calls another formula, forming a task
tree) and must terminate at primitive ops within a budget; no cycles.

## Data and examples

`segmentation_formula` (companion paper, same date) is a fully realized instance: an
analytic formula `encode → detect_boundary → structure → decompose → label → validate`,
all tier-0 in its baseline. It is readable (six named steps), runs offline in pure
standard library, is improvable by one interpretable parameter, and is judged
intrinsically. Empirically it recovered approximately human chapter granularity on a real
document with no supervision. It demonstrates the representation is not a notation but an
executable, scorable, refinable artifact.

## What it means

Data efficiency: a few authored steps and a handful of router prototypes, not thousands
of labeled examples, because the substrate already supplies the representation. 
Auditability: every step and its inputs/outputs are inspectable — the procedure explains
itself, unlike a chain-of-thought a model may not have followed. Editability and graceful
failure: when a formula is wrong you open it and fix a step or a knob; you do not retrain
and hope. Cost and privacy: tiering pushes most steps to deterministic local execution; a
model is spent only at flagged steps. The trade is real — a formula is *direction*, not
power, and its ceiling is the substrate beneath it.

## Limitations

Induction is unproven: confidence updates and parameter refinement are tractable, but
inducing a genuinely new formula from traces is the open research edge — the loop is
specified, not yet demonstrated end-to-end. The reasoning rules themselves stay
human-authored (meta-learning them is out of scope). Behaviors that can't be written as
ordered steps over the op vocabulary aren't formulas yet — they need a new op or a model
escalation. And for tier-2-heavy generative formulas, much of the quality still comes from
the escalated model; the formula governs structure, not eloquence.
