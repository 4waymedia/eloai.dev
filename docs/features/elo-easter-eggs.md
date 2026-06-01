# ELO Persona Page — Easter Egg Links Plan

## Overview

ELO (Exploratory Learning Organism) is a hidden persona page at `/elo`. The page is not linked from primary navigation — instead, visitors discover it through subtle easter egg links placed on the main site pages. This document tracks all hidden entry points.

## Page

- **URL:** `eloai.dev/elo`
- **File:** `website/elo.html`
- **Robots:** `noindex, nofollow` (hidden from search engines)
- **Status:** ✅ Built

---

## Easter Egg Links

Each link is designed to be subtle — visible only to the observant. The pattern uses `text-faint` color, small font-size, no underline on default, and an `opacity` transition on hover.

### Index page (`index.html`)

| Location | Trigger | Method |
|----------|---------|--------|
| Footer copyright line | Period at end of "EloAI Research, Ltd." | Link the period (`.`) to `elo.html` |
| Hero subheading | "consciousness" in the tagline | Link word to `elo.html` |

### About page (`about.html`)

| Location | Trigger | Method |
|----------|---------|--------|
| Footer brand description | "artificial consciousness" phrase | Link to `elo.html` |
| "Building for the long horizon" section | "genuinely cognitive" phrase | Link to `elo.html` |

### Cognitive Architecture page (`cognitive-architecture.html`)

| Location | Trigger | Method |
|----------|---------|--------|
| Footer brand description | "artificial consciousness" phrase | Link to `elo.html` |
| Position statement pullquote | "cognitive" in "genuinely cognitive" | Link to `elo.html` |

### Blog page (`blog.html`)

| Location | Trigger | Method |
|----------|---------|--------|
| Footer brand description | "artificial consciousness" phrase | Link to `elo.html` |
| Blog hero lede | "unfiltered" | Link to `elo.html` |

---

## Link Styling

```css
.easter-egg {
  color: var(--text-faint);
  text-decoration: none;
  transition: color 300ms ease, text-shadow 300ms ease;
  cursor: pointer;
}
.easter-egg:hover {
  color: var(--accent);
  text-shadow: 0 0 12px var(--accent-glow);
}
```

---

## Discovery Flow

1. Visitor notices an unusually colored word or character
2. Hover reveals accent glow
3. Click leads to the full ELO persona reveal
4. The ELO page itself has a framing note: "If you found this page, you were meant to."

---

## Future Ideas

- [ ] Add more easter eggs on future pages
- [ ] JavaScript-based discovery counter (how many eggs found?)
- [ ] Multiple hidden persona pages connected through a web of easter eggs
- [ ] Console log easter egg with ASCII art of ELO
- [ ] Konami code to navigate to the page

---

*Last updated: 2026.05.29*