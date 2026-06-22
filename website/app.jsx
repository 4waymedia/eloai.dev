/* EloAI.dev — root app */
/* Components are loaded as global window variables from the
   preceding script type="text/babel" tags in index.html */
const { useState, useEffect } = React;
const {
  useTweaks, TweaksPanel, TweakSection,
  TweakColor, TweakToggle, TweakRadio
} = window;
const { Nav, Hero, ProjectsSection, DiscoveriesSection, AboutSection, InfraSection, Footer } = window;

const TWEAK_DEFAULTS = {
  accent: "#00ff9d",
  bgIntensity: "subtle",
  showBg: true,
  density: "comfortable"
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [projects, setProjects] = useState([]);
  const [discoveriesMd, setDiscoveriesMd] = useState("");
  const [scroll, setScroll] = useState(0);
  const [activeNav, setActiveNav] = useState("");

  // load content
  useEffect(() => {
    fetch("assets/projects.json").then(r => r.json()).then(d => setProjects(d.projects || []));
    fetch("assets/discoveries.md").then(r => r.text()).then(setDiscoveriesMd);
  }, []);

  // apply tweaks to root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-soft", t.accent + "1f");
    root.style.setProperty("--accent-glow", t.accent + "59");
    document.body.dataset.density = t.density;
  }, [t.accent, t.density]);

  // scroll progress + nav active detection
  useEffect(() => {
    const pairs = [
      { id: "top", nav: "" },
      { id: "projects", nav: "projects" },
      { id: "discoveries", nav: "" },
      { id: "about", nav: "about" },
      { id: "infra", nav: "" },
    ].map(p => ({ nav: p.nav, el: document.getElementById(p.id) })).filter(p => p.el);
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      setScroll(max > 0 ? (window.scrollY / max) * 100 : 0);

      const y = window.scrollY + 120;
      let activeIdx = 0;
      for (let i = pairs.length - 1; i >= 0; i--) {
        if (pairs[i].el && pairs[i].el.offsetTop <= y) { activeIdx = i; break; }
      }
      setActiveNav(pairs[activeIdx]?.nav || "");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <React.Fragment>
      <div className="scroll-progress" style={{ width: scroll + "%" }} />
      <Nav active={activeNav} />
      <Hero intensity={t.bgIntensity} showBg={t.showBg} />
      <ProjectsSection projects={projects} />
      <DiscoveriesSection md={discoveriesMd} />
      <AboutSection />
      <InfraSection />
      <Footer />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Accent">
          <TweakColor
            label="Primary"
            value={t.accent}
            options={["#00ff9d", "#00ccff", "#ff6a3d", "#c5a8ff", "#f7f7f7"]}
            onChange={(v) => setTweak("accent", v)}
          />
        </TweakSection>
        <TweakSection label="Hero background">
          <TweakToggle
            label="Neural mesh"
            value={t.showBg}
            onChange={(v) => setTweak("showBg", v)}
          />
          <TweakRadio
            label="Density"
            value={t.bgIntensity}
            options={["subtle", "medium", "dense"]}
            onChange={(v) => setTweak("bgIntensity", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);