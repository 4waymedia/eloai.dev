# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- SEO optimization (titles, meta descriptions, Open Graph)
- Site favicon and social share images
- Performance optimization pass
- Accessibility audit

---

## [1.0.0] - 2026-06-01

### Added
- Initial release of eloai.dev website
- Homepage with hero section, feature highlights, and CTA (`website/index.html`)
- About page with project overview, mission, and background (`website/about.html`)
- Blog listing page with article card layout (`website/blog.html`)
- Cognitive Architecture page with technical deep-dive (`website/cognitive-architecture.html`)
- Hidden ELO persona easter egg page (`website/elo.html`) with `noindex, nofollow`
- Hidden ELO v2 persona page (`website/elov2.html`)
- Hidden ELO v1 archive page (`website/elo-v1.html`)
- Neural background particle animation component (`website/neural-bg.jsx`)
- Tweaks panel for runtime visual customization (`website/tweaks-panel.jsx`)
- Reusable sections layout component (`website/sections.jsx`)
- App entry point component (`website/app.jsx`)
- Responsive stylesheet with 3 breakpoints (`website/styles.css`)
- Apache `.htaccess` for URL rewriting and caching (`website/.htaccess`)
- Site structure documentation (`docs/SITE-STRUCTURE.md`)
- Easter egg discovery plan (`docs/features/elo-easter-eggs.md`)
- Features roadmap (`docs/features/roadmap.md`)
- Project plan (`docs/planning/project-plan.md`)
- Quick deploy guide (`docs/technical/QuickDeploy.md`)
- AI content workflow docs (`docs/technical/ai-content-workflow.md`)
- Chat-to-content guide (`docs/technical/chat-to-content-guide.md`)
- Claude content tool docs (`docs/technical/claude-content-tool.md`)
- Technical README (`docs/technical/README.md`)
- Changelog (this file)
- Deployment guide (`deploy/DEPLOYMENT-GUIDE.md`)
- Deployment README (`deploy/README.md`)
- Data extraction pipeline (`data/extracted/` — 17 JSON files)
- Derived data (`data/derived/` — 3 JSON files)
- Validation reports (`data/validation/`)
- Research docs for ChatGPT, Claude, DeepSeek, Gemini, Grok memory architectures
- `package.json` with `serve` dev server and SSH deploy script
- `.gitignore` with Node, Python, IDE, OS, database exclusions

### Changed
- N/A (initial release)

### Fixed
- N/A (initial release)

---

## [0.1.0] - 2026-05-15

### Added
- Project initialization
- Basic website structure with `website/` directory
- Development environment setup with `serve` on port 3000
- Data pipeline foundation with KuzuDB graph database
- Documentation scaffolding (`docs/` directory structure)
- Planning docs (project plan, roadmap, site structure)

---

## Version History

| Version | Release Date | Key Changes |
|---------|--------------|-------------|
| 1.0.0 | 2026-06-01 | Initial launch — 7 HTML pages, 4 JSX components, easter eggs, data pipeline, full docs |
| 0.1.0 | 2026-05-15 | Project start — structure, dev environment, documentation scaffolding |

## Release Checklist

Before each release, ensure:

- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Changelog is updated
- [ ] Version numbers are updated (package.json)
- [ ] Build is successful
- [ ] Deployment is tested (SSH to 4waytours.com)
- [ ] Browser compatibility is verified (Chrome, Firefox, Safari, Edge)
- [ ] Performance benchmarks are met (< 2s load time)
- [ ] Easter egg links functional on all pages
- [ ] Robots tags present on hidden pages

## Notes

- Add entries to the "Unreleased" section as you work
- Move to a versioned section upon release
- Use past tense for completed changes
- Be specific about what changed and why
- The `[Unreleased]` section tracks work-in-progress for the next version