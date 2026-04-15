export const CONFIG = {
  logicalWidth: 1000,
  logicalHeight: 600,
  groundY: 0.78, 
  initialSpeed: 520, 
  gravity: 2400,
  jumpForce: 720,
  duckHeight: 28,
  runHeight: 44,
  spawnInterval: 1.1, 
  cloudFreq: 3.5,
  dayCycle: 40, 
  maxObstacles: 4
};

// Math Utilities
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const rint = (a, b) => Math.floor(rand(a, b + 1));

// Collision Detection (with shrink factor for fairness)
export function hitTest(a, b) {
  const shrink = 0.18; // More generous hitbox
  const ax = { x: a.x + a.w * shrink, y: a.y + a.h * shrink, w: a.w * (1 - 2 * shrink), h: a.h * (1 - 2 * shrink) };
  const bx = { x: b.x + b.w * shrink, y: b.y + b.h * shrink, w: b.w * (1 - 2 * shrink), h: b.h * (1 - 2 * shrink) };
  return !(ax.x + ax.w < bx.x || ax.x > bx.x + bx.w || ax.y + ax.h < bx.y || ax.y > bx.y + bx.h);
}
