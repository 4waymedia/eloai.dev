# EloAI Field Notes — Blog Post Creation Guide

This document defines the exact format, voice, and rules for writing posts in the EloAI Field Notes blog (`website/assets/discoveries.md`). Any AI system generating posts must follow this spec. The three generic content guides in `docs/technical/` describe a different, incompatible style — ignore them for Field Notes posts.

Each Field Notes entry is the **teaser for a full paper**. See *The two-tier model* below before writing either one.

---

## The two-tier model: paper, then teaser

Every topic produces two artifacts, written in this order:

1. **The paper** — the full write-up. Complete background, the approach in reproducible detail, every example and number, the dead ends, and what was deferred. It lives in `docs/content/papers/` as `YYYY-MM-DD-kebab-title.md`. No length cap; completeness over brevity. This is the record a technical reader uses to reproduce or audit the work. Spec in *The full paper* below.

2. **The teaser** — the Field Notes entry in `website/assets/discoveries.md`. 250–400 words, all the rules in this guide. It does **not** summarize the paper evenly. It **leads with the gotchas, the failures, and the approach** — the moments that make a technical reader want the full account. Every hook in the teaser is a true fact that survives the paper; teasing is not embellishing.

**Write the paper first. The teaser is cut from it**, not the reverse — so the teaser cannot promise anything the paper does not deliver.

The Field Notes parser supports no links, so the teaser cannot hyperlink the paper. Join them by string instead: the paper's H1 matches the teaser's title verbatim (same date, same words). A teaser may close by pointing at the paper in prose ("The full write-up has the rest: …") naming the specific threads it left hanging.

---

## What the Field Notes blog is

Short, technically precise entries from an independent AI research lab. Written after a session of real work. Reads like a lab notebook crossed with a software changelog — not a thought-leadership article, not a tutorial, not a LinkedIn post.

The audience is technically sophisticated. They notice when numbers are missing. They notice when language hedges.

---

## Format specification (parser-compatible)

The blog is rendered by `website/blog.html`, which parses `website/assets/discoveries.md` with a simple Markdown parser. The parser supports **only** these two inline elements:

- `**text**` → renders as `<strong>` (styled green accent color)
- `*text*` → renders as `<em>` (styled white italic)

**Do not use:** headers (`##`), horizontal rules inside a post, blockquotes, code fences, bullet lists, numbered lists, tables, links, or HTML. The parser will not render them correctly.

### Entry format

```
# YYYY.MM.DD — Title of the Post

Opening paragraph.

Second paragraph.

Third paragraph. **Key claim in bold.** More text.

---
```

- Header: `# YYYY.MM.DD — Title` — exactly one `#`, a space, then the date, then ` — ` (space-em-dash-space), then the title. No subheadline.
- Entries are separated by `\n---\n` (newline, three dashes, newline).
- New posts go at the **top** of the file, before existing entries.
- Multiple posts on the same date are allowed — each gets its own entry.

---

## Length

**250–400 words per post.** 3–6 paragraphs.

This is a hard constraint, not a target. If it runs longer, cut. The blog is not the place for exhaustive documentation — it is the place for the result and what it means.

---

## Structure

Every post follows this shape, in this order:

1. **The problem or failure mode** — what was broken, missing, or unknown. One to three sentences. Do not open with the solution.
2. **What we did** — the approach, with enough technical detail to be reproducible in principle. Use "We" throughout.
3. **The measured result** — at least one concrete number. Not "significantly better" — "6.6 → 9.1 MB/s (+39%)."
4. **What this means or what comes next** — one short paragraph. Not a summary of what you just said. The consequence, the gap that remains, or the next decision forced by this result.

The structure does not need to be labelled. It should flow as prose.

---

## The full paper

The paper is the complete account the teaser points to. It has no word limit and is written for a reader who wants to reproduce or audit the work.

**Location:** `docs/content/papers/YYYY-MM-DD-kebab-title.md`. Its H1 matches the teaser title exactly (date included), so the two are joinable by string.

**Format:** unlike the teaser, the paper **may** use the full Markdown feature set — headers, code fences, tables, lists, links — because it is not rendered by the Field Notes parser. Measurement tables, worked examples, and code excerpts are expected, not optional.

**Required sections, in order:**

1. **Problem / context** — what was broken, missing, or unknown, and why it matters. Same discipline as the teaser: problem before solution.
2. **Background** — the prior state, the relevant modules, the constraints. Enough that the result is legible without the codebase open.
3. **Approach** — what we did, in reproducible detail. Name modules, functions, thresholds, data sources.
4. **Data and examples** — the concrete evidence. At least one worked example carried end to end, and the measurements in a table. Show inputs and outputs verbatim where it helps.
5. **What broke** — the failures, dead ends, and surprises, stated plainly. This is not an appendix; it is the most valuable part and the source of the teaser's hooks.
6. **What we deferred and why** — the deliberate non-decisions, tagged so they are not mistaken for oversights.
7. **Result and consequence** — what now holds, each claim tagged **VALIDATED** / **REFUTED** / **UNVERIFIED**, and what it forces next.

The radical-honesty rules below apply to the paper too, amplified: the paper is where negative results and corrections live in full, with the evidence attached.

---

## Voice

**First-person plural always.** "We built," "We tested," "We were wrong." Never "I."

**Declarative, not hedged.** Write what happened, not what might have happened. "The gate caught it" not "The gate appears to have caught it."

**Terse.** Cut connective tissue. "The fix is straightforward:" then the fix. Not "After careful analysis, we determined that the most effective approach would be to…"

**Technical precision over accessibility.** Name the modules, the line counts, the thresholds, the correlation coefficients. A reader who doesn't know what LMDB is can look it up.

**No hype language.** Words and phrases to never use: *exciting*, *powerful*, *revolutionary*, *groundbreaking*, *game-changer*, *state-of-the-art*, *innovative*, *seamless*, *robust*, *leverage* (as a verb), *dive into*, *in today's world*.

**No calls to action.** No "read more," no "follow us," no "if you enjoyed this," no questions directed at the reader.

---

## Radical intellectual honesty (required)

This is a core editorial principle, not optional flavor.

- Publish negative results. If the hypothesis was wrong, say so. "We expected 3× improvement. We got 1.15×."
- Correct the record explicitly. If a prior post stated something that turned out to be false, write a post that says so: "The 2.35× figure in the June 12 post was a measurement error. The correct figure is 1.15×."
- Tag confidence level when a result is preliminary. Use **VALIDATED**, **REFUTED**, or **UNVERIFIED** in bold when a specific claim has been checked — or not yet checked — against real data.
- Explain what you deliberately did not do, and why. Deferred decisions are not failures.

---

## Bold — what to accent and when

`**bold**` renders in green and draws the reader's eye. Use it for:

- Key numerical results: `**6.6 → 9.1 MB/s (+39%)**`
- Critical claims or conclusions: `**meaning is stored, not computed**`
- Named findings when introduced: `**the lookup count, not the lookup cost**`
- Structural labels that break a list-like paragraph: `**Compositional inheritance.**` followed by the explanation

Do not bold: random emphasis, adjectives, company names, section introductions, or anything in the first sentence of the post.

Aim for 2–5 bolded items per post. Zero is wrong (the post looks unstyled). Eight is too many (nothing stands out).

---

## Titles

Titles are technical and descriptive. They tell the reader what happened, not why they should care.

**Good title patterns:**
- Result-first: `Phrase Affect Coverage: 0% to 97.8% Without a Model Call`
- Architectural contrast: `Vector Addition as the Inference Engine`
- Version milestone: `v0.1.0: Eight Systems Implemented, Five Tests Pass, Pipeline Runs End-to-End`
- Named concept introduced: `Logic Matrix: The Filtering Layer That Makes Attention Computable`

**Avoid:**
- Clever or punny: `We Taught Our Dictionary to Feel` — too cute
- Vague: `A Big Step Forward for EloAI`
- Clickbait questions: `Is This the End of LLM Tokenizers?`
- Hype superlatives: `Breakthrough in Semantic Compression`

The title may contain a colon, a number, or a metric. It should not contain an exclamation point.

Do not avoid hyphens in titles — the blog parser splits on em-dashes (`—`), not regular hyphens. Hyphens in titles are fine.

---

## Common mistakes

| ❌ Wrong | ✓ Right |
|---|---|
| Opens with the result | Opens with the problem |
| "I built..." | "We built..." |
| No numbers | At least one concrete metric |
| Long paragraphs covering multiple ideas | Short paragraphs, one idea each |
| Summarizing at the end | Ending with a consequence or what's next |
| Subheadings (`## Section`) | Prose with bolded lead-ins |
| CTA / "follow us" / questions to reader | None of those |
| Hedged language: "seems to," "might be" | Declarative: "is," "was," "did" |
| Generic title: "An Update on Our Research" | Specific title with result or concept |

---

## Worked example

**Prompt given to an AI:** *We found that adding lemmatization before the dictionary lookup improved phrase coverage from 74.3% to 97.8% and cut the residual needing AI from 167,000 entries to 3,645.*

**Wrong output (generic blog style):**
> ## Exciting Breakthrough in Our Affect Coverage Pipeline!
> I'm thrilled to share an update on our semantic compression work. After extensive research, we discovered that lemmatization could have a significant impact on our phrase coverage. This game-changing finding…

**Correct output (Field Notes style):**
> Phrase coverage had plateaued at 74.3% after compositional inheritance and the initial lexicon merge. The residual — phrases with no affect score at all — was still 167,000 entries. Sending that volume to a language model is expensive, non-deterministic, and not reproducible.
>
> The fix was a single rule-based step: lemmatize before lookup. "Running" inherits from "run." No model involved. Phrase coverage: **74.3% → 97.8%**. The residual that actually requires an AI call: **3,645 entries** — down from 167,000.
>
> The structure did the work. The model is now a last-resort scalpel rather than the primary instrument.

---

## Pre-publish checklist

Before adding a post to `discoveries.md`:

- [ ] A full paper exists in `docs/content/papers/` and its H1 matches this teaser's title verbatim
- [ ] The teaser leads with a gotcha, failure, or approach — not an even summary of the paper
- [ ] Every hook in the teaser traces to a section of the paper (no claim the paper doesn't back)
- [ ] Header format is exactly `# YYYY.MM.DD — Title` (one `#`, space-em-dash-space)
- [ ] 250–400 words
- [ ] Opens with a problem or missing piece, not the solution
- [ ] Contains at least one concrete number or measurement
- [ ] Uses "we" not "I"
- [ ] 2–5 items in `**bold**`
- [ ] No subheadings, no bullet lists, no links, no HTML
- [ ] Ends with consequence or what's next — not a summary
- [ ] No hype language, no CTA, no reader-directed questions
- [ ] Negative results or corrections are stated directly, not softened
- [ ] Post added at the **top** of `discoveries.md`, above the previous most-recent entry
- [ ] New entry followed by a blank line, then `---`, then a blank line before the next entry
