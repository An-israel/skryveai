// Dependency-free confetti burst. Renders a fixed full-screen canvas and
// animates a one-shot burst of particles, then cleans itself up.
import { useEffect, useRef } from "react";

const COLORS = ["#1E3A5F", "#2563EB", "#059669", "#F59E0B", "#F0FDF4"];

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; rot: number; vr: number; life: number;
}

export function Confetti({ fire = true, durationMs = 2600 }: { fire?: boolean; durationMs?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = window.innerWidth;
    const H = window.innerHeight;
    const particles: Particle[] = [];
    const bursts = [
      { x: W * 0.5, y: H * 0.32 },
      { x: W * 0.2, y: H * 0.4 },
      { x: W * 0.8, y: H * 0.4 },
    ];
    for (const b of bursts) {
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 9;
        particles.push({
          x: b.x, y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          size: 5 + Math.random() * 7,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          life: 1,
        });
      }
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.vy += 0.16;         // gravity
        p.vx *= 0.99;         // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life = Math.max(0, 1 - elapsed / durationMs);
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (elapsed < durationMs) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [fire, durationMs]);

  if (!fire) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      aria-hidden="true"
    />
  );
}
