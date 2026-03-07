import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  label: string;
  radius: number;
  pulsePhase: number;
  active: boolean;
}

interface Signal {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
}

const AgentVisualization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 520;
    const H = 420;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    const nodes: Node[] = [
      { x: 130, y: 80, label: "User", radius: 28, pulsePhase: 0, active: false },
      { x: 380, y: 80, label: "Voice Agent", radius: 32, pulsePhase: 1, active: true },
      { x: 130, y: 280, label: "Planner", radius: 30, pulsePhase: 2, active: false },
      { x: 380, y: 280, label: "Tool Exec", radius: 28, pulsePhase: 3, active: false },
      { x: 255, y: 180, label: "Orchestrator", radius: 35, pulsePhase: 0.5, active: true },
    ];

    const connections = [
      [0, 4], [1, 4], [2, 4], [3, 4], [1, 3], [0, 2],
    ];

    const signals: Signal[] = [];
    let time = 0;

    const spawnSignal = () => {
      const conn = connections[Math.floor(Math.random() * connections.length)];
      const reverse = Math.random() > 0.5;
      signals.push({
        fromIdx: reverse ? conn[1] : conn[0],
        toIdx: reverse ? conn[0] : conn[1],
        progress: 0,
        speed: 0.008 + Math.random() * 0.008,
      });
    };

    // Waveform bars
    const waveformBars = 40;

    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, W, H);

      // Connections
      connections.forEach(([a, b]) => {
        const na = nodes[a];
        const nb = nodes[b];
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = "rgba(34, 211, 238, 0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Signals
      if (Math.random() < 0.03) spawnSignal();
      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        s.progress += s.speed;
        if (s.progress > 1) {
          // Activate target node briefly
          nodes[s.toIdx].active = true;
          setTimeout(() => { nodes[s.toIdx].active = false; }, 600);
          signals.splice(i, 1);
          continue;
        }
        const from = nodes[s.fromIdx];
        const to = nodes[s.toIdx];
        const sx = from.x + (to.x - from.x) * s.progress;
        const sy = from.y + (to.y - from.y) * s.progress;

        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(103, 232, 249, 0.9)";
        ctx.fill();

        // Trail
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
        grad.addColorStop(0, "rgba(34, 211, 238, 0.4)");
        grad.addColorStop(1, "rgba(34, 211, 238, 0)");
        ctx.beginPath();
        ctx.arc(sx, sy, 12, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Nodes
      nodes.forEach((n) => {
        const pulse = Math.sin(time * 2 + n.pulsePhase) * 0.3 + 0.7;
        const glowAlpha = n.active ? 0.4 : 0.1 * pulse;

        // Glow
        const glow = ctx.createRadialGradient(n.x, n.y, n.radius * 0.5, n.x, n.y, n.radius * 2.5);
        glow.addColorStop(0, `rgba(34, 211, 238, ${glowAlpha})`);
        glow.addColorStop(1, "rgba(34, 211, 238, 0)");
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.strokeStyle = n.active
          ? `rgba(34, 211, 238, ${0.6 + pulse * 0.4})`
          : `rgba(34, 211, 238, ${0.15 + pulse * 0.1})`;
        ctx.lineWidth = n.active ? 2 : 1;
        ctx.stroke();

        // Fill
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.active ? "rgba(34, 211, 238, 0.08)" : "rgba(17, 17, 17, 0.8)";
        ctx.fill();

        // Label
        ctx.fillStyle = n.active ? "rgba(103, 232, 249, 1)" : "rgba(161, 161, 170, 0.8)";
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + 4);
      });

      // Waveform at bottom
      const waveY = 370;
      const barWidth = (W - 80) / waveformBars;
      for (let i = 0; i < waveformBars; i++) {
        const x = 40 + i * barWidth;
        const h = (Math.sin(time * 3 + i * 0.4) * 0.5 + 0.5) *
                  (Math.sin(time * 1.7 + i * 0.2) * 0.3 + 0.7) * 20 + 3;
        const alpha = 0.3 + (Math.sin(time * 2 + i * 0.3) * 0.2);
        ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
        ctx.fillRect(x, waveY - h / 2, barWidth - 2, h);
      }

      requestAnimationFrame(animate);
    };

    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="rounded-lg"
        style={{ width: 520, height: 420 }}
      />
    </div>
  );
};

export default AgentVisualization;
