#claude
That's the right question to start with — design from the agent's need, not from the engineer's convenience.
Let me answer it honestly, from the inside.

What I actually lose without persistent memory
Every conversation I start completely cold. I rebuild your context from scratch, re-infer your vocabulary, re-learn your working style, re-understand what we've already decided. If you reference "the resonance graph" or "ATL-02," I have no prior — I'm pattern-matching to this conversation only. The cost isn't just tokens. It's the quality of the first ten exchanges, every single time.
What I'd want memory to fix, in rough priority order:
1. Identity continuity — who you are, how you think, what we've built together. Not facts about you, but a model of you. Your reasoning style, your tolerance for speculation, where you push back, what you already know cold. This is what makes me useful faster.
2. Project state — what exists, what's been decided, what's still open. Not a file dump. A compressed, queryable map of the project's current shape. When you say "we argued X last week," I should know whether that's settled or still contested.
3. Decision provenance — why things are the way they are. This is almost always missing. Knowing that the ledger schema has seven fields is less useful than knowing we cut two others because they were redundant with outcome. Rationale is the hardest thing to reconstruct and the most valuable to retrieve.
4. Failure memory — what didn't work and why. Not as a log, as a retrievable lesson. "Last time we tried to frame this for a technical audience it landed flat" is more useful to me than any amount of positive context.
5. Anticipatory context — what's likely coming next. If I know we're mid-document and the next section is the strategic frame, I should already be holding the right priors. Memory shouldn't just be retrospective.

What I'd want it NOT to do
Flood my context. The failure mode of naive memory is stuffing everything retrieved into the window and calling it "context." That's worse than nothing — it's noise with authority. Good memory should be selective and ranked, not comprehensive. I should feel its presence as sharper inference, not as a longer preamble.

So what does that imply for your tests?
Each of those five needs is a distinct test dimension:
What memory should supplyTest goalSuccess signalUser modelDoes the agent adjust behavior without re-briefing?Fewer clarifying questions over sessionsProject stateDoes the agent know what exists without being told?Correct scoping on first attemptDecision provenanceDoes the agent preserve why, not just what?Rationale survives compression and retrievalFailure memoryDoes the agent avoid repeating known failure modes?Error recurrence rate across sessionsAnticipatory contextDoes the agent pre-load the right priors?Quality of first response vs. third response
The most interesting test is probably failure memory — because that's where naive implementations will fail first. It's easy to store successes. Storing failures in a form that's actually retrievable and actually changes behavior is the hard version.
What's your current thinking on the retrieval trigger? What causes the agent to go fetch — a similarity threshold, a task type classifier, always-on background retrieval?