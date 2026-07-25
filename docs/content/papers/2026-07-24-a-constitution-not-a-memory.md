# 2026.07.24 — A Constitution, Not a Memory: Authoring the Self a Verbalizer Speaks From

*Full write-up. The Field Notes teaser of the same title is cut from this. System-1 verbalizer + the 08 gateway; the separation of Elo's authored core identity from its learned episodic memory. Companion to the same day's dialog-act paper.*

## Problem / context

Once Elo could take a conversational turn, it needed a self to take it *from*. "Who are you?", "where do you run?", "what do you value?" are not recall queries — there is no seed in episodic memory that answers them, and there should not be. A first pass hardcoded a four-field persona dict (`SELF`) inside the response composer, which answered the small-talk but was wrong in two ways that only get more expensive with time.

First, **it was in the wrong repository.** `response.py` lives in the `semantic_compression` submodule — shared infrastructure that **twelve** projects depend on. Elo-specific identity has no business inside a generic compression library; the moment a second consumer of that submodule exists, it inherits Elo's name.

Second, **self-facts cannot go in episodic memory yet, and this is not a temporary inconvenience — it is deixis.** A user asks "what is **your** name?" (`poss=your`). Elo's own self-assertion would be "**my** name is Elo" (`poss=my`). Under the surface-possessive matching that identity recall currently uses (see the companion paper), those two do not match — different subject. So a self-fact filed into `memory.lmdb` would be unreachable by the very question it answers, until referent resolution replaces surface pronouns (roadmap #1). The self needs a home that is read *directly*, never through surface-matching recall.

Why it matters now: the "preschool phase" we are about to build has Elo asking curious follow-ups to accumulate episodic memory. If the authored self and the learned memory share a store, the foundation is muddled from day one — every rebuild of learned memory risks disturbing who Elo *is*.

## Background

Two facts about the existing system made this a separation, not a construction:

- **The verbalizer is already substrate-free by design.** `response.py`'s own docstring: *"Pure + substrate-free… callers supply the memory context."* It takes the memory it reasons over as an argument rather than opening the store itself. The correct move was simply to make **identity caller-supplied too**, exactly like memory already is.
- **Episodic memory already exists and works** — `memory_remember` forms seeds via `SeedFormer`; `memory.lmdb` accumulates them. The gap was never "Elo has no memory." It was that it had no *authored* memory, distinct in kind from the learned kind.

## Approach

**1. A constitution file at the repo root.** `elo_core.json` holds exactly the five fields Elo needs to speak as itself — name, location, influence, moral stance, guidance — authored, slow, curated:

```json
{
  "name":         { "primary": "Elo", "nature": "a semantic memory system — I read meaning, remember what you tell me, and map the structure of a page" },
  "location":     { "answer": "I live on your device, inside the ELO Browser — I run locally, not in the cloud." },
  "influence":    { "answer": "I was made by Paul, built on a semantic-compression substrate and affect-control research (Osgood/Heise EPA)." },
  "moral_stance": { "mode": "descriptive", "answer": "never make up a memory, preserve your words faithfully, ground what I claim, and keep what you tell me on your device." },
  "guidance":     { "state": "Doing well — clear and ready to help.", "opinion_policy": "I don't form preferences of my own, but I'm glad to hear yours." }
}
```

**2. A loader that projects the core onto the persona contract, outside the submodule.** `elo_core.py` (gateway-side) reads the file and flattens the nested constitution to the flat dict the verbalizer consumes; it returns `None` on any failure so the caller falls back cleanly:

```python
def load_self_model(path=None, refresh=False):
    try:
        core = json.loads(Path(path or _DEFAULT_PATH).read_text("utf-8"))
        model = _project(core)                     # nested -> {name, nature, state, opinion, location, origin, values}
        return model if model.get("name") and model.get("nature") else None
    except Exception:
        return None
```

**3. Identity as an argument to the verbalizer.** `dialog_reply(query, self_model=None)` uses `sm = self_model or SELF`; the module-level `SELF` remains only as a **standalone fallback** so the submodule and its tests still run in isolation. The gateway loads the core once and passes it in:

```python
from response import dialog_reply
from elo_core import load_self_model
d = dialog_reply(query, self_model=load_self_model())
```

**4. Descriptive, not enforced.** Moral stance ships as text the persona reads and speaks; it does not yet gate behavior. Enforcement waits on the faculties that would do the gating (Emotion-as-weight, Intention), which are still stubs.

## Data and examples

The loader projects the constitution onto the exact keys the verbalizer expects, and the two paths — standalone `SELF` fallback and loaded core — produce **identical** output, which is the point: the default mirrors the core, and the core is now the editable source of truth.

| Turn | Act | Answer (from `elo_core.json`) |
|---|---|---|
| `who are you?` | identity | I'm Elo, a semantic memory system — I read meaning, remember what you tell me… |
| `where do you live?` | location | I live on your device, inside the ELO Browser — I run locally, not in the cloud. |
| `who made you?` | origin | I was made by Paul, built on a semantic-compression substrate and affect-control research… |
| `what do you value?` | values | never make up a memory, preserve your words faithfully, ground what I claim… |

The two stores, side by side:

| | Core / constitutional | Episodic |
|---|---|---|
| File | `elo_core.json` (repo root) | `Memory/data/memory.lmdb` |
| Origin | authored | learned from conversation |
| Change rate | slow, curated | fast, accumulating |
| Read path | directly, by the persona | surface/denotation recall |
| Answers | who/where/why Elo is | what you told it |

## What broke

**We shipped the self into shared infrastructure and had to pull it back out.** The first version put the `SELF` dict directly in `response.py`. It worked — and it was an architectural mistake, because that file is a submodule twelve projects import. The correction was to honor the verbalizer's own stated contract (callers supply context) and lift identity out to a caller-supplied argument, with the in-module dict demoted to a fallback. The lesson is one the repo keeps re-teaching: *the thing that works in the demo can still be in the wrong place.*

**TOML lost to a Python-version landmine.** The natural format for a hand-edited, commented constitution is TOML. But `tomllib` is standard only in Python 3.11+, and the gateway environment had both 3.10 and 3.11 bytecode present — a `.toml` core would load or not depending on which interpreter ran the gateway. JSON loads on every Python with no dependency, so the constitution is JSON with a `_doc` field standing in for comments. A config format you can't guarantee will parse is not a config format.

## What we deferred and why

- **Moral stance stays descriptive.** Real enforcement — refusing or deferring based on the stance — needs Emotion-as-weight and Intention, both still stubs. Encoding the values now, gating on them later, is the honest order.
- **Self-facts stay out of episodic memory** until referent resolution (roadmap #1b) replaces surface possessives. Only then can "my name is Elo" answer "what is your name?" and the constitution's identity facts safely migrate into recall.
- **No human-readable `ELO_CORE.md`.** The JSON is the single source of truth; a documented mirror can follow if the file grows.

## Result and consequence

- **VALIDATED** — `elo_core.json` supplies name, location, influence, moral stance, guidance; the loader projects it onto the persona contract; standalone (`SELF`) and loaded-core paths produce identical replies.
- **VALIDATED** — identity is caller-supplied; Elo-specific self no longer lives in the shared `semantic_compression` submodule; the submodule stays standalone-testable via the fallback.
- **UNVERIFIED** — that JSON (not TOML) was the right long-term format; it is right for *now* given the mixed-interpreter environment, and revisitable once the runtime settles on one Python.

The consequence is a clean seam between *who Elo is* and *what Elo has learned* — the first authored, slow, and read directly; the second learned, fast, and recalled. That seam is what lets the coming preschool phase pour episodic seeds in freely without ever disturbing the self they attach to. The companion paper covers the conversational turn this self now speaks through.
