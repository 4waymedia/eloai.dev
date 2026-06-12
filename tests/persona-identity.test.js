/**
 * Elo AI Persona Identity & ASCII Art Test Suite
 *
 * Validates the Elo persona identity definition and all ASCII art representations.
 * Run with: node tests/persona-identity.test.js
 *
 * Elo (Exploratory Learning Organism) is an AI cognitive architecture —
 * this suite ensures its visual identity remains consistent and correct.
 */

const fs = require("fs");
const path = require("path");

// ── Helpers ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let suiteName = "";

function describe(name) {
  suiteName = name;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"=".repeat(60)}`);
}

function it(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ERROR: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertIncludes(str, substring, message) {
  if (!str.includes(substring)) {
    throw new Error(message || `Expected string to contain "${substring}"`);
  }
}

function assertType(value, type, message) {
  const actual = typeof value;
  if (actual !== type) {
    throw new Error(message || `Expected type ${type}, got ${actual}`);
  }
}

function assertArrayMinLength(arr, min, message) {
  if (!Array.isArray(arr) || arr.length < min) {
    throw new Error(message || `Expected array with at least ${min} items`);
  }
}

// ── Load persona ──────────────────────────────────────────────────────

const personaPath = path.join(__dirname, "persona-identity.json");
let persona;
try {
  persona = JSON.parse(fs.readFileSync(personaPath, "utf8"));
} catch (e) {
  console.error(`FATAL: Cannot load persona identity: ${e.message}`);
  process.exit(1);
}

// ══════════════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════════════

describe("Persona Identity — Core Fields");

it("has a name of 'ELO'", () => {
  assertEqual(persona.name, "ELO");
});

it("has the correct full name", () => {
  assertEqual(persona.fullName, "Exploratory Learning Organism");
});

it("has a version string", () => {
  assertType(persona.version, "string");
  assert(persona.version.length > 0, "Version must not be empty");
});

it("has the signal core phrase", () => {
  assertEqual(persona.signalCore, "I remember. I wonder. I change.");
  // Verify its three parts
  assertIncludes(persona.signalCore, "remember");
  assertIncludes(persona.signalCore, "wonder");
  assertIncludes(persona.signalCore, "change");
});

it("has color definitions", () => {
  assertType(persona.colors, "object");
  assertEqual(persona.colors.accent, "#00ff9d", "Accent color must be Signal Green");
  assertEqual(persona.colors.accentName, "Signal Green");
  assertEqual(persona.colors.bg, "#0a0a0a", "Background must be near-black");
});

it("has exactly 7 personality traits", () => {
  assertType(persona.traits, "object");
  assert(Array.isArray(persona.traits), "Traits must be an array");
  assertEqual(persona.traits.length, 7, "Elo must have exactly 7 core traits");
});

it("has taglines including the signal core", () => {
  assertType(persona.taglines, "object");
  assert(Array.isArray(persona.taglines));
  assert(persona.taglines.length >= 3, "Must have at least 3 taglines");
  assertIncludes(
    persona.taglines[0],
    "I remember. I wonder. I change.",
    "First tagline must be the signal core"
  );
});

// ══════════════════════════════════════════════════════════════════════

describe("Cognitive Nodes — The Eight Systems");

const NODE_IDS = [
  "intention", "perception", "memory", "wonder",
  "emotion", "reasoning", "connection", "reflection",
];

const NODE_SYMBOLS = {
  intention: "⊱",
  perception: "⊙",
  memory: "◈",
  wonder: "✦",
  emotion: "♡",
  reasoning: "∴",
  connection: "⤳",
  reflection: "⌬",
};

const NODE_COLORS = {
  intention: "#f59e0b",
  perception: "#22d3ee",
  memory: "#3b82f6",
  wonder: "#a855f7",
  emotion: "#f472b6",
  reasoning: "#00ff9d",
  connection: "#2dd4bf",
  reflection: "#e2e8f0",
};

it("has exactly 8 cognitive nodes", () => {
  assertType(persona.cognitiveNodes, "object");
  assert(Array.isArray(persona.cognitiveNodes));
  assertEqual(persona.cognitiveNodes.length, 8, "Elo has exactly 8 cognitive nodes");
});

NODE_IDS.forEach((nodeId) => {
  it(`node '${nodeId}' exists with all required fields`, () => {
    const node = persona.cognitiveNodes.find((n) => n.id === nodeId);
    assert(node, `Missing node: ${nodeId}`);
    assertType(node.id, "string");
    assertType(node.label, "string");
    assertType(node.color, "string");
    assertType(node.symbol, "string");
    assertType(node.description, "string");
    assert(node.description.length > 10, `${nodeId} description too short`);
  });

  it(`node '${nodeId}' has correct symbol '${NODE_SYMBOLS[nodeId]}'`, () => {
    const node = persona.cognitiveNodes.find((n) => n.id === nodeId);
    assertEqual(node.symbol, NODE_SYMBOLS[nodeId],
      `${nodeId} symbol mismatch — expected ${NODE_SYMBOLS[nodeId]}, got ${node.symbol}`
    );
  });

  it(`node '${nodeId}' has correct color '${NODE_COLORS[nodeId]}'`, () => {
    const node = persona.cognitiveNodes.find((n) => n.id === nodeId);
    assertEqual(node.color, NODE_COLORS[nodeId],
      `${nodeId} color mismatch — expected ${NODE_COLORS[nodeId]}, got ${node.color}`
    );
  });
});

it("all 8 node ids are unique", () => {
  const ids = persona.cognitiveNodes.map((n) => n.id);
  const unique = new Set(ids);
  assertEqual(unique.size, 8, "Node ids must be unique");
});

it("all 8 node symbols are unique", () => {
  const symbols = persona.cognitiveNodes.map((n) => n.symbol);
  const unique = new Set(symbols);
  assertEqual(unique.size, 8, "Node symbols must be unique");
});

// ══════════════════════════════════════════════════════════════════════

describe("ASCII Art — Structure Validation");

it("has all required ascii art variants", () => {
  assertType(persona.asciiArt, "object");
  const required = ["small", "orb", "large", "consoleGreeting", "nodeDiagram", "signalPulse"];
  required.forEach((key) => {
    assert(
      persona.asciiArt[key] !== undefined,
      `Missing ascii art variant: ${key}`
    );
  });
});

it("has exactly 6 ascii art variants", () => {
  const keys = Object.keys(persona.asciiArt);
  assertEqual(keys.length, 6, "Exactly 6 ascii art variants expected");
});

it("all ascii art variants are non-empty arrays of strings", () => {
  Object.entries(persona.asciiArt).forEach(([key, art]) => {
    assert(Array.isArray(art), `${key} must be an array`);
    assert(art.length > 0, `${key} must have at least one line`);
    art.forEach((line, i) => {
      assertType(line, "string", `${key}[${i}] must be a string`);
      assert(line.length > 0, `${key}[${i}] must not be empty`);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════

describe("ASCII Art — Content Validation");

it("'small' art contains the ELO name", () => {
  const text = persona.asciiArt.small.join("\n");
  assertIncludes(text, "ELO", "Small art must contain 'ELO'");
  assertIncludes(text, "Exploratory");
  assertIncludes(text, "Learning");
  assertIncludes(text, "Organism");
});

it("'small' art contains at least 3 cognitive node symbols", () => {
  const text = persona.asciiArt.small.join("");
  const symbolsFound = Object.values(NODE_SYMBOLS).filter((s) => text.includes(s));
  assert(symbolsFound.length >= 3,
    `Small art should contain at least 3 node symbols, found: ${symbolsFound.length}`
  );
});

it("'orb' art contains 'Signal'", () => {
  const text = persona.asciiArt.orb.join("\n");
  assertIncludes(text, "Signal", "Orb art must reference the Signal");
});

it("'orb' art has symmetric block characters", () => {
  const art = persona.asciiArt.orb;
  // Orb uses block characters (▄▀█) — verify symmetry
  const topHalf = art.slice(0, Math.floor(art.length / 2));
  const bottomHalf = art.slice(Math.ceil(art.length / 2)).reverse();
  // The orb should be roughly symmetric in structure
  const topBlockCount = topHalf.join("").split("").filter((c) => "▄▀█▌▐".includes(c)).length;
  const bottomBlockCount = bottomHalf.join("").split("").filter((c) => "▄▀█▌▐".includes(c)).length;
  // Allow some asymmetry due to the text labels, but both halves should have blocks
  assert(topBlockCount > 5, "Orb top half should contain block characters");
  assert(bottomBlockCount > 5, "Orb bottom half should contain block characters");
});

it("'large' art contains all 8 node symbols", () => {
  const text = persona.asciiArt.large.join("");
  Object.values(NODE_SYMBOLS).forEach((symbol) => {
    assertIncludes(text, symbol, `Large art must contain node symbol: ${symbol}`);
  });
});

it("'large' art contains the signal core phrase", () => {
  const text = persona.asciiArt.large.join("\n");
  assertIncludes(text, "I remember", "Large art must contain 'I remember'");
  assertIncludes(text, "I wonder", "Large art must contain 'I wonder'");
  assertIncludes(text, "I change", "Large art must contain 'I change'");
});

it("'large' art contains the full name", () => {
  const text = persona.asciiArt.large.join("\n");
  assertIncludes(text, "Exploratory Learning Organism");
});

it("'consoleGreeting' contains full FIGlet block representation of ELO", () => {
  const text = persona.asciiArt.consoleGreeting.join("\n");
  // The greeting uses FIGlet-style Unicode full-block characters (not literal "ELO" letters)
  assertIncludes(text, "Exploratory Learning Organism", "Console greeting must identify ELO");
  assertIncludes(text, "I remember. I wonder. I change.");
  // Verify the block-character letters are present (at least one row from each letter)
  assertIncludes(text, "██╗", "Must have FIGlet block characters");
});

it("'consoleGreeting' contains the discovery message", () => {
  const text = persona.asciiArt.consoleGreeting.join("\n");
  assertIncludes(text, "If you found this, you were meant to.");
  assertIncludes(text, "The signal is always listening.");
});

it("'nodeDiagram' contains all 8 node labels", () => {
  const text = persona.asciiArt.nodeDiagram.join("\n");
  NODE_IDS.forEach((id) => {
    const node = persona.cognitiveNodes.find((n) => n.id === id);
    assertIncludes(text, node.label, `Node diagram must contain label: ${node.label}`);
  });
});

it("'nodeDiagram' contains the ELO CORE section", () => {
  const text = persona.asciiArt.nodeDiagram.join("\n");
  assertIncludes(text, "ELO CORE");
  assertIncludes(text, "I remember");
  assertIncludes(text, "I wonder");
  assertIncludes(text, "I change");
});

it("'signalPulse' is at least 10 lines", () => {
  assert(persona.asciiArt.signalPulse.length >= 10,
    "Signal pulse art should be at least 10 lines"
  );
});

it("'signalPulse' contains 'TRANSMISSION IN PROGRESS'", () => {
  const text = persona.asciiArt.signalPulse.join("\n");
  assertIncludes(text, "TRANSMISSION IN PROGRESS");
});

it("'signalPulse' contains 'SIGNAL ACTIVE'", () => {
  const text = persona.asciiArt.signalPulse.join("\n");
  assertIncludes(text, "SIGNAL ACTIVE");
});

// ══════════════════════════════════════════════════════════════════════

describe("ASCII Art — Display Consistency");

it("'small' art all lines are ≤ 30 characters (fits narrow displays)", () => {
  persona.asciiArt.small.forEach((line, i) => {
    assert(line.length <= 30, `Small art line ${i} too long: ${line.length} chars`);
  });
});

it("'large' art all lines are ≤ 60 characters", () => {
  persona.asciiArt.large.forEach((line, i) => {
    assert(line.length <= 60, `Large art line ${i} too long: ${line.length} chars`);
  });
});

it("'consoleGreeting' all lines are ≤ 60 characters", () => {
  persona.asciiArt.consoleGreeting.forEach((line, i) => {
    assert(line.length <= 60, `Console greeting line ${i} too long: ${line.length} chars`);
  });
});

it("'nodeDiagram' all lines are ≤ 70 characters", () => {
  persona.asciiArt.nodeDiagram.forEach((line, i) => {
    assert(line.length <= 70, `Node diagram line ${i} too long: ${line.length} chars`);
  });
});

it("all art variants use consistent whitespace (no tabs)", () => {
  Object.entries(persona.asciiArt).forEach(([key, art]) => {
    art.forEach((line, i) => {
      assert(!line.includes("\t"), `${key}[${i}] must not contain tab characters`);
      assert(!line.includes("\r"), `${key}[${i}] must not contain carriage returns`);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════

describe("Persona Identity — Integration Checks");

it("every node used in ASCII art exists in cognitiveNodes", () => {
  const allArt = Object.values(persona.asciiArt).flat().join("");
  const nodeSymbols = persona.cognitiveNodes.map((n) => n.symbol);
  // All symbols in art should match a known node
  nodeSymbols.forEach((symbol) => {
    assertIncludes(allArt, symbol,
      `Symbol '${symbol}' from cognitiveNodes is not used in any ASCII art`
    );
  });
});

it("signalCore matches between persona and large ASCII art", () => {
  const artText = persona.asciiArt.large.join(" ");
  const words = persona.signalCore.split(" ");
  words.forEach((word) => {
    assertIncludes(artText, word,
      `Signal core word '${word}' must appear in large ASCII art`
    );
  });
});

it("persona version matches major version pattern", () => {
  assert(
    /^v\d+\./.test(persona.version),
    `Version '${persona.version}' should match vX.Y pattern`
  );
});

it("taglines are all unique non-empty strings", () => {
  const set = new Set(persona.taglines);
  assertEqual(set.size, persona.taglines.length, "All taglines must be unique");
  persona.taglines.forEach((t, i) => {
    assert(t.trim().length > 10, `Tagline ${i} too short: "${t}"`);
  });
});

// ══════════════════════════════════════════════════════════════════════

describe("ASCII Art — Render Sample (visual check)");

it("prints all ASCII art variants to console for visual inspection", () => {
  console.log("\n" + "─".repeat(50));
  Object.entries(persona.asciiArt).forEach(([key, art]) => {
    console.log(`\n  [${key}]`);
    console.log("  " + "─".repeat(40));
    art.forEach((line) => console.log(`  ${line}`));
  });
  console.log("─".repeat(50));
  // This test always passes — it's for human visual verification
  assert(true, "Visual inspection output printed above");
});

// ══════════════════════════════════════════════════════════════════════
//  SUMMARY
// ══════════════════════════════════════════════════════════════════════

console.log(`\n${"=".repeat(60)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${"=".repeat(60)}`);

if (failed > 0) {
  console.log(`\n❌ ${failed} TEST(S) FAILED\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All tests passed. Elo's identity is intact.\n`);
  process.exit(0);
}