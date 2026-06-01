/* Neural network animated background — subtle, performant. */
const { useRef, useEffect } = React;

function NeuralBackground({ intensity = "subtle" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let nodes = [];
    let w = 0, h = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const cfg = {
      subtle: { count: 42, link: 160, speed: 0.12, alpha: 0.55 },
      medium: { count: 70, link: 180, speed: 0.18, alpha: 0.75 },
      dense:  { count: 110, link: 200, speed: 0.22, alpha: 0.95 },
    }[intensity] || { count: 42, link: 160, speed: 0.12, alpha: 0.55 };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      spawn();
    }

    function spawn() {
      nodes = [];
      for (let i = 0; i < cfg.count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * cfg.speed,
          vy: (Math.random() - 0.5) * cfg.speed,
          r: Math.random() * 1.2 + 0.4,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);

      // links first
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < cfg.link) {
            const o = (1 - d / cfg.link) * 0.45 * cfg.alpha;
            ctx.strokeStyle = `rgba(0, 255, 157, ${o})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.015;
        if (n.x < -10) n.x = w + 10;
        if (n.x > w + 10) n.x = -10;
        if (n.y < -10) n.y = h + 10;
        if (n.y > h + 10) n.y = -10;

        const pulse = (Math.sin(n.pulse) + 1) * 0.8;
        const a = (0.4 + pulse * 0.5) * cfg.alpha;
        ctx.fillStyle = `rgba(0, 255, 157, ${a})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        // soft glow on bigger nodes
        if (n.r > 1) {
          ctx.fillStyle = `rgba(0, 255, 157, ${a * 0.4})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [intensity]);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}

Object.assign(window, { NeuralBackground });