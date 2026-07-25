# 2026.07.11 — The Browser Recalls, It Does Not Opine: Closing the Memory Loop Over MCP

*Full write-up. The Field Notes teaser of the same title is cut from this. The client-side companion to the same-day "Tri-State Load Rule" and the 07-08 "Memory-Grounded Replies Without an LLM" — those built the dictionary reader and the Python response composer; this one wires a running browser to the live memory substrate over MCP and gets a grounded reply on screen.*

## Problem / context

The whole ELO thesis is that a device can do semantic work without a language model at inference time. We had proven the pieces separately: a dictionary that carries meaning (the `elo-browser-v01a` coupled family), a memory substrate that stores and recalls seeds (mneme + the recall engine), a deterministic response composer (the 07-08 verbalizer), and an MCP gateway that fronts all of it. What we had *never* done was connect the last six inches — a running browser talking to the live memory gateway and producing a reply grounded in what the user actually said. The client code existed (`gateway.rs`, `eloAi.ts`) and was **dead**: `eloAi` appeared in exactly one file, the console imported nothing, and every earlier session had "wired the memory loop" without a single call site. "It hasn't worked" was literally true — it had never been called.

This matters now because it is the difference between a demo and a system. A memory that nothing queries is a database; a memory a browser recalls from, mid-conversation, is a client.

## Background

Everything below is a wiring job because the primitives already shipped:

- **The gateway** (`08-MCP-ToolInterface`) exposes 16 memory + reflection tools over JSON-RPC on `/mcp`, with Ed25519 signing for mutating calls and an optional `.elo` transport.
- **The browser client** (`src-tauri/src/gateway.rs` + `src/eloAi.ts`) already implemented `configure / boot / resolve / remember`, signing the exact request bytes.
- **The v01a dictionary family** (fingerprint `b1790799…`, 261,872-word full cut) was live in the browser, so the local semantic read was already real.
- **The response composer** (07-08) formalized six memory-grounded reply shapes in Python.

## Approach

We connected the console to the gateway and made the reply **memory-aware**, all in the browser:

1. **Boot the seam.** On console open: `configure(127.0.0.1:8848)` → `provisionDevice` (best-effort, so mutating calls can sign) → `boot`, then a `gwReady` flag. A footer on every reply prints `memory: live` / `memory: offline` so connection state is never invisible again.
2. **Form the reply.** On send: run the local deterministic `respond` (semantic/affect read) **and** `elo_ai_resolve(query)` against the live substrate, then weave the recalled memory into the reply text — not just a side panel.
3. **Grow memory.** `remember(text)` writes the turn back, so a later related message recalls it — the loop closing in-session.
4. **Rank recall client-side.** The substrate returns seeds charge-first; we re-rank by word-overlap with the query so the *relevant* memory surfaces, and dedupe by text.

The governing constraint: **no LLM, and no invented content.** Every clause of a reply is either the deterministic read or a verbatim quote of a stored seed. The browser recalls; it does not opine.

## Data and examples

Live, in the running browser, gateway up (`16 tools`, `codings=['application/json']`):

| user turn | ELO reply (abridged) | recall |
|---|---|---|
| "whats your name?" | "On name — reads neutral. ↳ from memory: *'Your name is Elo…'*" | correct seed surfaced |
| "do you have a name?" | "On name — reads positive. ↳ *'Your name is Elo…'*; also *'My name is Paul…'*" | two distinct seeds |

The gateway probe, run both ways, closed 9/9:

| shape | write payload | resolve | result |
|---|---|---|---|
| scoped | `{entity_id, project, text+marker}` | `{query, entity}` | this run's **marker** returned |
| `--as-browser` | `{text+marker}` (no scope) | `{query}` (no scope) | this run's **marker** returned |

Isolation check: after writing with no entity, a resolve as `not-<entity>` **could not see the seed** — so entity filters; the scope-less calls work because write and read fall to the same server-side default, not because entity is ignored. Charge accumulated across a session (`0.42 → 0.71 → 0.81`, seeds `2 → 4 → 6`).

## What broke

**A green round-trip that verified nothing.** The first probe passed 9/9 and I nearly reported the loop closed. It wasn't evidence: two runs shared the same default seed text, so `resolve` could return an *earlier* run's seed and the substring check "passed." I added a unique per-run marker; only a marker match counts as a round trip. A test whose green light is unrelated to what it claims is the exact drift the fingerprint discipline exists to refuse — and I walked into it hours after writing that rule down.

**I predicted the wrong failure — twice.** I forecast the loop would break on the open-mode scope hole (no `bind_scope`, so no entity injected). It didn't: the isolation probe showed entity genuinely filters and the scope-less calls agree on a server default. `"the scope hole breaks the loop"`: **REFUTED** by measurement, not by argument.

**Recall was charge-first, not relevance-first.** Live, "what is your name?" kept returning "Hello Elo" — the highest-charge seed — for every question. The right memory ("Your name is Elo") was in the set, unranked. We patched it browser-side by re-ranking on query word-overlap; honestly, that is a compress over the substrate's ranking, not a fix in it.

**The composer used as a conversationalist dead-ended.** Fed a question, the local `respond` (an affective-arc summarizer) returned "there aren't any statements yet for me to read" — a summarizer admitting it had nothing to summarize. We routed questions and greetings to a topic+affect line the recall can attach to.

## What we deferred and why

- **The real verbalizer over MCP.** The 07-08 six-shape composer lives in Python and is not yet a gateway tool; the browser composes a simpler local read + quoted recall. Exposing the composer as an MCP endpoint is the next step, not this one.
- **One id space across the boundary.** We send **plain text** to the gateway, and mneme re-encodes it with its own `vec4d` encoder — a different semantic space from the browser dictionary. Unifying mneme onto the `elo-browser-v01a` id space is the "ids are the representation" vision; a text bridge is the honest current state.
- **Memory hygiene.** `remember` writes every turn, so identical seeds accumulate; we dedupe on display but have not decided what deserves storing.
- **The LLM.** Deliberately absent.

## Result and consequence

- **The memory loop closes in the browser over MCP:** **VALIDATED** — probe 9/9 marker-isolated in both call shapes; live console shows `memory: live` and grounds replies in recalled seeds.
- **"A green round-trip is evidence":** **REFUTED** as first run (shared seed text), **VALIDATED** only after a per-run marker made the match specific.
- **"The open-mode scope hole breaks the loop":** **REFUTED** — entity filters; scope-less calls share a server default, proven by the isolation probe.
- **"Dictionary ids reach the memory system":** **REFUTED** — the client sends text; mneme re-encodes. Two semantic systems bridged by a string.
- **"Recall is relevance-ranked by the substrate":** **REFUTED** — it is charge-first; the browser re-ranks by query overlap.

What this unlocks: the browser is now a *client* of its own substrate, not a viewer of it. "What is your name?" is answered by **retrieval** — *"you told me Elo"* — not generation, which is the honest shape of intelligence without a model: it recalls what it was told, and says so, quoting the seed. Every reply is grounded and auditable by construction. The next move is to route the browser's compose step through the real verbalizer over MCP, so the words get as rich as the recall already is.
