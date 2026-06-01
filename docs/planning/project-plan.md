# Project Plan - eloai.dev

## Project Overview

**Project Name:** eloai.dev  
**Description:** Public-facing website for ELO (Exploratory Learning Organism) — an AI cognitive architecture research project. The site serves as the primary hub for project information, blog content, interactive demonstrations, and hidden persona pages.  
**Start Date:** 2026.05.15  
**Target Launch Date:** 2026.06.01

## Goals & Objectives

### Primary Goals
- [x] Launch the eloai.dev website with core pages (index, about, blog, cognitive-architecture)
- [x] Build hidden ELO persona easter egg pages (elo.html, elov2.html, elo-v1.html)
- [x] Implement interactive JSX components (neural background, tweaks panel, sections)
- [ ] Deploy to production (4waytours.com via SSH)
- [ ] Establish content pipeline for blog and updates

### Success Metrics
- [ ] Site loads in under 2 seconds on desktop and mobile
- [ ] All pages responsive across mobile, tablet, and desktop breakpoints
- [ ] Easter egg pages discoverable but not search-indexed
- [ ] Blog content pipeline operational

## Timeline & Milestones

### Phase 1: Foundation ✅
- [x] Complete website structure
- [x] Build core pages (index, about, blog, cognitive-architecture)
- [x] Build JSX components (app, sections, tweaks-panel, neural-bg)
- [x] Create easter egg persona pages (elo, elov2, elo-v1)
- [x] Set up data extraction and graph pipeline
- [x] Write documentation (SITE-STRUCTURE, easter-eggs plan, quick deploy guide)
- [x] Initialize git repository and initial commit

### Phase 2: Content Development 🔄
- [x] Develop easter egg discovery system
- [ ] Create core blog content
- [ ] Define content strategy and publishing schedule
- [ ] Build interactive demos on persona pages

### Phase 3: Launch Preparation
- [ ] SEO optimization (titles, meta descriptions, Open Graph)
- [ ] Performance optimization (minification, caching, lazy loading)
- [ ] Favicon and asset creation
- [ ] Browser compatibility testing
- [ ] Mobile responsiveness QA
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Final content review

### Phase 4: Launch
- [ ] Deploy to production (4waytours.com)
- [ ] Verify live site and redirects
- [ ] Monitor performance and errors
- [ ] Start content publishing schedule

## Team & Responsibilities

| Role | Person | Responsibilities |
|------|--------|------------------|
| Project Lead | 4waymedia | Overall project management, content, deployment |
| Developer | 4waymedia | Technical implementation, JSX components, site architecture |
| Content | 4waymedia | Blog content, page copy, persona pages |
| Design | 4waymedia | Visual design, CSS, interactive components |

## Resources

### Tools & Software
- **IDE:** Visual Studio Code with GitHub Copilot
- **Version Control:** Git, hosted on GitHub (github.com/4waymedia/eloai.dev)
- **Dev Server:** `serve` (npm package) on port 3000
- **Deployment:** SSH to 4waytours.com (hosting provider)
- **Languages:** HTML, CSS, JSX, Python (data pipeline)
- **Data:** KuzuDB for graph data, JSON for extracted/derived data

### Budget
- Domain: eloai.dev (registered)
- Hosting: 4waytours.com VPS
- Development tools: Free/open-source

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|---------------------|
| SSH deployment issues | Medium | Medium | Documented in deploy/DEPLOYMENT-GUIDE.md; manual fallback via FTP |
| Easter egg pages indexed by search | Low | Low | Robots `noindex, nofollow` meta tags on all hidden pages |
| Browser compatibility (JSX) | Medium | Low | Test across Chrome, Firefox, Safari, Edge before launch |
| Content pipeline stalls | Medium | Medium | Schedule dedicated content creation blocks; use AI-assisted content workflow |

## Notes

- ELO persona pages are intentionally hidden from primary navigation — discovered via subtle easter egg links styled with `text-faint` color and glow-on-hover effects
- The tweaks panel (`tweaks-panel.jsx`) enables runtime visual customization of the site
- Neural background (`neural-bg.jsx`) provides an animated particle/network visualization
- Data pipeline extracts symbols, dependencies, endpoints, and builds a KuzuDB graph for analysis
- `.htaccess` configured for URL rewriting and caching