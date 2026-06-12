/* EloAI.dev — landing page sections */
const { useState, useEffect, useMemo, useRef, createElement } = React;
const NeuralBackground = window.NeuralBackground;

/* ---------- tiny markdown renderer (h1, p, em, strong, hr, arrow ↦) ---------- */
function renderMarkdown(md) {
  const blocks = md.trim().split(/\n---\n/);
  return blocks.map((block, i) => {
    const lines = block.trim().split("\n");
    const dateLine = lines[0].replace(/^#\s*/, "");
    // first line is `# YYYY.MM.DD — Title`
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
  return React.createElement("nav", { className: "nav" },
    React.createElement("div", { className: "shell nav-inner" },
      React.createElement("a", { href: "index.html", className: "logo" },
        React.createElement("span", { className: "logo-mark" }),
        "ELOAI"
      ),
      React.createElement("div", { className: "nav-links" },
        React.createElement("a", { href: "index.html#projects", className: active === "projects" ? "nav-active" : "" }, "Projects"),
        React.createElement("a", { href: "blog.html", className: active === "blog" ? "nav-active" : "" }, "Blog"),
        React.createElement("a", { href: "about.html", className: active === "about" ? "nav-active" : "" }, "About"),
        React.createElement("a", { href: "cognitive-architecture.html", className: active === "thesis" ? "nav-active" : "" }, "Thesis")
      ),
      React.createElement("a", { href: "cognitive-architecture.html", className: "nav-cta" }, "Read thesis →")
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
        React.createElement("span", null, "Research lab · Independent"),
        React.createElement("span", null, "Latency 17ms · 10 active programs")
      ),
      React.createElement("h1", { className: "hero-title" },
        "Building the future of ",
        React.createElement("a", { href: "elo.html", className: "easter-egg" }, "artificial consciousness"),
        "."
      ),
      React.createElement("p", { className: "hero-sub" },
        "EloAI is an independent research lab engineering systems that understand, reason, and evolve — pushing past today's frontier toward agents that hold a stable model of themselves and their world."
      ),
      React.createElement("div", { className: "hero-actions" },
        React.createElement("a", { href: "#projects", className: "btn btn-primary" },
          "Explore our frontiers",
          React.createElement("span", { className: "arrow" }, "→")
        ),
        React.createElement("a", { href: "#discoveries", className: "btn btn-ghost" }, "Latest discoveries")
      )
    ),
    React.createElement("div", { className: "hero-strip" },
      React.createElement("div", { className: "shell" },
        React.createElement("div", { className: "hero-strip-inner" },
          React.createElement("div", { className: "hero-strip-cell" },
            React.createElement("span", { className: "hero-strip-key" }, "Active programs"),
            React.createElement("span", { className: "hero-strip-val" }, React.createElement("span", { className: "accent" }, "06"), " / running")
          ),
          React.createElement("div", { className: "hero-strip-cell" },
            React.createElement("span", { className: "hero-strip-key" }, "Lab uptime"),
            React.createElement("span", { className: "hero-strip-val" }, "99.982", React.createElement("span", { className: "accent" }, "%"))
          ),
          React.createElement("div", { className: "hero-strip-cell" },
            React.createElement("span", { className: "hero-strip-key" }, "Compute"),
            React.createElement("span", { className: "hero-strip-val" }, "H200 · ", React.createElement("span", { className: "accent" }, "distributed"))
          ),
          React.createElement("div", { className: "hero-strip-cell" },
            React.createElement("span", { className: "hero-strip-key" }, "Last commit"),
            React.createElement("span", { className: "hero-strip-val" }, "14m ago")
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
          React.createElement("span", { className: "eyebrow" }, "02 · Active frontiers"),
          React.createElement("h2", { className: "section-title" }, "Programs currently running in the lab.")
        ),
        React.createElement("p", { className: "section-sub" },
          "Each program is a long-horizon bet on a specific mechanism we think is necessary for machine consciousness. They run in parallel and cross-pollinate."
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
          React.createElement("h2", { className: "section-title", style: { marginTop: 18 } }, "A small lab. A long-horizon bet."),
          React.createElement("p", { className: "section-sub", style: { marginTop: 20 } },
            "EloAI is an independent research operation — no VC pressure, no publication quotas. We run programs that take months, publish when the work is real, and ship every system we build to ",
            React.createElement("span", { className: "glow-text" }, "eloai.dev"),
            " subdomains."
          ),
          React.createElement("a", { href: "about.html", className: "btn btn-ghost", style: { marginTop: 40, display: "inline-flex" } }, "About the lab →")
        ),
        React.createElement("div", { className: "about-stats" },
          [
            { key: "Founded", val: "MMXXV" },
            { key: "Programs", val: "06 active" },
            { key: "Mode", val: "Distributed" },
            { key: "Focus", val: "Agentic AI" },
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

/* ---------- Infrastructure / subdomains ---------- */
const SUBDOMAINS = [
  {
    host: "app",
    purpose: "Production agents",
    status: "soon",
    category: "app",
    desc: "Deploy, monitor, and manage long-running AI agents in production environments.",
  },
  {
    host: "research",
    purpose: "Open notebooks",
    status: "soon",
    category: "research",
    desc: "Interactive notebooks exposing experimental findings and reproducible research.",
  },
  {
    host: "agents",
    purpose: "Live deployments",
    status: "building",
    category: "system",
    desc: "Real-time orchestration layer for deploying and routing autonomous agents.",
  },
  {
    host: "atlas",
    purpose: "Long-horizon runner",
    status: "building",
    category: "tool",
    desc: "Multi-day autonomous task execution with goal compression and state tracking.",
  },
  {
    host: "noema",
    purpose: "Cortex sandbox",
    status: "soon",
    category: "research",
    desc: "Experimental cognitive architecture sandbox for perception and memory work.",
  },
  {
    host: "status",
    purpose: "Telemetry",
    status: "soon",
    category: "system",
    desc: "System health, request latency, and uptime across all lab services.",
  },
];

function InfraSection() {
  return React.createElement("section", { className: "infra", id: "infra", "data-screen-label": "05 Infrastructure" },
    React.createElement("div", { className: "shell" },
      React.createElement("div", { className: "section-head" },
        React.createElement("div", { className: "section-title-block" },
          React.createElement("span", { className: "eyebrow" }, "05 · Infrastructure"),
          React.createElement("h2", { className: "section-title" },
            "Every system we ship, reachable on ",
            React.createElement("span", { className: "glow-text" }, "eloai.dev"),
            "."
          )
        ),
        React.createElement("p", { className: "section-sub" },
          "Each subdomain is a self-contained service — versioned, observable, and accessible through a single TLS endpoint."
        )
      ),
      React.createElement("div", { className: "subdomain-cards" },
        SUBDOMAINS.map((s) =>
          React.createElement("a", { key: s.host, className: "subdomain-card", href: `https://${s.host}.eloai.dev` },
            React.createElement("div", { className: "subdomain-card-head" },
              React.createElement("span", { className: "subdomain-card-host" },
                React.createElement("span", { className: "sub" }, s.host),
                React.createElement("span", { className: "root" }, ".eloai.dev")
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
            "Independent research lab building toward ",
            React.createElement("a", { href: "elo.html", className: "easter-egg" }, "artificial consciousness"),
            ". Currently operating from a distributed compute fabric."
          )
        ),
        React.createElement("div", { className: "foot-col" },
          React.createElement("div", { className: "foot-col-title" }, "Lab"),
          React.createElement("ul", null,
            React.createElement("li", null, React.createElement("a", { href: "index.html#projects" }, "Projects")),
            React.createElement("li", null, React.createElement("a", { href: "blog.html" }, "Blog")),
            React.createElement("li", null, React.createElement("a", { href: "index.html#infra" }, "Subdomains"))
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
