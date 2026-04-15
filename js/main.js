import { CONFIG, clamp, rand, rint, hitTest } from './config.js';
import { AudioManager } from './audio.js';
import { Dino, Obstacle, PowerUp, Particle, Cloud } from './entities.js';

// --- Setup ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const audio = new AudioManager();

// UI Elements
const overlays = {
  start: document.getElementById('startOverlay'),
  gameOver: document.getElementById('gameOverOverlay')
};
const panels = {
  score: document.getElementById('scorePanel'),
  speed: document.getElementById('speedPanel'),
  time: document.getElementById('timePanel'),
  finalScore: document.getElementById('finalScoreDisplay')
};

// State
let DPR = 1;
let state = {
  running: false, paused: false, gameOver: false,
  time: 0, score: 0, speed: CONFIG.initialSpeed, best: 0
};

// Entities
let dino = new Dino();
let obstacles = [];
let powerups = [];
let particles = [];
let clouds = [];
let lastSpawn = 0, lastCloud = 0;
let lastTime = 0;

// Keys
const keys = {};

// --- Initialization ---
function init() {
  state.best = Number(localStorage.getItem('dinoUltimate_best')) || 0;
  panels.score.innerHTML = `Score: 0 &nbsp;|&nbsp; Best: ${state.best}`;
  
  window.addEventListener('resize', resize);
  resize();

  // Inputs
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if ([' ', 'arrowup', 'arrowdown'].includes(e.key.toLowerCase())) e.preventDefault();
    if ((e.key === ' ' || e.key === 'ArrowUp') && !state.running) startGame();
  });
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

  // Touch / Mouse
  canvas.addEventListener('touchstart', handleTap, { passive: false });
  canvas.addEventListener('mousedown', handleTap);
  
  // Buttons
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('restartBtn').addEventListener('click', startGame);
  document.getElementById('muteBtn').addEventListener('click', (e) => {
    audio.setMuted(!audio.muted);
    e.target.textContent = audio.muted ? 'Unmute' : 'Mute';
  });

  // Initial Draw
  draw();
}

function handleTap(e) {
  e.preventDefault();
  if (!state.running && !state.gameOver) {
    startGame();
  } else if (state.running) {
    dino.jump(audio, spawnDust);
  }
}

function resize() {
  DPR = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * DPR;
  canvas.height = rect.height * DPR;
  if (!state.running) draw();
}

// --- Spawners ---
function spawnDust(x, y, isJump = false) {
  for (let i = 0; i < 10; i++) {
    particles.push(new Particle(
      x, y, rand(-60, 60), rand(-100, -20) + (isJump ? -60 : 0),
      rand(0.3, 0.7), rand(2, 5), '#94a3b8'
    ));
  }
}

function spawnExplosion(x, y) {
  const colors = ['#ef4444', '#f97316', '#fbbf24', '#475569'];
  for (let i = 0; i < 30; i++) {
    particles.push(new Particle(
      x, y, rand(-300, 300), rand(-400, 100),
      rand(0.5, 1.2), rand(3, 8), colors[rint(0, colors.length - 1)]
    ));
  }
}

function spawnObstacle() {
  const t = Math.random() > 0.85 ? 'bird' : 'cactus';
  obstacles.push(new Obstacle(t, CONFIG.logicalWidth + 60));
  if (obstacles.length > CONFIG.maxObstacles) obstacles.shift();
}

function spawnPowerup() {
  const types = ['coin', 'shield', 'slow', 'magnet'];
  powerups.push(new PowerUp(types[rint(0, types.length - 1)], CONFIG.logicalWidth + 100));
}

// --- Game Flow ---
function startGame() {
  overlays.start.classList.remove('active');
  overlays.gameOver.classList.remove('active');
  
  // Reset State
  dino.reset();
  obstacles = []; powerups = []; particles = []; clouds = [];
  for (let i = 0; i < 4; i++) clouds.push(new Cloud(rand(200, 900), rand(60, 200), rand(20, 50)));
  
  state = { ...state, running: true, gameOver: false, time: 0, score: 0, speed: CONFIG.initialSpeed };
  lastSpawn = 0; lastCloud = 0;
  
  // Start Audio Context if suspended (Browser autoplay policy)
  if(audio.ctx.state === 'suspended') audio.ctx.resume();

  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function endGame() {
  state.gameOver = true;
  state.running = false;
  audio.playHit();
  spawnExplosion(dino.x, dino.y);
  
  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    localStorage.setItem('dinoUltimate_best', state.best);
  }
  
  panels.finalScore.innerHTML = `Score: ${Math.floor(state.score)}<br><span class="small muted">Best: ${state.best}</span>`;
  overlays.gameOver.classList.add('active');
}

// --- Main Loop ---
function loop(now) {
  if (!state.running) return;
  const dt = Math.min(1 / 30, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  // Input processing
  if (keys[' '] || keys['arrowup'] || keys['w']) { dino.jump(audio, spawnDust); keys[' '] = false; }
  dino.duck(keys['arrowdown'] || keys['s']);

  // Time & Speed
  state.time += dt * (dino.slow > 0 ? 0.6 : 1);
  state.speed = CONFIG.initialSpeed + Math.floor(state.time * 20);

  // Spawning
  lastSpawn += dt;
  const currentSpawnInterval = Math.max(0.5, CONFIG.spawnInterval - (state.time / 80));
  if (lastSpawn > currentSpawnInterval) {
    lastSpawn = 0;
    spawnObstacle();
    if (Math.random() < 0.15) spawnPowerup();
  }

  lastCloud += dt;
  if (lastCloud > CONFIG.cloudFreq) {
    lastCloud = 0;
    clouds.push(new Cloud(CONFIG.logicalWidth + 100, rand(40, 250), rand(20, 50)));
  }

  // Update Entities
  dino.update(dt, state.speed);
  
  clouds.forEach(c => c.update(dt, state.speed));
  clouds = clouds.filter(c => c.x > -100);

  particles.forEach(p => p.update(dt));
  particles = particles.filter(p => p.life > 0);

  obstacles.forEach(o => o.update(dt, state.speed));
  obstacles = obstacles.filter(o => o.x > -100);

  powerups.forEach(p => p.update(dt, state.speed));
  powerups = powerups.filter(p => p.x > -100);

  // Collisions
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    if (!obs.passed && obs.x < dino.x) {
      obs.passed = true;
      state.score += 10;
      audio.playScoreTick();
    }
    if (hitTest(dino.rect(), obs.rect())) {
      if (dino.shield > 0) {
        spawnExplosion(obs.x, obs.y);
        obstacles.splice(i, 1);
        audio.playPower('shield');
      } else {
        endGame();
      }
    }
  }

  // Powerup Collection
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    // Magnet effect
    if (dino.magnet > 0 && p.type === 'coin') {
      const dx = dino.x - p.x;
      const dy = dino.y - p.y;
      p.x += dx * dt * 5;
      p.y += dy * dt * 5;
    }

    if (hitTest(dino.rect(), p.rect())) {
      if (p.type === 'coin') { state.score += 25; audio.playPower('magnet'); }
      else if (p.type === 'shield') { dino.shield = 6; audio.playPower('shield'); }
      else if (p.type === 'slow') { dino.slow = 5; audio.playPower('slow'); }
      else if (p.type === 'magnet') { dino.magnet = 6; audio.playPower('magnet'); }
      spawnDust(p.x, p.y);
      powerups.splice(i, 1);
    }
  }

  state.score += dt * 5;

  // Update DOM UI
  panels.score.innerHTML = `Score: ${Math.floor(state.score)} &nbsp;|&nbsp; Best: ${state.best}`;
  panels.speed.textContent = `Speed: ${Math.floor(state.speed)}`;
  panels.time.textContent = `Time: ${Math.floor(state.time)}s`;
}

// --- Rendering ---
function draw() {
  const cw = canvas.width;
  const ch = canvas.height;
  
  // Calculate scaling to fit aspect ratio
  const scale = Math.min(cw / CONFIG.logicalWidth, ch / CONFIG.logicalHeight);
  const offsetX = (cw - CONFIG.logicalWidth * scale) / 2;
  const offsetY = (ch - CONFIG.logicalHeight * scale) / 2;

  // Day/Night Sky Background
  const dayProgress = (state.time % CONFIG.dayCycle) / CONFIG.dayCycle;
  const nightIntensity = Math.max(0, Math.sin(dayProgress * Math.PI * 2));
  
  const skyGrad = ctx.createLinearGradient(0, 0, 0, ch);
  // Sky transitions from light blue to dark purple/navy
  const rT = 135 - (115 * nightIntensity);
  const gT = 206 - (180 * nightIntensity);
  const bT = 235 - (190 * nightIntensity);
  
  const rB = 207 - (187 * nightIntensity);
  const gB = 233 - (200 * nightIntensity);
  const bB = 255 - (215 * nightIntensity);

  skyGrad.addColorStop(0, `rgb(${rT}, ${gT}, ${bT})`);
  skyGrad.addColorStop(1, `rgb(${rB}, ${gB}, ${bB})`);
  
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, cw, ch);

  // Setup Viewport Transform
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Draw Sun/Moon
  ctx.save();
  ctx.translate(CONFIG.logicalWidth * (1 - dayProgress), 100 + nightIntensity * 100);
  ctx.fillStyle = nightIntensity > 0.5 ? '#fef08a' : '#fde047';
  ctx.shadowBlur = 40;
  ctx.shadowColor = ctx.fillStyle;
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Entities
  clouds.forEach(c => c.draw(ctx));

  // Ground
  const gy = CONFIG.logicalHeight * CONFIG.groundY;
  ctx.fillStyle = nightIntensity > 0.5 ? '#334155' : '#cbd5e1';
  ctx.fillRect(0, gy, CONFIG.logicalWidth, CONFIG.logicalHeight - gy);
  
  // Ground Pattern (Scrolling)
  ctx.fillStyle = nightIntensity > 0.5 ? '#1e293b' : '#94a3b8';
  const step = 40;
  const offset = (state.time * state.speed) % step;
  for (let x = -offset; x < CONFIG.logicalWidth; x += step) {
    ctx.fillRect(x, gy + 5, 8, 4);
    ctx.fillRect(x + 20, gy + 15, 12, 4);
  }

  powerups.forEach(p => p.draw(ctx));
  obstacles.forEach(o => o.draw(ctx));
  particles.forEach(p => p.draw(ctx));
  if (!state.gameOver) dino.draw(ctx); // Hide dino if exploded
  
  ctx.restore();
}

// Boot
init();