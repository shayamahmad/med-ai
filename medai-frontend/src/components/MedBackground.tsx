import React, { useEffect, useRef } from 'react';

const MedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cache as non-null alias so TypeScript stays happy inside all nested functions
    const c: CanvasRenderingContext2D = ctx;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener('resize', onResize);

    // ── TUBE: thick 3D cylindrical tube between two points ──
    function tube(
      x1: number, y1: number, x2: number, y2: number,
      r: number, alpha: number, hue: number
    ) {
      if (r < 0.4 || alpha < 0.01) return;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;
      const nx = -(dy / len), ny = (dx / len);

      // outer glow
      c.beginPath();
      c.moveTo(x1 + nx * (r + 14), y1 + ny * (r + 14));
      c.lineTo(x2 + nx * (r + 14), y2 + ny * (r + 14));
      c.lineTo(x2 - nx * (r + 14), y2 - ny * (r + 14));
      c.lineTo(x1 - nx * (r + 14), y1 - ny * (r + 14));
      c.closePath();
      const g0 = c.createLinearGradient(
        x1 + nx * (r + 14), y1 + ny * (r + 14),
        x1 - nx * (r + 14), y1 - ny * (r + 14)
      );
      g0.addColorStop(0,   `hsla(${hue},100%,55%,0)`);
      g0.addColorStop(0.5, `hsla(${hue},100%,65%,${alpha * 0.28})`);
      g0.addColorStop(1,   `hsla(${hue},100%,55%,0)`);
      c.fillStyle = g0;
      c.fill();

      // tube body with 3D shading
      c.beginPath();
      c.moveTo(x1 + nx * r, y1 + ny * r);
      c.lineTo(x2 + nx * r, y2 + ny * r);
      c.lineTo(x2 - nx * r, y2 - ny * r);
      c.lineTo(x1 - nx * r, y1 - ny * r);
      c.closePath();
      const g1 = c.createLinearGradient(
        x1 + nx * r, y1 + ny * r,
        x1 - nx * r, y1 - ny * r
      );
      g1.addColorStop(0,    `hsla(${hue},100%,10%,${alpha * 0.8})`);
      g1.addColorStop(0.18, `hsla(${hue},100%,35%,${alpha * 0.9})`);
      g1.addColorStop(0.40, `hsla(${hue},90%,80%,${alpha})`);
      g1.addColorStop(0.58, `hsla(${hue},100%,52%,${alpha * 0.9})`);
      g1.addColorStop(0.82, `hsla(${hue},100%,20%,${alpha * 0.75})`);
      g1.addColorStop(1,    `hsla(${hue},100%,7%,${alpha * 0.5})`);
      c.fillStyle = g1;
      c.fill();

      // specular highlight
      c.beginPath();
      c.moveTo(x1 + nx * r * 0.4,  y1 + ny * r * 0.4);
      c.lineTo(x2 + nx * r * 0.4,  y2 + ny * r * 0.4);
      c.lineTo(x2 + nx * r * 0.07, y2 + ny * r * 0.07);
      c.lineTo(x1 + nx * r * 0.07, y1 + ny * r * 0.07);
      c.closePath();
      const g2 = c.createLinearGradient(
        x1 + nx * r * 0.4,  y1 + ny * r * 0.4,
        x1 + nx * r * 0.07, y1 + ny * r * 0.07
      );
      g2.addColorStop(0, `hsla(${hue},50%,98%,${alpha * 0.6})`);
      g2.addColorStop(1, `hsla(${hue},70%,90%,0)`);
      c.fillStyle = g2;
      c.fill();
    }

    // ── SPHERE: glowing nucleotide ball ──
    function sphere(x: number, y: number, r: number, alpha: number, hue: number) {
      if (r < 1 || alpha < 0.01) return;
      const g = c.createRadialGradient(x - r * 0.38, y - r * 0.38, r * 0.04, x, y, r);
      g.addColorStop(0,   `hsla(${hue},60%,97%,${alpha})`);
      g.addColorStop(0.3, `hsla(${hue},100%,70%,${alpha})`);
      g.addColorStop(0.7, `hsla(${hue},100%,38%,${alpha * 0.85})`);
      g.addColorStop(1,   `hsla(${hue},100%,10%,${alpha * 0.3})`);
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      const og = c.createRadialGradient(x, y, r * 0.5, x, y, r * 2.8);
      og.addColorStop(0, `hsla(${hue},100%,68%,${alpha * 0.32})`);
      og.addColorStop(1, `hsla(${hue},100%,50%,0)`);
      c.beginPath();
      c.arc(x, y, r * 2.8, 0, Math.PI * 2);
      c.fillStyle = og;
      c.fill();
    }

    // ── ROTATION GLOW: flare at front-facing crossover points ──
    function rotationGlow(x: number, y: number, intensity: number, hue: number) {
      if (intensity < 0.05) return;
      const r = 28 + intensity * 38;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0,    `hsla(${hue},100%,88%,${intensity * 0.55})`);
      g.addColorStop(0.35, `hsla(${hue},100%,65%,${intensity * 0.28})`);
      g.addColorStop(1,    `hsla(${hue},100%,50%,0)`);
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
    }

    interface StrandPoint {
      x: number; y: number; z: number;
      frac: number; scaleWave: number; alphaWave: number;
      angle: number;
    }

    // ── DRAW HELIX ──
    function drawHelix(
      t: number, vanishAlpha: number, ghost: boolean,
      offX = 0, offY = 0, flip = false
    ): { sA: StrandPoint[]; sB: StrandPoint[] } {
      const ax0 = (flip ? W * 0.95 : W * 0.06) + offX;
      const ay0 = -H * 0.08 + offY;
      const ax1 = (flip ? W * 0.06 : W * 0.95) + offX;
      const ay1 = H * 1.08 + offY;
      const axLen = Math.sqrt((ax1 - ax0) ** 2 + (ay1 - ay0) ** 2);
      const axUx = (ax1 - ax0) / axLen, axUy = (ay1 - ay0) / axLen;
      const axNx = -axUy, axNy = axUx;

      const STEPS = 300;
      const TURNS = 4.2;
      const BASE_R   = W * 0.095 * (ghost ? 0.7 : 1);
      const TUBE_BASE = W * 0.013 * (ghost ? 0.5 : 1);
      const SCROLL = t * 0.22;
      const RUNG_EVERY = Math.round(STEPS / (TURNS * 7));
      const WAVE_SPD = 0.38, WAVE_FREQ = 1.8;
      const wavePhase = t * WAVE_SPD;

      const sA: StrandPoint[] = [];
      const sB: StrandPoint[] = [];

      for (let i = 0; i <= STEPS; i++) {
        const frac  = i / STEPS;
        const along = frac * axLen;
        const mx = ax0 + axUx * along;
        const my = ay0 + axUy * along;
        const angle = frac * TURNS * Math.PI * 2 + SCROLL;
        const zA = Math.sin(angle);
        const scaleWave = 0.5 + 0.5 * Math.abs(Math.sin(frac * Math.PI * WAVE_FREQ - wavePhase));
        const alphaWave = 0.2 + 0.8 * Math.pow(
          Math.abs(Math.sin(frac * Math.PI * WAVE_FREQ - wavePhase + 0.4)), 1.4
        );
        const R = BASE_R * scaleWave;
        sA.push({ x: mx + axNx * Math.cos(angle) * R,           y: my + axNy * Math.cos(angle) * R,           z: zA,  frac, scaleWave, alphaWave, angle });
        sB.push({ x: mx + axNx * Math.cos(angle + Math.PI) * R, y: my + axNy * Math.cos(angle + Math.PI) * R, z: -zA, frac, scaleWave, alphaWave, angle });
      }

      interface DrawCall { type: 'seg' | 'rung'; strand?: 'A' | 'B'; i: number; j?: number; z: number; }
      const calls: DrawCall[] = [];
      const CHUNK = 3;
      for (let i = 0; i < STEPS; i += CHUNK) {
        const j = Math.min(i + CHUNK, STEPS);
        calls.push({ type: 'seg', strand: 'A', i, j, z: (sA[i].z + sA[j].z) / 2 });
        calls.push({ type: 'seg', strand: 'B', i, j, z: (sB[i].z + sB[j].z) / 2 });
      }
      for (let i = 0; i <= STEPS; i += RUNG_EVERY) {
        calls.push({ type: 'rung', i, z: (sA[i].z + sB[i].z) / 2 });
      }
      calls.sort((a, b) => a.z - b.z);

      calls.forEach(call => {
        const depth = (call.z + 1) / 2;
        if (call.type === 'seg') {
          const pts = call.strand === 'A' ? sA : sB;
          const hue = call.strand === 'A' ? 186 : 177;
          for (let k = call.i; k < (call.j ?? call.i) && k + 1 <= STEPS; k++) {
            const p = pts[k], q = pts[k + 1];
            const d  = (p.z + 1) / 2;
            const wa = vanishAlpha * p.alphaWave * (ghost ? 0.09 : 1) * (0.18 + d * 0.8);
            const wr = TUBE_BASE * p.scaleWave * (0.5 + d * 0.72);
            tube(p.x, p.y, q.x, q.y, wr, wa, hue);
            if (!ghost && d > 0.85 && p.scaleWave > 0.7) {
              rotationGlow(p.x, p.y, (d - 0.85) * 6 * p.alphaWave * vanishAlpha, hue);
            }
          }
        } else {
          const a = sA[call.i], b = sB[call.i];
          const wa = vanishAlpha * a.alphaWave * (ghost ? 0.07 : 1) * (0.22 + depth * 0.72);
          const wr = TUBE_BASE * a.scaleWave * (0.4 + depth * 0.55);
          tube(a.x, a.y, b.x, b.y, wr * 0.7, wa, 182);
          if (!ghost) {
            sphere(a.x, a.y, wr + 2, wa, 186);
            sphere(b.x, b.y, wr + 2, wa, 177);
            const mx2 = (a.x + b.x) / 2, my2 = (a.y + b.y) / 2;
            rotationGlow(mx2, my2, depth * a.alphaWave * vanishAlpha * 0.5, 182);
          }
        }
      });

      return { sA, sB };
    }

    // ── VANISH STATE MACHINE ──
    let vAlpha  = 0;
    let vState: 'fadein' | 'visible' | 'fadeout' | 'dormant' = 'fadein';
    let vTimer  = 0;
    const FADE_IN  = 0.010;
    const FADE_OUT = 0.006;
    const VIS_DUR  = 260;
    const DORM_DUR = 80;

    // ── TRAVELING LINE PARTICLES along DNA strand ──
    // Each traveler is a glowing comet that rides along sA or sB
    // from one end of the helix to the other, then loops.
    interface Traveler {
      frac: number;      // 0 → 1 position along strand
      speed: number;     // frac units per frame
      strand: 'A' | 'B';
      hue: number;
      alpha: number;
      tailLen: number;   // how many point-indices behind the head glow
    }

    const travelers: Traveler[] = [
      { frac: 0.00, speed: 0.0018, strand: 'A', hue: 186, alpha: 0.90, tailLen: 22 },
      { frac: 0.50, speed: 0.0015, strand: 'B', hue: 177, alpha: 0.85, tailLen: 18 },
      { frac: 0.25, speed: 0.0020, strand: 'A', hue: 195, alpha: 0.75, tailLen: 15 },
      { frac: 0.75, speed: 0.0016, strand: 'B', hue: 180, alpha: 0.80, tailLen: 20 },
    ];

    function drawTravelers(sA: StrandPoint[], sB: StrandPoint[], vanishAlpha: number) {
      const STEPS = sA.length - 1;

      travelers.forEach(tr => {
        tr.frac += tr.speed;
        if (tr.frac > 1.05) tr.frac = -0.05; // wrap back to start

        const headIdx = Math.floor(tr.frac * STEPS);
        if (headIdx < 0 || headIdx >= STEPS) return;

        const pts  = tr.strand === 'A' ? sA : sB;
        const head = pts[Math.min(headIdx, STEPS)];

        // draw comet tail — segments from head back by tailLen
        for (let tail = 0; tail < tr.tailLen; tail++) {
          const idx = headIdx - tail;
          if (idx < 0 || idx + 1 > STEPS) continue;
          const p = pts[idx];
          const q = pts[idx + 1];

          // brightness falls off toward the tail (quadratic)
          const tailFrac  = 1 - tail / tr.tailLen;
          const segAlpha  = vanishAlpha * tr.alpha * tailFrac * tailFrac;
          if (segAlpha < 0.01) continue;

          const lineWidth = 1.2 + tailFrac * 2.2;

          // core bright line
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(q.x, q.y);
          c.strokeStyle = `hsla(${tr.hue},100%,92%,${segAlpha})`;
          c.lineWidth   = lineWidth;
          c.lineCap     = 'round';
          c.stroke();

          // soft outer glow
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(q.x, q.y);
          c.strokeStyle = `hsla(${tr.hue},100%,70%,${segAlpha * 0.35})`;
          c.lineWidth   = lineWidth + 7;
          c.stroke();
        }

        // head flare dot
        const headAlpha = vanishAlpha * tr.alpha;
        if (headAlpha > 0.05) {
          const hg = c.createRadialGradient(head.x, head.y, 0, head.x, head.y, 14);
          hg.addColorStop(0,   `hsla(${tr.hue},100%,98%,${headAlpha})`);
          hg.addColorStop(0.4, `hsla(${tr.hue},100%,78%,${headAlpha * 0.55})`);
          hg.addColorStop(1,   `hsla(${tr.hue},100%,60%,0)`);
          c.beginPath();
          c.arc(head.x, head.y, 14, 0, Math.PI * 2);
          c.fillStyle = hg;
          c.fill();
        }
      });
    }

    // ── BACKGROUND AMBIENT PARTICLES ──
    interface BgPart {
      x: number; y: number; vx: number; vy: number;
      op: number; sz: number; hue: number;
      life: number; maxLife: number; twinkle: number;
    }
    const BG_HUES = [185, 175, 195, 210, 165];
    const bgParts: BgPart[] = Array.from({ length: 30 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00016,
      vy: -(Math.random() * 0.00024 + 0.00005),
      op: 0.05 + Math.random() * 0.14,
      sz: Math.random() * 1.8 + 0.4,
      hue: BG_HUES[Math.floor(Math.random() * BG_HUES.length)],
      life: Math.random() * 400,
      maxLife: 350 + Math.random() * 350,
      twinkle: Math.random() * Math.PI * 2,
    }));

    function drawBgParts() {
      bgParts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life++; p.twinkle += 0.04;
        if (p.life > p.maxLife || p.y < -0.02) {
          p.x = Math.random(); p.y = 1.02; p.life = 0;
          p.maxLife = 350 + Math.random() * 350;
          p.hue = BG_HUES[Math.floor(Math.random() * BG_HUES.length)];
        }
        const fr    = p.life / p.maxLife;
        const twink = 0.7 + 0.3 * Math.sin(p.twinkle);
        const fa    = p.op * Math.sin(fr * Math.PI) * twink;
        if (fa < 0.01) return;
        const gr = c.createRadialGradient(p.x * W, p.y * H, 0, p.x * W, p.y * H, p.sz * 4);
        gr.addColorStop(0, `hsla(${p.hue},100%,80%,${fa * 0.35})`);
        gr.addColorStop(1, `hsla(${p.hue},100%,60%,0)`);
        c.beginPath(); c.arc(p.x * W, p.y * H, p.sz * 4, 0, Math.PI * 2);
        c.fillStyle = gr; c.fill();
        c.globalAlpha = fa;
        c.beginPath(); c.arc(p.x * W, p.y * H, p.sz, 0, Math.PI * 2);
        c.fillStyle = `hsl(${p.hue},100%,82%)`; c.fill();
        c.globalAlpha = 1;
      });
    }

    // ── NEBULA ORBS ──
    interface Nebula { x: number; y: number; vx: number; vy: number; r: number; hue: number; alpha: number; phase: number; }
    const NEBULA_HUES = [185, 195, 175, 200, 180];
    const nebulas: Nebula[] = Array.from({ length: 5 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00008,
      vy: (Math.random() - 0.5) * 0.00008,
      r: 0.14 + Math.random() * 0.20,
      hue: NEBULA_HUES[Math.floor(Math.random() * NEBULA_HUES.length)],
      alpha: 0.03 + Math.random() * 0.04,
      phase: Math.random() * Math.PI * 2,
    }));

    function drawNebulas() {
      nebulas.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.phase += 0.005;
        if (n.x < -n.r) n.x = 1 + n.r; if (n.x > 1 + n.r) n.x = -n.r;
        if (n.y < -n.r) n.y = 1 + n.r; if (n.y > 1 + n.r) n.y = -n.r;
        const pulse = n.alpha * (0.8 + 0.2 * Math.sin(n.phase));
        const gr = c.createRadialGradient(n.x * W, n.y * H, 0, n.x * W, n.y * H, n.r * W);
        gr.addColorStop(0, `hsla(${n.hue},100%,62%,${pulse})`);
        gr.addColorStop(1, `hsla(${n.hue},100%,50%,0)`);
        c.fillStyle = gr;
        c.beginPath(); c.arc(n.x * W, n.y * H, n.r * W, 0, Math.PI * 2); c.fill();
      });
    }

    let frame  = 0;
    let animId = 0;

    const draw = () => {
      animId = requestAnimationFrame(draw);
      c.clearRect(0, 0, W, H);
      const t = frame * 0.012;

      // base bg
      c.fillStyle = '#020d1a';
      c.fillRect(0, 0, W, H);

      // deep teal ambient glow
      const bg = c.createRadialGradient(W * 0.42, H * 0.5, 0, W * 0.42, H * 0.5, W * 0.78);
      bg.addColorStop(0, 'rgba(0,55,105,0.42)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = bg;
      c.fillRect(0, 0, W, H);

      drawNebulas();
      drawBgParts();

      // ── VANISH STATE MACHINE ──
      if (vState === 'fadein') {
        vAlpha = Math.min(1, vAlpha + FADE_IN);
        if (vAlpha >= 1) { vState = 'visible'; vTimer = VIS_DUR; }
      } else if (vState === 'visible') {
        vTimer--;
        if (vTimer <= 0) vState = 'fadeout';
      } else if (vState === 'fadeout') {
        vAlpha = Math.max(0, vAlpha - FADE_OUT);
        if (vAlpha <= 0) { vState = 'dormant'; vTimer = DORM_DUR; }
      } else {
        vTimer--;
        if (vTimer <= 0) vState = 'fadein';
      }

      // ghost helices (always dim in background)
      drawHelix(t, 1, true,  W * 0.5,  -H * 0.04, false);
      drawHelix(t, 1, true, -W * 0.5,   H * 0.06,  true);

      // main helix
      const { sA, sB } = drawHelix(t, vAlpha, false);

      // glowing travelers riding along the DNA strand border
      drawTravelers(sA, sB, vAlpha);

      // vignette
      const v = c.createRadialGradient(W * 0.5, H * 0.5, H * 0.1, W * 0.5, H * 0.5, H);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(1,5,14,0.82)');
      c.fillStyle = v;
      c.fillRect(0, 0, W, H);

      frame++;
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default MedBackground;