"use client";

import { useRef, useEffect, useCallback } from "react";

interface BibRunnerProps {
  progress: number;
  isComplete: boolean;
}

// ---- Constants ----
const CANVAS_H = 200;
const GROUND_Y = 160;
const GRAVITY = 0.6;
const JUMP_FORCE = -11;
const PLAYER_W = 24;
const PLAYER_H = 36;
const PLAYER_X = 60;
const DUCK_H = 20;
const BASE_SPEED = 4;
const SPEED_INCREMENT = 0.3;
const SPEED_INTERVAL = 5000; // ms
const MIN_SPAWN_INTERVAL = 800;
const MAX_SPAWN_INTERVAL = 2200;

type GameState = "idle" | "playing" | "gameover";

interface Player {
  y: number;
  vy: number;
  ducking: boolean;
  grounded: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "ground" | "air";
  variant: number; // 0-2 for visual variety
}

interface Collectible {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "bib" | "medal";
  bibNum: string;
  collected: boolean;
}

interface GameData {
  state: GameState;
  player: Player;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  score: number;
  speed: number;
  lastSpawn: number;
  nextSpawn: number;
  groundOffset: number;
  startTime: number;
  lastSpeedUp: number;
  canvasW: number;
}

function createGame(canvasW: number): GameData {
  return {
    state: "idle",
    player: { y: GROUND_Y - PLAYER_H, vy: 0, ducking: false, grounded: true },
    obstacles: [],
    collectibles: [],
    score: 0,
    speed: BASE_SPEED,
    lastSpawn: 0,
    nextSpawn: 1500,
    groundOffset: 0,
    startTime: 0,
    lastSpeedUp: 0,
    canvasW,
  };
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function BibRunner({ progress, isComplete }: BibRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameData>(createGame(800));
  const rafRef = useRef<number>(0);
  const progressRef = useRef(progress);
  const completeRef = useRef(isComplete);

  progressRef.current = progress;
  completeRef.current = isComplete;

  const startGame = useCallback(() => {
    const g = gameRef.current;
    if (completeRef.current && g.state === "gameover") return;
    g.state = "playing";
    g.player = { y: GROUND_Y - PLAYER_H, vy: 0, ducking: false, grounded: true };
    g.obstacles = [];
    g.collectibles = [];
    g.score = 0;
    g.speed = BASE_SPEED;
    g.lastSpawn = performance.now();
    g.nextSpawn = 1500;
    g.startTime = performance.now();
    g.lastSpeedUp = performance.now();
  }, []);

  const jump = useCallback(() => {
    const g = gameRef.current;
    if (g.state === "idle" || g.state === "gameover") {
      startGame();
      return;
    }
    if (g.player.grounded && g.state === "playing") {
      g.player.vy = JUMP_FORCE;
      g.player.grounded = false;
    }
  }, [startGame]);

  const setDuck = useCallback((ducking: boolean) => {
    const g = gameRef.current;
    if (g.state === "playing") {
      g.player.ducking = ducking;
    }
  }, []);

  // Handle input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        setDuck(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") {
        setDuck(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [jump, setDuck]);

  // Touch handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartY = e.touches[0].clientY;
      jump();
    };
    const handleTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 30) setDuck(true);
    };
    const handleTouchEnd = () => {
      setDuck(false);
    };
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      jump();
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("click", handleClick);
    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("click", handleClick);
    };
  }, [jump, setDuck]);

  // Resize
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const w = Math.min(container.clientWidth, 896);
      canvas.width = w;
      canvas.height = CANVAS_H;
      gameRef.current.canvasW = w;
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Stop game when processing complete
  useEffect(() => {
    if (isComplete) {
      const g = gameRef.current;
      if (g.state === "playing") {
        g.state = "gameover";
      }
    }
  }, [isComplete]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      const g = gameRef.current;
      const now = performance.now();
      const W = g.canvasW;

      // --- Update ---
      if (g.state === "playing") {
        // Speed up over time
        if (now - g.lastSpeedUp > SPEED_INTERVAL) {
          g.speed += SPEED_INCREMENT;
          g.lastSpeedUp = now;
        }

        // Player physics
        if (!g.player.grounded) {
          g.player.vy += GRAVITY;
          g.player.y += g.player.vy;
          if (g.player.y >= GROUND_Y - (g.player.ducking ? DUCK_H : PLAYER_H)) {
            g.player.y = GROUND_Y - (g.player.ducking ? DUCK_H : PLAYER_H);
            g.player.vy = 0;
            g.player.grounded = true;
          }
        }

        // Ground scroll
        g.groundOffset = (g.groundOffset + g.speed) % 40;

        // Spawn obstacles / collectibles
        if (now - g.lastSpawn > g.nextSpawn) {
          g.lastSpawn = now;
          g.nextSpawn = randomBetween(
            Math.max(MIN_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL + (2000 - g.speed * 100)),
            MAX_SPAWN_INTERVAL
          );

          const rand = Math.random();
          if (rand < 0.25) {
            // Collectible
            const isMedal = Math.random() < 0.2;
            g.collectibles.push({
              x: W + 10,
              y: GROUND_Y - (isMedal ? 55 : 45),
              w: isMedal ? 16 : 20,
              h: isMedal ? 16 : 24,
              type: isMedal ? "medal" : "bib",
              bibNum: String(randomBetween(1, 999)),
              collected: false,
            });
          } else if (rand < 0.65) {
            // Ground obstacle
            const variant = randomBetween(0, 2);
            const w = variant === 0 ? 20 : variant === 1 ? 28 : 24;
            const h = variant === 0 ? 24 : variant === 1 ? 32 : 20;
            g.obstacles.push({
              x: W + 10,
              y: GROUND_Y - h,
              w,
              h,
              type: "ground",
              variant,
            });
          } else {
            // Air obstacle
            const variant = randomBetween(0, 1);
            g.obstacles.push({
              x: W + 10,
              y: GROUND_Y - 50 - randomBetween(0, 15),
              w: variant === 0 ? 28 : 24,
              h: variant === 0 ? 18 : 20,
              type: "air",
              variant,
            });
          }
        }

        // Move obstacles
        for (const o of g.obstacles) o.x -= g.speed;
        for (const c of g.collectibles) c.x -= g.speed;

        // Remove off-screen
        g.obstacles = g.obstacles.filter((o) => o.x + o.w > -10);
        g.collectibles = g.collectibles.filter((c) => c.x + c.w > -10);

        // Collision
        const ph = g.player.ducking ? DUCK_H : PLAYER_H;
        const py = g.player.ducking ? GROUND_Y - DUCK_H : g.player.y;
        const px = PLAYER_X;

        for (const o of g.obstacles) {
          if (
            px + PLAYER_W - 4 > o.x + 4 &&
            px + 4 < o.x + o.w - 4 &&
            py + ph - 4 > o.y + 4 &&
            py + 4 < o.y + o.h - 4
          ) {
            g.state = "gameover";
            break;
          }
        }

        // Collect
        for (const c of g.collectibles) {
          if (c.collected) continue;
          if (
            px + PLAYER_W > c.x &&
            px < c.x + c.w &&
            py + ph > c.y &&
            py < c.y + c.h
          ) {
            c.collected = true;
            g.score += c.type === "medal" ? 5 : 1;
          }
        }

        // Score from distance
        g.score += 0.02;
      }

      // --- Draw ---
      ctx.clearRect(0, 0, W, CANVAS_H);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      skyGrad.addColorStop(0, "#0f172a");
      skyGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, CANVAS_H);

      // Background hills (parallax)
      ctx.fillStyle = "#1e3a2f";
      for (let i = 0; i < W + 80; i += 80) {
        const offset = (g.groundOffset * 0.3) % 80;
        const hx = i - offset;
        ctx.beginPath();
        ctx.moveTo(hx, GROUND_Y);
        ctx.quadraticCurveTo(hx + 40, GROUND_Y - 30 - (i % 160 === 0 ? 15 : 0), hx + 80, GROUND_Y);
        ctx.fill();
      }

      // Track surface
      ctx.fillStyle = "#b45309";
      ctx.fillRect(0, GROUND_Y, W, 30);

      // Track lines
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i < W + 40; i += 40) {
        const lx = i - g.groundOffset;
        ctx.beginPath();
        ctx.moveTo(lx, GROUND_Y + 10);
        ctx.lineTo(lx + 20, GROUND_Y + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx + 10, GROUND_Y + 20);
        ctx.lineTo(lx + 30, GROUND_Y + 20);
        ctx.stroke();
      }

      // Track border
      ctx.fillStyle = "#92400e";
      ctx.fillRect(0, GROUND_Y, W, 2);
      ctx.fillRect(0, GROUND_Y + 28, W, 12);
      ctx.fillStyle = "#064e3b";
      ctx.fillRect(0, GROUND_Y + 30, W, 10);

      // Draw player
      if (g.state !== "idle" || true) {
        const ph = g.player.ducking ? DUCK_H : PLAYER_H;
        const py = g.player.ducking ? GROUND_Y - DUCK_H : g.player.y;

        // Body
        ctx.fillStyle = "#10B981";
        const bodyRadius = 4;
        const bx = PLAYER_X;
        const by = py;
        ctx.beginPath();
        ctx.moveTo(bx + bodyRadius, by);
        ctx.lineTo(bx + PLAYER_W - bodyRadius, by);
        ctx.quadraticCurveTo(bx + PLAYER_W, by, bx + PLAYER_W, by + bodyRadius);
        ctx.lineTo(bx + PLAYER_W, by + ph - bodyRadius);
        ctx.quadraticCurveTo(bx + PLAYER_W, by + ph, bx + PLAYER_W - bodyRadius, by + ph);
        ctx.lineTo(bx + bodyRadius, by + ph);
        ctx.quadraticCurveTo(bx, by + ph, bx, by + ph - bodyRadius);
        ctx.lineTo(bx, by + bodyRadius);
        ctx.quadraticCurveTo(bx, by, bx + bodyRadius, by);
        ctx.fill();

        // Head
        if (!g.player.ducking) {
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(bx + PLAYER_W / 2, py - 6, 8, 0, Math.PI * 2);
          ctx.fill();

          // Eye
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(bx + PLAYER_W / 2 + 3, py - 7, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bib number on chest
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          g.player.ducking ? "~" : "#1",
          bx + PLAYER_W / 2,
          py + (g.player.ducking ? 14 : 18)
        );

        // Legs (animated while running)
        if (g.state === "playing" && g.player.grounded && !g.player.ducking) {
          const legAnim = Math.sin(now * 0.012) * 6;
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(bx + 4, py + ph, 5, 6 + legAnim);
          ctx.fillRect(bx + PLAYER_W - 9, py + ph, 5, 6 - legAnim);
        }
      }

      // Draw obstacles
      for (const o of g.obstacles) {
        if (o.type === "ground") {
          if (o.variant === 0) {
            // Camera on tripod
            ctx.fillStyle = "#475569";
            ctx.fillRect(o.x + 4, o.y, o.w - 8, o.h - 8);
            ctx.fillStyle = "#334155";
            ctx.fillRect(o.x + 6, o.y + o.h - 8, 2, 8);
            ctx.fillRect(o.x + o.w - 8, o.y + o.h - 8, 2, 8);
            // Lens
            ctx.fillStyle = "#60a5fa";
            ctx.beginPath();
            ctx.arc(o.x + o.w / 2, o.y + (o.h - 8) / 2, 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (o.variant === 1) {
            // Tripod
            ctx.fillStyle = "#475569";
            ctx.fillRect(o.x + o.w / 2 - 2, o.y, 4, o.h * 0.4);
            ctx.fillStyle = "#334155";
            ctx.beginPath();
            ctx.moveTo(o.x, o.y + o.h);
            ctx.lineTo(o.x + o.w / 2, o.y + o.h * 0.35);
            ctx.lineTo(o.x + o.w, o.y + o.h);
            ctx.fill();
          } else {
            // Cone
            ctx.fillStyle = "#f97316";
            ctx.beginPath();
            ctx.moveTo(o.x + o.w / 2, o.y);
            ctx.lineTo(o.x + o.w, o.y + o.h);
            ctx.lineTo(o.x, o.y + o.h);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(o.x + 4, o.y + o.h * 0.5, o.w - 8, 3);
          }
        } else {
          // Air obstacles
          if (o.variant === 0) {
            // Drone
            ctx.fillStyle = "#64748b";
            ctx.fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 10);
            // Propellers
            const propAnim = Math.sin(now * 0.03) * 3;
            ctx.fillStyle = "#94a3b8";
            ctx.fillRect(o.x, o.y + propAnim, o.w, 3);
            // Red light
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(o.x + o.w / 2, o.y + o.h - 4, 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Blurry photo floating
            ctx.fillStyle = "rgba(148,163,184,0.6)";
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 1;
            ctx.strokeRect(o.x, o.y, o.w, o.h);
            ctx.fillStyle = "rgba(239,68,68,0.8)";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("X", o.x + o.w / 2, o.y + o.h / 2 + 4);
          }
        }
      }

      // Draw collectibles
      for (const c of g.collectibles) {
        if (c.collected) continue;
        if (c.type === "medal") {
          // Gold medal
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#92400e";
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("5", c.x + c.w / 2, c.y + c.h / 2 + 3);
        } else {
          // Bib number
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(c.x, c.y, c.w, c.h);
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText(c.bibNum, c.x + c.w / 2, c.y + c.h / 2 + 4);
          ctx.strokeStyle = "#10B981";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(c.x, c.y, c.w, c.h);
        }
      }

      // Score
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`Score: ${Math.floor(g.score)}`, W - 12, 22);

      // Progress overlay (top left)
      ctx.fillStyle = "rgba(16,185,129,0.9)";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${Math.round(progressRef.current)}%`, 12, 22);

      // Progress bar mini
      const barW = 60;
      const barH = 4;
      const barX = 50;
      const barY = 16;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = "#10B981";
      ctx.fillRect(barX, barY, barW * (progressRef.current / 100), barH);

      // Overlay messages
      if (g.state === "idle") {
        drawOverlayText(ctx, W, [
          "Bib Runner",
          "",
          "Espace / Clic : sauter",
          "Flèche bas : se baisser",
          "",
          "Appuyez pour jouer !",
        ]);
      } else if (g.state === "gameover") {
        if (completeRef.current) {
          drawOverlayText(ctx, W, [
            "Traitement terminé !",
            `Score final : ${Math.floor(g.score)}`,
          ]);
        } else {
          drawOverlayText(ctx, W, [
            "Game Over !",
            `Score : ${Math.floor(g.score)}`,
            "",
            "Touchez pour rejouer",
          ]);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-[896px] mx-auto select-none">
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl border border-white/10 cursor-pointer"
        style={{ height: `${CANVAS_H}px`, imageRendering: "pixelated" }}
      />
    </div>
  );
}

function drawOverlayText(ctx: CanvasRenderingContext2D, W: number, lines: string[]) {
  // Dim background
  ctx.fillStyle = "rgba(15,23,42,0.7)";
  ctx.fillRect(0, 0, W, CANVAS_H);

  ctx.textAlign = "center";
  const startY = CANVAS_H / 2 - ((lines.length - 1) * 18) / 2;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0) {
      ctx.fillStyle = "#10B981";
      ctx.font = "bold 18px sans-serif";
    } else if (line.startsWith("Score")) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 16px sans-serif";
    } else {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px sans-serif";
    }
    ctx.fillText(line, W / 2, startY + i * 18);
  }
}
