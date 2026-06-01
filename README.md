# eloai.dev

**ELO (Exploratory Learning Organism)** — a public-facing website for an AI cognitive architecture research project. The site serves as the primary hub for project information, blog content, interactive demonstrations, and hidden persona pages.

**[Live Site](https://eloai.dev)** · **[License](#license)**

---

## Table of Contents

- [About](#about)
- [Site Structure](#site-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [License](#license)

---

## About

ELO is an exploratory AI cognitive architecture. This website is the public face of the project — presenting the research, architecture, and concepts behind ELO through a layered experience that rewards curiosity.

### Key Features

- **Core Pages:** Homepage, About, Blog, and Cognitive Architecture deep-dive
- **Hidden Persona Pages:** Easter egg pages (`/elo`, `/elov2`, `/elo-v1`) discoverable only through subtle link hints — not linked from primary navigation
- **Interactive Components:** Neural network particle background, runtime visual tweaks panel, reusable section layouts
- **Data Pipeline:** Symbol extraction, dependency resolution, and KuzuDB graph analysis of the project itself

---

## Site Structure

| Page | URL | Description |
|------|-----|-------------|
| Homepage | `/` | Landing page with hero, features, and CTA |
| About | `/about` | Project overview, mission, and background |
| Blog | `/blog` | Articles and updates |
| Cognitive Architecture | `/cognitive-architecture` | Technical deep-dive into the architecture |
| ELO Persona | `/elo` | Hidden easter egg page |
| ELO v2 | `/elov2` | Hidden alternate persona |
| ELO v1 | `/elo-v1` | Hidden original persona archive |

Full site map and information architecture: [`docs/SITE-STRUCTURE.md`](docs/SITE-STRUCTURE.md)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (for the dev server)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/4waymedia/eloai.dev.git
cd eloai.dev

# Install dev dependencies
npm install

# Start dev server on port 3000
npm run dev
```

The site is static HTML/CSS/JSX — the `serve` package provides a local dev server. Open `http://localhost:3000` in your browser.

---

## Deployment

The site deploys via SSH to `4waytours.com`:

```bash
npm run deploy
```

This tars the `website/` directory and pipes it over SSH to the production server. See [`deploy/DEPLOYMENT-GUIDE.md`](deploy/DEPLOYMENT-GUIDE.md) for full details and troubleshooting.

---

## Project Structure

```
eloai.dev/
├── website/                  # Static site files
│   ├── index.html            # Homepage
│   ├── about.html            # About page
│   ├── blog.html             # Blog listing
│   ├── cognitive-architecture.html  # Architecture deep-dive
│   ├── elo.html              # Hidden ELO persona (easter egg)
│   ├── elov2.html            # Hidden ELO v2 persona
│   ├── elo-v1.html           # Hidden ELO v1 archive
│   ├── app.jsx               # App entry component
│   ├── sections.jsx          # Reusable section layout component
│   ├── tweaks-panel.jsx      # Runtime visual customization panel
│   ├── neural-bg.jsx         # Animated neural network particle background
│   ├── styles.css            # Responsive stylesheet (3 breakpoints)
│   ├── .htaccess             # Apache config (URL rewriting, caching)
│   └── assets/               # Static assets
├── data/                     # Data pipeline
│   ├── extracted/            # Extracted project data (17 JSON files)
│   ├── derived/              # Derived/processed data
│   ├── graph/                # KuzuDB graph database
│   └── validation/           # Validation reports
├── docs/                     # Documentation
│   ├── features/             # Feature specs and easter egg plan
│   ├── planning/             # Project plan
│   ├── technical/            # Deployment, content workflow guides
│   └── updates/              # Changelog
├── deploy/                   # Deployment guides
├── research-docs/            # Memory architecture research (ChatGPT, Claude, etc.)
├── package.json              # Dev server and deploy scripts
└── DEPLOY.md                 # Quick deploy reference
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/planning/project-plan.md`](docs/planning/project-plan.md) | Full project plan with timeline, milestones, risks |
| [`docs/features/roadmap.md`](docs/features/roadmap.md) | Feature roadmap with priorities and statuses |
| [`docs/features/elo-easter-eggs.md`](docs/features/elo-easter-eggs.md) | Easter egg link locations and discovery flow |
| [`docs/SITE-STRUCTURE.md`](docs/SITE-STRUCTURE.md) | Complete site map and information architecture |
| [`docs/technical/QuickDeploy.md`](docs/technical/QuickDeploy.md) | Quick deployment reference |
| [`docs/updates/CHANGELOG.md`](docs/updates/CHANGELOG.md) | Version history and release notes |
| [`deploy/DEPLOYMENT-GUIDE.md`](deploy/DEPLOYMENT-GUIDE.md) | Full deployment guide |

---

## License

This project is private. All rights reserved.