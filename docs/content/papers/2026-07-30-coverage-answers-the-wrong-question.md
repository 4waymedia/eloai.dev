# 2026.07.30 — Coverage Answers the Wrong Question: A Page at 98% Coverage That Expands

*Full write-up. The Field Notes teaser of the same title is cut from this. semantic_compression S1, measuring what dictionary build `elo-browser-v01b` bought over `elo-browser-v01a` on captured web pages. Companion to "The Delimiter Had No Id", which covers the same build's correctness result.*

## Problem / context

`elo-browser-v01b` was built to close a vocabulary hole: structural characters that captured web pages use constantly and the conversational corpus never contained. Article pages improved as intended. Then a Google results page came back at a **0.75x ratio with 98% coverage**, and the two numbers looked contradictory. If nearly every token resolves, what is costing the bytes?

They are not contradictory. They are answers to different questions, and only one of them was being asked:

```
coverage  = "did we find an id?"
economics = "did the id save a byte?"
```

Coverage was the metric we had, so it was the metric we reasoned with. It cannot see this failure, because a token that resolves perfectly can still expand the output. That gap matters beyond one page: coverage is the number that gets quoted when deciding whether a dictionary is good enough for a target.

## Background

- **`elo-browser-v01b`'s structural floor** — eleven surfaces forced into every profile cut, which is what produced the gains measured here.
- **The stream cost model**, already implicit in `compressor.py`: a text stream pays `len(id) + 1` per token — the id plus one delimiter — against `len(surface)` in the source.
- **`OOV:A:` byte-fallback** — 7 characters for an unknown token, the penalty the floor was built to remove.
- **Captured page samples** in `semantic_compression/data/samples/` — real pages, not synthetic fixtures.

## Approach

1. **Encode against the profile cut, not the LMDB.** The database holds 437,995 entries; the browser loads the `full` cut of 261,872. Measuring against the database overstates coverage, because it counts surfaces the encoder cannot reach.

2. **State the break-even explicitly.** For each token:

```
net = len(surface) - (len(id) + 1)
```

A token pays for itself only when the surface is longer than its id. A one-character token costs two characters to represent one — it expands, regardless of how common it is or how well the dictionary covers it.

3. **Build `analyze_page_cost.py`** to attribute a ratio rather than report it: per-token economics, the token-length histogram, and the tokens costing the most characters. The governing constraint: **every number must come from the same cut the encoder uses.**

## Data and examples

What the structural floor bought, v01a → v01b, encoding against the `full` cut:

| sample | source chars | v01a ratio | v01a OOV | v01b ratio | v01b OOV | Δ |
|---|---:|---:|---:|---:|---:|---:|
| cnn | 7,311,041 | 0.596 | 14.5% | 0.622 | 9.4% | **+0.027** |
| tomshardware | 2,119,892 | 0.619 | 13.9% | 0.647 | 9.0% | **+0.028** |
| google-search | 1,967,703 | 0.588 | 20.4% | 0.623 | 14.3% | +0.034 |
| readme.md | 446 | 0.698 | 15.7% | 0.747 | 7.2% | **+0.049** |

OOV roughly halved on every sample.

Those are text-stream ratios from a Python model, and they are **not** the shipping numbers. The browser encodes to the binary wire, and on live cnn.com it reports the transfer ratio moving **1.17x → 1.28x**. Both figures are real; they measure different formats. The reconciliation is worth stating because the two disagree in a specific direction:

| | v01a | v01b | Δ |
|---|---:|---:|---:|
| this paper's varint model, `cnn-sample.html` | 0.89x | 1.08x | +0.19 |
| browser binary wire, live cnn.com | **1.17x** | **1.28x** | **+0.11** |

The model is looser than `ELO_BIN_VERSION = 2` in absolute terms *and* overstates the improvement. Implicit-space stripping does not explain the gap — it removes only 59,000 of 2,935,000 tokens on this page, because HTML contains few word-to-word spaces. The captures also differ: `cnn-sample.html` is a stored capture, cnn.com is live. Treat the model's numbers as a reproducible lower bound on direction, and the browser's as the result.

Where the characters actually go on the Google page, against v01b:

| class | tokens | net chars |
|---|---:|---:|
| saves | 70,752 | +162,671 |
| neutral | 38,937 | 0 |
| **expands** | **493,352** | **−665,554** |
| **OOV** | **93,038** | **−651,266** |

And the cause, which is not markup-specific but arithmetic:

```
mean token length: 2.83 chars
token length 1: 447,112 tokens — 64.2% of the page
```

**64.2% of the page is single characters.** Every one costs at least two characters to encode one. The delimiter alone accounts for 696,079 characters — 22.3% of the 3,121,852-character stream — because it is charged per token regardless of token length.

The largest single line items are punctuation the floor had *already fixed*: `-` (−70,322), ` ` (−50,640), `{` (−42,744), `}` (−42,744), `"` (−38,448). These have ids in v01b. They still expand, because no id can be shorter than the one character it replaces.

The OOV residue is Google's minifier, not language: `gm3` ×2,165, `x3c` ×1,470, `jsaction` ×1,148, `jscontroller` ×998, `TgQPHd` ×631 — random class names peaking at 5–6 characters.

For scale: the page's *readable content* is **13,213 characters of 1,967,703 — 0.67%**. And it says what it has to say in **581 unique words**, against 15,300 unique tokens in the raw HTML.

## What broke

**We measured against the wrong artifact first.** The initial frame-integrity test looked up surfaces in the LMDB, found `|` present in both builds, and concluded there was no difference between v01a and v01b. There was: the LMDB holds all 437,995 entries, the browser loads 261,872, and `{` sat at rank 276,119 — in the database, unreachable by the encoder. A test that queries a superset of what the system uses will report that everything is fine.

**The first cost model omitted the delimiter,** and produced a reassuring answer: only 7.5% of dictionary entries were unprofitable. Adding the `+1` per token moved that to **27.9% of corpus occurrences**, and revealed that the space character alone costs −91,226,198 characters across the corpus. The rule we are keeping: a cost model that leaves out a per-token constant will systematically flatter any format that charges one.

**We proposed extraction before measuring it.** "Compress the readable text instead" seemed obviously right, and it is — but the measured ratio on extracted text is **0.81x**, still expanding, because 58.9% of *prose* tokens are also single characters once spaces are counted. The win from extraction is 149x less input, not a better ratio. Two different arguments that are easy to merge into one wrong one.

## What we deferred and why

- **Removing the per-token delimiter.** 22.3% on this page and it helps every document, but ids are not currently self-delimiting — word tiers all share the `g`–`z` first-character range — so it is a codec format change, not a tuning change.
- **Word+space merged tokens.** Measured at +12.1% to +20.1% on prose, near zero on markup. It is a tokenizer change that shifts every id, so it belongs with the char-4 stabilization build, not a patch.
- **Implicit capitals after sentence boundaries.** 44% of capitals are inferable from the preceding token. Cheap and needs no rebuild, but smaller than the above.
- **Rule-based OOV patterns** for `NNpx` and `x3c`. Narrow, and only helps pages like this one.

## Result and consequence

- **`VALIDATED` — the structural floor improved every captured page**, +0.027 to +0.049 in text-stream ratio, with OOV roughly halved. On the shipping binary wire the browser measures live cnn.com at **1.17x → 1.28x**.
- **`UNVERIFIED` — the size of the gain, as opposed to its direction.** A Python varint model and the browser's binary wire disagree by 0.28 in absolute ratio and 0.08 in delta on the same page. Until the model encodes through `ELO_BIN_VERSION = 2`, only the browser's figure should be quoted.
- **`VALIDATED` — high coverage and negative savings are not in tension.** 64.2% single-character tokens produce both simultaneously; coverage cannot detect the failure because the tokens resolve.
- **`VALIDATED` — the delimiter costs 22.3% of the stream** on a 696,079-token page.
- **`REFUTED` — the structural floor would fix search-results pages.** Their cost is one-character tokens that no dictionary entry can make cheaper, not missing ids. The floor gave them ids; they still expand.
- **`REFUTED` — that extraction is an option for `.elo` at all.** Encoding only the readable text is 149x less input and looks like the obvious win, but it discards markup permanently. `.elo` is a lossless format; a mode that cannot reproduce its input byte-for-byte is not a compression setting, it is a different product. Reader-view extraction may still be worth building — as a summary artifact beside the capture, never as the capture.

What this unlocks: a ratio can now be attributed instead of argued about. `analyze_page_cost.py` reports where the characters went, which converts "this page compresses badly" into "64.2% of it is single characters and the delimiter is 22.3%" — a statement that names its own remedy. It also sets a boundary worth stating plainly: machine-generated markup is not a document, and a dictionary that prices meaning has nothing to price. That is a scope, not a defect.
