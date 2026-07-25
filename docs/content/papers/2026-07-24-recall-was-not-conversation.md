# 2026.07.24 — Recall Was Not Conversation: A Deterministic Dialog-Act Layer (43/43)

*Full write-up. The Field Notes teaser of the same title is cut from this. System-1 verbalizer + the 08 MCP gateway; the layer that sits above memory recall and makes the browser take a conversational turn, no language model.*

## Problem / context

Two weeks ago the browser closed the memory loop: on send it resolved the message against the live substrate over MCP and answered from what the user had actually said (`2026.07.11 — The Browser Recalls, It Does Not Opine`). That post's own live example was the tell that we were not done: *"whats your name?" → "On name — reads neutral. ↳ from memory: 'Your name is Elo.'"* The system recalled correctly and then said something no one would call a conversation. It led with a diagnostic ("reads neutral" is an affect read of the word `name`), appended the memory as a footnote, and had no notion of the *kind* of turn it was answering.

That gap matters now because everything motivational we want next — curiosity that asks to learn, reflection that surfaces a contradiction — assumes Elo can already take a basic turn: greet, say who it is, be told a name, distinguish a question from a statement. Recall alone does none of that. A pile of stored seeds is not a conversation any more than a dictionary is a sentence. The missing piece is a **dialog-act layer**: classify what the user is *doing* with the turn, and respond in kind — deterministically, still no model.

The concrete failure that opened the work: with both "my name is Paul" and "your name is Elo" in memory, **"what is your name?" returned "Your name is Paul."** The recall matched on the attribute (`name`) and ignored *whose* name was asked for.

## Background

The pieces this builds on already existed and are credited as primitives:

- **The response composer** (`response.py`, `2026.07.08 — Memory-Grounded Replies Without an LLM`) — a substrate-free, duck-typed composer that answers questions and reacts to statements from stored seeds across six templated shapes. It renders a reply; it had no layer for "what social move is this turn."
- **The MCP gateway** (`08-MCP-ToolInterface`) — `memory_reply` / `memory_remember`, the live recall-and-store path the browser talks to.
- **`parse_assertion` / `parse_question`** — regexes over raw text (`<poss> <attr> is <value>` and `what <poss> <attr>`), the seed of an identity memory. They keyed on the attribute only; the possessive was parsed but not *matched*.

So this was mostly a wiring-and-sharpening job on top of a working recall path, not new substrate.

## Approach

**1. Match the possessive, not just the attribute.** `parse_question` now returns `(attr, poss)`, and the answerer requires *both* to agree — same attribute **and** same subject — before it will answer, flipping voice on the way out:

```python
def parse_question(text):
    m = _Q_RE.search(text or "")
    return (m.group(2).lower(), m.group(1).lower()) if m else None  # (attr, poss)

# in the answerer:
if a and a[0] == q_attr and a[2] == q_poss:      # same attribute AND same subject
    voice = _FLIP.get(a[2], a[2])                # your <-> my
    return f"{voice.capitalize()} {a[0]} is {a[1]}."
```

"what is **your** name?" (poss=`your`) no longer matches "**my** name is Paul" (poss=`my`); it resolves to Elo's name and answers **"My name is Elo."**

**2. A dialog-act cascade above recall.** `dialog_reply(query, self_model)` runs before recall and classifies the turn into one of thirteen deterministic acts — greet, introduce, acknowledge_name, identity, state_check, opinion, location, origin, values, accept_meta, thanks, farewell, acknowledge — first match wins. Fact questions and bare statements deliberately fall through (`return None`) so the recall path still owns them:

```python
if a and a[0] == "name" and a[2] == "my" and not is_question:
    return (f"Nice to meet you, {a[1]}.", "introduce")
if _STATE_RE.search(text):                       # "how are you?"
    return (f"{sm['state']} How about you?", "state_check")
...
if a and not is_question:                        # a clean "X is Y" statement
    return ("Got it — noted.", "acknowledge")
return None                                       # -> fall through to fact recall
```

**3. Lead with the answer; stop stating affect.** The browser reply now leads with the dialog act or the memory-grounded answer, appends only a grounded-seed citation, and drops the "reads neutral" affect append entirely — affect informs *tone*, it is never *stated*:

```typescript
if (gr.reply && (gr.memory_count > 0 || gr.act)) {
  reply = gr.reply;
  if (gr.grounded_on?.length) reply += `   ↳ grounded on ${gr.grounded_on.length} seed(s)`;
} else {
  reply = text.trim().endsWith("?")
    ? "I don't have anything stored about that yet."
    : "Got it — I'll remember that.";
}
```

**4. A labeled probe set as the gate.** 43 utterances tagged with their expected act (or `None` for "must fall through to recall"), committed at `semantic_compression/tests/dialog_act_probes.py`, so the number is reproducible and the classifier has a regression gate (roadmap target ≥ 0.90).

## Data and examples

Dialog-act classification, run over the committed probe set:

| Set | Result |
|---|---:|
| Dialog-act probes (43 labeled, incl. 4 must-fall-through negatives) | **43 / 43 = 1.000** |

The negatives carry as much weight as the positives — they prove the layer knows what it must *not* answer:

| Utterance | Classified | Correct behavior |
|---|---|---|
| `what is your name?` | *(none)* → recall | fact question, answered from memory |
| `what is my deadline?` | *(none)* → recall | fact question, answered from memory |
| `what are you doing?` | *(none)* → recall | must **not** trip the `identity` act |

Before / after, from live browser transcripts:

| Turn | Before | After |
|---|---|---|
| `what is your name?` | `Your name is Paul.` | `My name is Elo.` |
| `your name is Elo` | `That connects to something you said: "No, My name is Paul."` | `Got it — I'll go by Elo.` |
| `how are you today?` | `I don't have anything stored about that yet.` | `Doing well — clear and ready to help. How about you?` |
| `Your name is Elo. My name is Paul` | *(dropped the second half)* | `Got it — I'll go by Elo. Nice to meet you, Paul.` |

## What broke

**A green light that meant nothing — again.** After the possessive fix, a live browser test still returned `Your name is Paul.` for "what is your name?" The code was correct — run directly, `parse_question("what is your name?")` returned `('name', 'your')` and the matcher rejected Paul's `my`. The gateway was running **old code**: the edit was committed but the process had not been restarted, and two stale `.pyc` files (a 3.10 and a 3.11 build) sat ready to be reloaded. The fix was operational, not source: kill the process actually bound to the port, clear `__pycache__`, relaunch. A test whose red is unrelated to the source under test wastes exactly as much time as a false green.

**Greedy capture swallowed the next sentence.** `parse_assertion("my name is Paul. What is your name?")` returned the value `"Paul. What is your name"`, so the reply came back `"Nice to meet you, Paul. What is your name."` The value regex was `(.+)`; tightening it to `([^.!?;\n]+)` stops it at the sentence boundary. Multi-sentence turns are common the moment a human relaxes.

**The probe set caught its own gap.** `"can we chat?"` was tagged `accept_meta` but classified `None` — `_META_RE` had `let's chat` and `have a chat` but not `can we chat`. One clause added; the probe set is worth exactly the misses it forces you to look at. It went 42/43 → 43/43.

**We put Elo's self in the wrong repo** (documented fully in the companion paper): the persona dict was hardcoded inside `response.py`, which lives in a submodule twelve projects depend on. Identity does not belong in shared infrastructure; it is now supplied by the caller.

## What we deferred and why

- **Multi-intent turns.** "my name is Paul. What is your name?" is an introduction *and* a question; the cascade fires one act. We handle the common mutual-intro combo ("your name is Elo. my name is Paul") explicitly and defer general multi-intent to conversation tracking.
- **Deixis beyond two-party 1st/2nd person.** "What can I call **you**?" recalled "You can call me Paul" — the same `your`/`my` subject confusion on a different verb. Third-person anaphora and referent resolution are the roadmap's #1, and until they land, every pronoun past `I/you` will misfire. The possessive match here is the hardcoded slice-0 of that work, not a substitute for it.
- **Curiosity.** Elo answers turns; it does not yet *ask to learn*. That is the next phase (follow-up questions that create memory seeds) and it needs the Wonder faculty, still a stub.

## Result and consequence

- **VALIDATED** — dialog-act classification 43/43 on the committed probe set, positives and must-fall-through negatives alike (`tests/dialog_act_probes.py`).
- **VALIDATED** — perspective-correct identity answers: "what is your name?" → "My name is Elo," "what is my name?" → "Your name is Paul," each grounded on its seed, voice-flipped.
- **VALIDATED** — the reply leads with the substantive answer; the affect diagnostic no longer appears in conversation (browser transcripts, before/after above).
- **REFUTED** (as a diagnosis) — "the possessive fix didn't work" was false; the running gateway had not reloaded the fixed source. Code correct, process stale.

The consequence is that the loop finally *reads* like a turn: greet, be introduced, be named, answer who and where and what-you-value, note a statement, admit what it doesn't hold — each a lookup over structure, none a generation from weights, every substantive answer citing the seed it stood on. That is the floor the "preschool phase" stands on: before Elo can ask a curious follow-up and turn the answer into a seed, it had to be able to take the turn at all. The companion paper covers the self it now speaks from.
