# Site Structure - eloai.dev

## Overview

This document outlines the complete site structure and information architecture for eloai.dev.

## Site Map

```
eloai.dev/
│
├── / (Homepage)
│   ├── Hero Section
│   ├── Features/Highlights
│   ├── Call-to-Action
│   └── Footer
│
├── /about
│   ├── Project Overview
│   ├── Mission & Vision
│   ├── Team (if applicable)
│   └── Related Resources
│
├── /blog
│   ├── Blog Listing
│   │   ├── Category Filter
│   │   └── Article Cards
│   └── /blog/[post-slug]
│       ├── Article Content
│       ├── Author Info
│       ├── Related Posts
│       └── Social Sharing
│
├── /cognitive-architecture
│   ├── Concept Overview
│   ├── Architecture Diagram
│   ├── Components
│   └── Technical Details
│
└── [Additional pages as needed]
```

## Page Details

### 1. Homepage (`index.html`)

**Purpose:** Main landing page that introduces visitors to eloai.dev

**Key Elements:**
- Hero section with project tagline
- Feature highlights
- Navigation to key sections
- Call-to-action buttons
- Footer with links

**Content Structure:**
```
Header
├── Logo
├── Navigation Menu
│   ├── Home
│   ├── About
│   ├── Blog
│   └── Cognitive Architecture
└── [Mobile Menu Toggle]

Hero Section
├── Main Headline
├── Subheadline/Tagline
├── CTA Buttons
└── Visual Element

Features Section
├── Feature 1
├── Feature 2
└── Feature 3

Footer
├── Quick Links
├── Social Links
└── Copyright
```

**SEO:**
- Title: eloai.dev - [Tagline]
- Meta Description: [Description]
- Keywords: [Keywords]

---

### 2. About Page (`about.html`)

**Purpose:** Provide information about the project, its purpose, and background

**Key Elements:**
- Project overview
- Mission/vision statement
- Background story
- Team information (if applicable)
- Links to related resources

**Content Structure:**
```
Header (same as homepage)

About Content
├── Introduction
├── Our Story
├── Mission & Vision
├── Team Members (optional)
└── Contact/Connect

Footer (same as homepage)
```

**SEO:**
- Title: About - eloai.dev
- Meta Description: Learn about eloai.dev and our mission
- Keywords: about, project, mission

---

### 3. Blog Section (`blog.html`)

**Purpose:** Showcase articles, updates, and content

**Key Elements:**
- Blog listing with cards
- Category/tag filtering
- Search functionality (future)
- Individual post pages

**Content Structure:**
```
Header (same as homepage)

Blog Listing
├── Page Title
├── Filter/Category Bar
├── Article Grid
│   ├── Article Card 1
│   ├── Article Card 2
│   └── Article Card 3
└── Pagination (if needed)

Footer (same as homepage)
```

**Individual Post Template:**
```
Header

Article
├── Article Header
│   ├── Title
│   ├── Author
│   ├── Date
│   └── Category
├── Featured Image
├── Article Content
├── Tags
├── Social Sharing
└── Related Posts

Footer
```

**SEO:**
- Title: Blog - eloai.dev
- Meta Description: Articles and updates from eloai.dev
- Keywords: blog, articles, updates

---

### 4. Cognitive Architecture Page (`cognitive-architecture.html`)

**Purpose:** Explain the cognitive architecture concept/project

**Key Elements:**
- Concept overview
- Architecture diagram
- Component explanations
- Technical details

**Content Structure:**
```
Header (same as homepage)

Cognitive Architecture Content
├── Introduction
├── Architecture Overview
│   ├── Diagram/Visualization
│   └── Key Concepts
├── Components
│   ├── Component 1
│   ├── Component 2
│   └── Component 3
├── Technical Details
└── Resources/References

Footer (same as homepage)
```

**SEO:**
- Title: Cognitive Architecture - eloai.dev
- Meta Description: Explore the cognitive architecture behind eloai.dev
- Keywords: cognitive, architecture, AI

---

## Navigation Structure

### Primary Navigation
- Home
- About
- Blog
- Cognitive Architecture

### Footer Navigation
- Quick Links (same as primary)
- Social Media Links
- Copyright/ Legal

### Mobile Navigation
- Hamburger menu with same links
- Collapsible sections

## URL Structure

| Page | URL | Template |
|------|-----|----------|
| Homepage | `/` | `index.html` |
| About | `/about` | `about.html` |
| Blog | `/blog` | `blog.html` |
| Blog Post | `/blog/[post-slug]` | Dynamic |
| Cognitive Architecture | `/cognitive-architecture` | `cognitive-architecture.html` |

## Content Hierarchy

### H1 Tags
- One per page
- Main page title

### H2 Tags
- Major sections within pages
- Consistent styling

### H3 Tags
- Subsections within H2 sections
- Supporting content

## Internal Linking Strategy

### Homepage
- Links to all main pages
- Links to featured blog posts
- Links to key resources

### About
- Links to team member profiles (if any)
- Links to related projects
- Links to contact/connect options

### Blog
- Links to related posts
- Links to category pages
- Links to author profiles

### Cognitive Architecture
- Links to technical documentation
- Links to related research
- Links to resources

## Responsive Design Breakpoints

| Breakpoint | Width | Target Devices |
|------------|-------|----------------|
| Mobile | < 768px | Phones |
| Tablet | 768px - 1024px | Tablets |
| Desktop | > 1024px | Desktops/Laptops |

## Accessibility Considerations

- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance (WCAG 2.1 AA)
- Focus indicators
- Alt text for images

## Performance Considerations

- Lazy loading for images
- Optimized image sizes
- Minified CSS/JS
- Caching strategies
- CDN for static assets

## Future Pages/Sections

- [ ] Contact page
- [ ] Resources/Tools page
- [ ] FAQ page
- [ ] Documentation section
- [ ] Community page

---

*Last updated: [Date]*