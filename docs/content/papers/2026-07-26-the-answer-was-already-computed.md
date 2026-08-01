# 2026.07.26 — The Answer Was Already Computed: Five Fixes That Consumed What the System Already Knew

*Full write-up. The Field Notes teaser of the same title is cut from this. The
reply chain from the browser console through recall to composition — the
substrate the teaching-loop paper (2026.07.31) and the verbalizer-ops packaging
(2026.08.01) both stand on.*

## Problem / context

Asked **"If the car wash is 100 feet away, should I drive my car there or
walk?"**, the system answered: *"From what you have told me: 'free from dirt -
means there is no dirt'."* Grounded on a real seed, cited, and confidently
irrelevant — a definition of a semantically adjacent noun offered as a decision
aid. Worse: this happened **after** connecting the memory gateway to a browser
whose local replies had been serviceable. Connecting more machinery made the
answers worse — a double step backward, in the owner's words.

The eventual diagnosis made the failure interesting rather than embarrassing:
at five separate layers, the information needed for the right answer was
**already computed** — shipped in the dictionary, returned by a function,
carried on a struct — and the consumer at that layer used something cruder
instead. Nothing needed inventing. Five things needed consuming.

## Background

- **The cue mask.** `facets.bin` ships a 16-bit logic-cue mask (CONDITION,
  MODAL, QUESTION, COMPARISON…) over 304 curated surfaces. The reply path chose
  its template on `query.endswith("?")`.
- **The utility bit.** `assign_facet` returns a CONTENT/FUNCTION verdict per
  surface. Recall filtered function words with a hand-written 41-word stoplist.
- **`match_count`.** The recall ranker computed how many query surfaces each
  candidate seed matched, carried it onto the ranked result — and sorted
  without it.
- **`grounded_diag.py`** — built for this work: per turn, the shape read, every
  recall candidate with its score, and the final reply. The instrument that
  turned "the replies feel wrong" into rankings that could be read.

## Approach

Five consumers, in the order the transcripts forced them:

1. **The browser floor rule.** The console had been *overwriting* its local
   reply with the gateway's — and on an empty recall, overwriting both with a
   hardcoded string chosen by a third punctuation check. New contract: the
   local read is the floor; the gateway only ever raises it.
2. **Read the shape.** `read_shape` classifies the turn from its cue mask —
   `modal_choice` with options `(drive, walk)` and subject `car wash` — and the
   empty-recall reply composes in that shape instead of one generic sentence.
3. **Ask the dictionary, not a list.** Recall's content filter became the
   utility bit:

   ```python
   def _is_function_word(w):          # MEASURED 2026-07-26
       util = (_assign_facet(w)[2] & 0xC0) >> 6
       return util != 0               # 0 == CONTENT
   ```

   The 41-word stoplist contained neither `there`, `your`, nor `means` — all
   FUNCTION per the dictionary. *"free from dirt - means there is no dirt"* had
   won recall on `there` + `means` and nothing else.
4. **Coverage breaks ties.** One line — sort by `(-final_score, -match_count,
   epa_distance)` — so a seed matching four query surfaces outranks one
   matching two at the same score.
5. **Compose, don't quote.** The grounded reply places the recalled fact inside
   the question's shape and names only the genuinely open part — then the
   intent guard (2026-07-31 rung) forbids *"nothing I have stored says how you
   weigh that"* whenever a seed saying it sits in the recall set.

The governing constraint: consume what is already computed before building
anything new. Every fix above is a read of an existing value.

## Data and examples

The user's own retest provided a controlled experiment: the same question
phrased twice, differing only by *"my car there"*.

| phrasing | top recall hit (before fix 3) |
|---|---|
| "…should I drive **my car there** or walk?" | *"free from dirt - means there is no dirt"* (via `there`) |
| "…should I drive or walk?" | *"'100 feet' — what is meant by that?"* then the definition seed |

Dropping one function word from the query changed the answer entirely — the
signature of recall keyed on words that carry no content. After fixes 3–4, both
phrasings produce identical surfaces and the distance fact
*"You are 100 feet from the car wash."* (4 matches) rises past the definition
seed (2 matches) from a tie at 0.5.

Reply evolution across the chain, same question:

> **Before:** From what you have told me: "free from dirt - means there is no dirt"
> **After 1–4:** From what you have told me: "You are 100 feet from the car wash."
> **After 5:** You told me: "You are 100 feet from the car wash." Between drive
> and walk — nothing I have stored says how you weigh that. What matters to you here?

Reply-shape probes: **3/10 → 10/10** across the chain (grown to 11/11 with the
teach case, per the 07.31 paper). Gateway suite held green at every step —
126/126 then, 145/145 now.

## What broke

- **A global replace broke the wrong function.** Fix 4's sort edit was applied
  with `str.replace` — global — and the identical sort line existed in
  `rank_field`, whose result type has no `match_count`. Six tests went red
  immediately. The suite caught it; had it not, a "one-line fix" would have
  shipped a broken ranking engine under a confident summary.
- **The diagnostic lied first.** `grounded_diag` printed `score=?` for every
  candidate and its author concluded "recall returns no scores." The field is
  `verbal_score`; the script read `score`. The instrument had to be debugged
  before the system could be — and the wrong conclusion was already written up.
- **Shapes leaked onto statements.** Claiming a `shape` on every reply made the
  browser route plain teaches to the gap template: *"I want you to be able to
  know and understand me"* answered with *"I have nothing stored about that
  yet."* Rule kept: a shape is reported only when it changed the reply.
- **The comparison read the wrong operand.** *"Is a hard drive faster than a
  car wash?"* extracted `faster` as the left term — nearest content word to
  `than` — when the subject leads the clause. Nearest is not leftmost.

## What we deferred and why

- **`why` is missing from the CAUSE cue lexicon.** Adding it to the seed list
  would desynchronize runtime `assign_facet` from the prebuilt `facets.bin`
  until a rebuild — so the wh-surface is read at the call site and the lexicon
  fix is filed for the next dictionary build. Filed, not patched.
- **Enumerable questions.** *"What do you know about Paul?"* should synthesize
  every relevant seed, not serve the top one; the existing enumerable regex
  does not match the phrasing. Scoped to its own pass.
- **The inference to "drive."** Wanting the car washed plus the definition of a
  car wash *derives* the car must travel — a licensed reasoning chain (R1),
  never a template's leap. The composed reply asks instead of pretending.

## Result and consequence

- **VALIDATED** — the five-fix chain, each against a live transcript;
  reply-shape probes 3/10 → 10/10; both drive/walk phrasings converge to the
  same recall surfaces and the same shaped reply (transcripts 2026-07-26).
- **VALIDATED** — coverage tiebreak prediction confirmed on the user's next
  fresh-store run (the distance fact moved rank 4 → served).
- **REFUTED** — "recall returns no scores": the instrument's own bug.

The consequence is the substrate under everything since: shaped replies made
the teaching loop possible (a gap said *in the shape of the question* is what a
user can answer — the 2026.07.31 paper), and the ladder's rungs are what the
verbalizer ops package into portable form (2026.08.01). The pattern is the
durable lesson: before building a capability, check whether the system already
computes it and nothing listens.
