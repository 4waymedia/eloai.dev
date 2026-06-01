# Features Roadmap - eloai.dev

## Overview

This document outlines the planned features and development roadmap for eloai.dev — the public website for ELO (Exploratory Learning Organism), an AI cognitive architecture research project.

## Feature Priority Legend

- **P0** - Critical/Must Have (Launch blocking)
- **P1** - High Priority (Important for launch)
- **P2** - Medium Priority (Post-launch)
- **P3** - Low Priority (Nice to have)

## Current Version: v1.0.0 (In Development)

### Core Features (Launch)

| Feature | Priority | Status | Description | Target Release |
|---------|----------|--------|-------------|----------------|
| Homepage | P0 | ✅ Complete | Main landing page with hero section, features, CTA | v1.0.0 |
| About Page | P0 | ✅ Complete | Project info, mission, background | v1.0.0 |
| Blog Section | P1 | ✅ Complete | Blog listing with article cards and individual posts | v1.0.0 |
| Cognitive Architecture Page | P1 | ✅ Complete | Architecture overview, components, technical details | v1.0.0 |
| Responsive Design | P0 | ✅ Complete | Mobile-friendly design with 3 breakpoints | v1.0.0 |
| ELO Persona Page (easter egg) | P2 | ✅ Complete | Hidden page at `/elo` with subtle discovery links | v1.0.0 |
| ELO v2 Persona Page | P2 | ✅ Complete | Alternate persona page at `/elov2` | v1.0.0 |
| ELO v1 Archive Page | P3 | ✅ Complete | Original persona page at `/elo-v1` | v1.0.0 |
| Neural Background Animation | P2 | ✅ Complete | Animated particle/network background (neural-bg.jsx) | v1.0.0 |
| Tweaks Panel | P3 | ✅ Complete | Runtime visual customization panel (tweaks-panel.jsx) | v1.0.0 |
| Sections Component | P1 | ✅ Complete | Reusable section layout component (sections.jsx) | v1.0.0 |
| Deployment Pipeline | P0 | 🔄 In Progress | SSH deploy to 4waytours.com | v1.0.0 |
| SEO Optimization | P0 | ⬜ Planned | Titles, meta descriptions, Open Graph, robots tags | v1.0.0 |
| Favicon & Assets | P1 | ⬜ Planned | Site favicon, social share images | v1.0.0 |

### Post-Launch Features

| Feature | Priority | Status | Description | Target Release |
|---------|----------|--------|-------------|----------------|
| Blog Content Pipeline | P1 | ⬜ Planned | Establish regular content publishing schedule | v1.1.0 |
| Search Functionality | P2 | ⬜ Planned | Site-wide search | v1.1.0 |
| Newsletter Signup | P2 | ⬜ Planned | Email subscription | v1.1.0 |
| Console Easter Eggs | P3 | ⬜ Planned | Hidden ASCII art and messages in browser console | v1.1.0 |
| Konami Code Navigation | P3 | ⬜ Planned | Secret key sequence to navigate to ELO pages | v1.1.0 |
| Dark Mode Toggle | P3 | ⬜ Planned | Theme switching | v1.2.0 |
| Discovery Counter | P3 | ⬜ Planned | Track how many easter eggs each visitor finds | v1.2.0 |
| Multi-language Support | P3 | ⬜ Planned | Internationalization | v2.0.0 |

## Feature Specifications

### Homepage
**Description:** The main landing page that introduces visitors to eloai.dev and the ELO project  
**File:** `website/index.html`

**Requirements:**
- Hero section with project tagline
- Feature highlights with the ELO cognitive architecture
- Call-to-action buttons
- Navigation to key sections
- Easter egg links to hidden ELO persona pages

**Acceptance Criteria:**
- [x] Loads content at interactive speed
- [x] Responsive on all device sizes
- [x] Clear visual hierarchy
- [ ] WCAG 2.1 AA accessibility
- [x] Easter egg links functional and subtle

### About Page
**Description:** Page explaining the ELO project, its purpose, and background  
**File:** `website/about.html`

**Requirements:**
- Project overview
- Mission/vision statement
- Background and research context
- Links to related resources
- Easter egg links to hidden persona pages

**Acceptance Criteria:**
- [x] Clear and concise content
- [x] Engaging visuals with neural background
- [x] Easy navigation
- [x] Easter egg links functional

### Blog Section
**Description:** Section for articles, updates, and research content  
**File:** `website/blog.html`

**Requirements:**
- Blog listing page with article cards
- Individual post template
- Category/tag filtering
- Social sharing capability

**Acceptance Criteria:**
- [x] Easy to read layout
- [ ] Functional filtering
- [ ] Regular content published

### Cognitive Architecture Page
**Description:** Deep dive into the ELO cognitive architecture  
**File:** `website/cognitive-architecture.html`

**Requirements:**
- Concept overview and introduction
- Architecture components explained
- Technical details and specifications
- Visual diagrams
- Easter egg links to persona pages

**Acceptance Criteria:**
- [x] Accurate technical content
- [x] Engaging presentation
- [x] Easter egg links functional

### ELO Persona Pages (Easter Eggs)
**Description:** Hidden pages accessible only through subtle link discoveries  
**Files:** `website/elo.html`, `website/elov2.html`, `website/elo-v1.html`

**Requirements:**
- Not linked from primary navigation
- Discovered via styled easter egg links on public pages
- `noindex, nofollow` robot tags
- Immersive persona presentation

**Acceptance Criteria:**
- [x] Hidden from search engines
- [x] Subtle, glow-on-hover easter egg links on all pages
- [x] Framing message: "If you found this page, you were meant to"
- [ ] Console log easter egg with ASCII art
- [ ] Konami code shortcut

## Backlog

### Ideas for Future Consideration
- [ ] Interactive demos on persona pages
- [ ] User accounts
- [ ] Comments system
- [ ] Analytics dashboard
- [ ] API access for data pipeline
- [ ] Multiple interconnected hidden persona pages
- [ ] Visitor easter egg discovery counter
- [ ] Animated page transitions between persona identities

## Notes

- Features may be reprioritized based on user feedback
- Timeline estimates are subject to change
- All features should go through design review before development
- Easter egg features should remain subtle — the discovery experience is part of the product
- The data pipeline (data/extracted/, data/derived/, data/graph/) runs independently from the website