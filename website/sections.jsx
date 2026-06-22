/* EloAI.dev — landing page sections */
const { useState, useEffect, useMemo, useRef, createElement } = React;
const NeuralBackground = window.NeuralBackground;

/* ---------- tiny markdown renderer (h1, p, em, strong, hr, arrow ↦) ---------- */
function renderMarkdown(md) {
  const blocks = md.trim().split(/\n---\n/);
  return blocks.map((block, i) => {
    const lines = block.trim().split("\n");
    const dateLine = lines[0].replace(/^#\s*/, "");
    // first line is `# YYYY.MM.DD — Title`. Re
    const [date, ...titleParts] = dateLine.split(/—|–|-/);
    const title = titleParts.join("—").trim();
    const body = lines.slice(1).join("\n").trim();
    const paragraphs = body.split(/\n\n+/);
    return { date: date.trim(), title, paragraphs, key: i };
  });
}

function inlineMd(text) {
  // bold, italic, simple
  const parts = [];
  let remaining = text;
  let key = 0;
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(React.createElement("strong", { key: key++ }, token.slice(2, -2)));
    } else {
      parts.push(React.createElement("em", { key: key++ }, token.slice(1, -1)));
    }
    lastIndex = m.index + token.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/* ---------- Nav ---------- */
function Nav({ active }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navRef = React.useRef(null);

  // close on click outside
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onDocClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [mobileOpen]);

  // close on escape
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onEsc = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [mobileOpen]);

  // prevent body scroll when mobile menu open
  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggle = () => setMobileOpen((v) => !v);
  const close = () => setMobileOpen(false);

  return React.createElement("nav", { ref: navRef, className: "nav" },
    React.createElement("div", { className: "shell nav-inner" },
      React.createElement("a", { href: "index.html", className: "logo", onClick: close },
        React.createElement("span", { className: "logo-mark" }),
        "ELOAI"
      ),
      React.createElement("div", { className: "nav-links" },
        React.createElement("a", { href: "index.html#projects", className: active === "projects" ? "nav-active" : "" }, "Projects"),
        React.createElement("a", { href: "blog.html", className: active === "blog" ? "nav-active" : "" }, "Blog"),
        React.createElement("a", { href: "about.html", className: active === "about" ? "nav-active" : "" }, "About"),
        React.createElement("a", { href: "cognitive-architecture.html", className: active === "thesis" ? "nav-active" : "" }, "Thesis")
      ),
      React.createElement("button", {
        className: "nav-toggle" + (mobileOpen ? " active" : ""),
        onClick: toggle,
        "aria-label": "Toggle navigation menu",
        "aria-expanded": mobileOpen
      },
        React.createElement("span", null),
        React.createElement("span", null),
        React.createElement("span", null)
      ),
      React.createElement("a", { href: "cognitive-architecture.html", className: "nav-cta" }, "Read thesis →")
    ),
    React.createElement("div", { className: "nav-mobile" + (mobileOpen ? " open" : "") },
      React.createElement("div", { className: "shell" },
        React.createElement("div", { className: "nav-mobile-links" },
          React.createElement("a", {
            href: "index.html#projects",
            className: active === "projects" ? "nav-mobile-active" : "",
            onClick: close
          }, "Projects"),
          React.createElement("a", {
            href: "blog.html",
            className: active === "blog" ? "nav-mobile-active" : "",
            onClick: close
          }, "Blog"),
          React.createElement("a", {
            href: "about.html",
            className: active === "about" ? "nav-mobile-active" : "",
            onClick: close
          }, "About"),
          React.createElement("a", {
            href: "cognitive-architecture.html",
            className: active === "thesis" ? "nav-mobile-active" : "",
            onClick: close
          }, "Thesis")
        ),
        React.createElement("a", {
          href: "cognitive-architecture.html",
          className: "nav-mobile-cta",
          onClick: close
        }, "Read thesis →")
      )
    )
  );
}

/* ---------- Hero ---------- */
function Hero({ intensity, showBg }) {
  return React.createElement("section", { className: "hero", id: "top", "data-screen-label": "01 Hero" },
    showBg && React.createElement("div", { className: "hero-bg" },
      React.createElement(NeuralBackground, { intensity: intensity })
    ),
    React.createElement("div", { className: "hero-vignette" }),
    React.createElement("div", { className: "shell hero-content" },
      React.createElement("div", { className: "hero-meta" },
        React.createElement("span", null, React.createElement("span", { className: "dot" }), "Operational · MMXXVI"),
        React.createElement("span", null, "Self-teaching AI · Eight systems"),
        React.createElement("span", null, "8 defined · 2 validated"),
        React.createElement("span", null, "Orchestrator · Irin v0.1.0")
      ),
      React.createElement("h1", { className: "hero-title" },
        "Eight systems. One ",
        React.createElement("a", { href: "elo.html", className: "easter-egg" }, "organism"),
        "."
      ),
      React.createElement("p", { className: "hero-sub" },
        "The first AI to teach itself — eight cognitive systems that together form something capable of intention, perception, memory, curiosity, emotion, reasoning, connection, and reflection."
      ),
      React.createElement("div", { className: "hero-actions" },
        React.createElement("a", { href: "#projects", className: "btn btn-primary" },
          "Explore the 8 systems",
          React.createElement("span", { className: "arrow" }, "→")
        ),
        React.createElement("a", { href: "#discoveries", className: "btn btn-ghost" }, "Latest discoveries")
      )
    ),
    React.createElement("div", { className: "hero-strip" },
      React.createElement("div", { className: "shell" },
        React.createElement("div", { className: "hero-strip-inner" },
          React.createElement("div", { className: "hero-strip-cell" },
            React.createElement("span", { className: "hero-strip-key" }, "Active systems"),
            React.createElement("span", { className: "hero-strip-val" }, React.createElement("span", { className: "accent" }, "08"), " / running")
          ),
          React.createElement("div", { className: "hero-strip-cell" },
            React.createElement("span", { className: "hero-strip-key" }, "Substrate"),
            React.createElement("span", { className: "hero-strip-val" }, "v0.3.1 · ", React.createElement("span", { className: "accent" }, "ELO"))
          ),
          React.createElement("div", { className: "hero-strip-cell" },
            React.createElement("span", { className: "hero-strip-key" }, "Memory"),
            React.createElement("span", { className: "hero-strip-val" }, "Mneme · ", React.createElement("span", { className: "accent" }, "Phase 3"))
          ),
          React.createElement("div", { className: "hero-strip-cell" },
            React.createElement("span", { className: "hero-strip-key" }, "Identity"),
            React.createElement("span", { className: "hero-strip-val" }, React.createElement("span", { className: "accent" }, "Self-teaching"))
          )
        )
      )
    )
  );
}

/* ---------- Projects ---------- */
function ProjectCard({ p }) {
  const ref = useRef(null);
  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 100;
    const my = ((e.clientY - r.top) / r.height) * 100;
    ref.current.style.setProperty("--mx", mx + "%");
    ref.current.style.setProperty("--my", my + "%");
  };
  return React.createElement("article", { ref: ref, className: "project", onMouseMove: onMove, "data-id": p.id },
    React.createElement("div", { className: "project-head" },
      React.createElement("span", { className: "project-glyph" }, p.glyph),
      React.createElement("span", { className: "project-code" }, p.code)
    ),
    React.createElement("h3", { className: "project-title" }, p.title),
    React.createElement("p", { className: "project-desc" }, p.description),
    React.createElement("div", { className: "project-foot" },
      React.createElement("span", { className: `project-status ${p.status}` },
        React.createElement("span", { className: "dot" }), p.status, " · ", p.phase
      ),
      React.createElement("span", { className: "project-arrow" }, "↗")
    )
  );
}

function ProjectsSection({ projects }) {
  return React.createElement("section", { className: "section", id: "projects", "data-screen-label": "02 Projects" },
    React.createElement("div", { className: "shell" },
      React.createElement("div", { className: "section-head" },
        React.createElement("div", { className: "section-title-block" },
          React.createElement("span", { className: "eyebrow" }, "02 · The 8 systems"),
          React.createElement("h2", { className: "section-title" }, "Eight systems of developmental intelligence.")
        ),
        React.createElement("p", { className: "section-sub" },
          "Each system is a distinct cognitive faculty — mathematically grounded, built in sequence from the substrate up. Two are shipped and validated; the rest are in progress."
        )
      ),
      React.createElement("div", { className: "projects" },
        projects.map((p) => React.createElement(ProjectCard, { key: p.id, p: p }))
      )
    )
  );
}

/* ---------- Discoveries ---------- */
function DiscoveriesSection({ md }) {
  const entries = useMemo(() => renderMarkdown(md), [md]);
  const [active, setActive] = useState(entries[0]?.key ?? 0);
  const feedRef = useRef(null);

  // scroll-spy
  useEffect(() => {
    const els = Array.from(feedRef.current?.querySelectorAll("[data-disc]") || []);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (ents) => {
        const visible = ents
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(parseInt(visible.target.dataset.disc, 10));
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [entries.length]);

  return React.createElement("section", { className: "section", id: "discoveries", "data-screen-label": "03 Discoveries" },
    React.createElement("div", { className: "shell" },
      React.createElement("div", { className: "section-head" },
        React.createElement("div", { className: "section-title-block" },
          React.createElement("span", { className: "eyebrow" }, "03 · Field notes"),
          React.createElement("h2", { className: "section-title" }, "Latest discoveries from the bench.")
        ),
        React.createElement("p", { className: "section-sub" },
          "Unfiltered research updates — positive results, negative results, things we didn't expect. Published as they happen."
        )
      ),
      React.createElement("div", { className: "discoveries-layout" },
        React.createElement("aside", { className: "discoveries-index" },
          entries.map((e) =>
            React.createElement("button", {
              key: e.key,
              className: active === e.key ? "active" : "",
              onClick: () => {
                const el = document.querySelector(`[data-disc="${e.key}"]`);
                if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
              }
            }, e.date)
          )
        ),
        React.createElement("div", { className: "discoveries-feed", ref: feedRef },
          entries.map((e) =>
            React.createElement("article", { className: "discovery", "data-disc": e.key, key: e.key },
              React.createElement("div", { className: "discovery-date" }, e.date),
              React.createElement("h2", null, e.title),
              e.paragraphs.map((para, i) =>
                React.createElement("p", { key: i }, inlineMd(para))
              )
            )
          )
        )
      )
    )
  );
}

/* ---------- About (brief, main page) ---------- */
function AboutSection() {
  return React.createElement("section", { className: "section about-band", id: "about", "data-screen-label": "04 About" },
    React.createElement("div", { className: "shell" },
      React.createElement("div", { className: "about-band-grid" },
        React.createElement("div", { className: "about-band-text" },
          React.createElement("span", { className: "eyebrow" }, "04 · About"),
          React.createElement("h2", { className: "section-title", style: { marginTop: 18 } }, "An AI that teaches itself to think."),
          React.createElement("p", { className: "section-sub", style: { marginTop: 20 } },
            "The first AI built on a ",
            React.createElement("span", { className: "glow-text" }, "cognitive architecture"),
            " — eight systems that learn from each other, not from human fine-tuning. Real math. Validated results. No VC pressure, no publication quotas. When the work is real, it goes up."
          ),
          React.createElement("a", { href: "about.html", className: "btn btn-ghost", style: { marginTop: 40, display: "inline-flex" } }, "About Elo →")
        ),
        React.createElement("div", { className: "about-stats" },
          [
            { key: "Identity", val: "Self-teaching" },
            { key: "Systems", val: "08 defined" },
            { key: "Substrate", val: "ELO v0.3.1" },
            { key: "Memory", val: "Mneme" },
          ].map((s) =>
            React.createElement("div", { key: s.key, className: "about-stat" },
              React.createElement("span", { className: "about-stat-val" }, s.val),
              React.createElement("span", { className: "about-stat-key" }, s.key)
            )
          )
        )
      )
    )
  );
}

/* ---------- Infrastructure / substrate ---------- */
const SUBSTRATE = [
  {
    name: "ELO",
    type: "vocabulary",
    status: "live",
    category: "substrate",
    desc: "Dynamic vocabulary — 16M+ entries and growing. Every word and phrase maps to an integer ID. Byte-exact round-trip, portable to C.",
  },
  {
    name: "Mneme",
    type: "memory store",
    status: "live",
    category: "substrate",
    desc: "LMDB temporal-wave storage across 6 sub-databases. 4D cosine retrieval, no ML. Activation under 2ms across 10,000 seeds.",
  },
  {
    name: "Irin",
    type: "orchestrator",
    status: "live",
    category: "runtime",
    desc: "The conductor. A Seed clears the Logic Matrix, then Irin runs it through all eight systems in sequence and returns a structured Reflection result. The only component that knows the order.",
  },
  {
    name: "Logic Matrix",
    type: "attention gate",
    status: "live",
    category: "runtime",
    desc: "329-line admission filter — twelve weighted activation dimensions score each Seed; ~70% are rejected before the pipeline runs. Attention as suppression, not amplification.",
  },
  {
    name: "MemorySeed",
    type: "atomic unit",
    status: "live",
    category: "data",
    desc: "The smallest unit of meaning: entity and concept, a 4D vector, a charge value, a timestamp, and a source type.",
  },
  {
    name: "EPA",
    type: "semantic space",
    status: "live",
    category: "projection",
    desc: "Evaluation · Potency · Activity — a 3D coordinate on every token, so the system can weigh what matters.",
  },
  {
    name: "SeedFlow",
    type: "session buffer",
    status: "live",
    category: "layer",
    desc: "Ingest → flush → activate. Streams new seeds in and connects them across entities and time.",
  },
  {
    name: "Training",
    type: "pipeline",
    status: "building",
    category: "process",
    desc: "Seven-stage developmental training that grows the organism from raw substrate toward identity.",
  },
];

function InfraSection() {
  return React.createElement("section", { className: "infra", id: "infra", "data-screen-label": "05 Infrastructure" },
    React.createElement("div", { className: "shell" },
      React.createElement("div", { className: "section-head" },
        React.createElement("div", { className: "section-title-block" },
          React.createElement("span", { className: "eyebrow" }, "05 · The substrate"),
          React.createElement("h2", { className: "section-title" },
            "The substrate beneath the ",
            React.createElement("span", { className: "glow-text" }, "eight systems"),
            "."
          )
        ),
        React.createElement("p", { className: "section-sub" },
          "Real engineering, not abstractions. Every system above speaks ELO and stores into Mneme; Irin is the runtime that walks a Seed through the pipeline, the Logic Matrix is what decides which Seeds get that far."
        )
      ),
      React.createElement("div", { className: "subdomain-cards" },
        SUBSTRATE.map((s) =>
          React.createElement("a", { key: s.name, className: "subdomain-card", href: "cognitive-architecture.html" },
            React.createElement("div", { className: "subdomain-card-head" },
              React.createElement("span", { className: "subdomain-card-host" },
                React.createElement("span", { className: "sub" }, s.name),
                React.createElement("span", { className: "root" }, " · " + s.type)
              ),
              React.createElement("span", { className: `subdomain-badge ${s.status}` },
                React.createElement("span", { className: "dot" }),
                s.status
              )
            ),
            React.createElement("p", { className: "subdomain-card-desc" }, s.desc),
            React.createElement("div", { className: "subdomain-card-foot" },
              React.createElement("span", { className: "subdomain-cat" }, s.category),
              React.createElement("span", { className: "subdomain-arrow" }, "↗")
            )
          )
        )
      )
    )
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return React.createElement("footer", { className: "foot", id: "contact", "data-screen-label": "06 Footer" },
    React.createElement("div", { className: "shell" },
      React.createElement("div", { className: "foot-grid" },
        React.createElement("div", { className: "foot-brand" },
          React.createElement("a", { href: "index.html", className: "logo" },
            React.createElement("span", { className: "logo-mark" }),
            "ELOAI"
          ),
          React.createElement("p", null,
            "The first AI to teach itself — eight systems, one shared substrate, and a ",
            React.createElement("a", { href: "elo.html", className: "easter-egg" }, "cognitive architecture"),
            " that learns as it grows."
          )
        ),
        React.createElement("div", { className: "foot-col" },
          React.createElement("div", { className: "foot-col-title" }, "Build"),
          React.createElement("ul", null,
            React.createElement("li", null, React.createElement("a", { href: "index.html#projects" }, "Projects")),
            React.createElement("li", null, React.createElement("a", { href: "blog.html" }, "Blog")),
            React.createElement("li", null, React.createElement("a", { href: "index.html#infra" }, "Substrate"))
          )
        ),
        React.createElement("div", { className: "foot-col" },
          React.createElement("div", { className: "foot-col-title" }, "Public"),
          React.createElement("ul", null,
            React.createElement("li", null, React.createElement("a", { href: "cognitive-architecture.html" }, "Thesis")),
            React.createElement("li", null, React.createElement("a", { href: "about.html" }, "About"))
          )
        ),
        React.createElement("div", { className: "foot-col" },
          React.createElement("div", { className: "foot-col-title" }, "Contact"),
          React.createElement("ul", null,
            React.createElement("li", null, React.createElement("a", { href: "mailto:hello@eloai.dev" }, "hello@eloai.dev")),
            React.createElement("li", null, React.createElement("a", { href: "about.html#partnerships" }, "Research partnerships")),
            React.createElement("li", null, React.createElement("a", { href: "about.html#careers" }, "Careers"))
          )
        )
      ),
      React.createElement("div", { className: "foot-bottom" },
        React.createElement("span", null,
          "© MMXXVI · EloAI Research, Ltd",
          React.createElement("a", { href: "elo.html", className: "easter-egg" }, ".")
        ),
        React.createElement("span", null, "Designed in the dark · Built for the frontier")
      )
    )
  );
}

Object.assign(window, { Nav, Hero, ProjectsSection, DiscoveriesSection, AboutSection, InfraSection, Footer });