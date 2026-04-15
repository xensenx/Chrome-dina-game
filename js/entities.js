import { CONFIG, rand, rint } from './config.js';

export class Dino {
  constructor() {
    this.w = 48;
    this.reset();
  }

  reset() {
    this.x = 110;
    this.h = CONFIG.runHeight;
    this.y = CONFIG.logicalHeight * CONFIG.groundY - this.h / 2;
    this.vy = 0;
    this.onGround = true;
    this.ducking = false;
    this.jumpCount = 0;
    this.blinkTimer = rand(2, 6);
    this.blink = 0;
    this.shield = 0;
    this.magnet = 0;
    this.slow = 0;
    this.distance = 0; // Used for walk animation
  }

  update(dt, speed) {
    if (this.shield > 0) this.shield = Math.max(0, this.shield - dt);
    if (this.magnet > 0) this.magnet = Math.max(0, this.magnet - dt);
    if (this.slow > 0) this.slow = Math.max(0, this.slow - dt);

    this.distance += speed * dt;
    this.vy += CONFIG.gravity * dt;
    this.y += this.vy * dt;

    const groundY = CONFIG.logicalHeight * CONFIG.groundY - this.h / 2;
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.onGround = true;
      this.jumpCount = 0;
    } else {
      this.onGround = false;
    }

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blink = 6;
      this.blinkTimer = rand(3, 7);
    }
    if (this.blink > 0) this.blink = Math.max(0, this.blink - dt * 12);
  }

  jump(audioManager, spawnDustFn) {
    if (this.onGround || this.jumpCount < 1) {
      this.vy = -CONFIG.jumpForce * (this.slow > 0 ? 0.85 : 1);
      this.onGround = false;
      this.jumpCount++;
      audioManager.playJump();
      spawnDustFn(this.x, this.y + this.h / 2, true);
    }
  }

  duck(isDucking) {
    this.ducking = isDucking;
    this.h = isDucking ? CONFIG.duckHeight : CONFIG.runHeight;
    if (this.onGround) {
      this.y = CONFIG.logicalHeight * CONFIG.groundY - this.h / 2;
    }
  }

  rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  draw(ctx) {
    const { x, y, w, h } = this;
    ctx.save();
    ctx.translate(x, y);

    // Shield Halo
    if (this.shield > 0) {
      const pulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(100, 180, 255, ${0.2 + 0.3 * pulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, w, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = this.shield > 0 ? '#5b9bd5' : '#222';
    
    // Body
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 8);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(w / 4, -h / 4, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    if (this.blink > 0) {
      ctx.fillRect(w / 4 - 3, -h / 4 - 1, 6, 2);
    } else {
      ctx.beginPath();
      ctx.arc(w / 4 + 1, -h / 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated Legs
    ctx.fillStyle = '#111';
    const legOffset = this.onGround ? Math.sin(this.distance * 0.05) * 4 : 0;
    ctx.fillRect(-w / 4, h / 2, 6, 8 - legOffset);
    ctx.fillRect(w / 6, h / 2, 6, 8 + legOffset);

    ctx.restore();
  }
}

export class Obstacle {
  constructor(type, x) {
    this.type = type;
    this.x = x;
    this.passed = false;
    this.setByType(type);
  }

  setByType(t) {
    if (t === 'cactus') {
      const v = rint(1, 3);
      this.w = 20 + v * 10;
      this.h = 30 + v * 12;
      this.y = CONFIG.logicalHeight * CONFIG.groundY - this.h / 2;
    } else if (t === 'bird') {
      this.w = 34;
      this.h = 24;
      this.y = CONFIG.logicalHeight * (CONFIG.groundY - 0.2) - rand(0, 40);
      this.bob = rand(0, Math.PI * 2);
    }
  }

  update(dt, speed) {
    this.x -= speed * dt;
    if (this.type === 'bird') {
      this.bob += dt * 5;
      this.y += Math.sin(this.bob) * dt * 30;
    }
  }

  rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === 'cactus') {
      ctx.fillStyle = '#16a34a'; // Tailwind green-600
      ctx.beginPath();
      ctx.roundRect(-this.w / 2, -this.h / 2, this.w, this.h, 6);
      ctx.fill();
      // Cactus arms
      ctx.fillRect(-this.w / 2 - 4, -this.h / 4, 8, this.h / 2);
      ctx.fillRect(this.w / 2 - 4, -this.h / 6, 8, this.h / 2.5);
    } else if (this.type === 'bird') {
      ctx.fillStyle = '#334155'; // Tailwind slate-700
      // Wing flap animation
      const flap = Math.sin(this.bob * 2) * 8;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wing
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-15, -10 + flap);
      ctx.lineTo(5, 0);
      ctx.fill();
      // Beak
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(this.w / 2, -4);
      ctx.lineTo(this.w / 2 + 10, 0);
      ctx.lineTo(this.w / 2, 4);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class PowerUp {
  constructor(type, x) {
    this.type = type;
    this.x = x;
    this.y = CONFIG.logicalHeight * CONFIG.groundY - 80;
    this.w = 24;
    this.h = 24;
    this.bob = rand(0, Math.PI);
  }
  update(dt, speed) {
    this.x -= speed * dt;
    this.bob += dt * 4;
    this.y += Math.sin(this.bob) * dt * 15;
  }
  rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowBlur = 10;
    if (this.type === 'coin') {
      ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === 'shield') {
      ctx.fillStyle = '#60a5fa'; ctx.shadowColor = '#60a5fa';
      ctx.beginPath(); ctx.roundRect(-12, -12, 24, 24, 6); ctx.fill();
    } else if (this.type === 'slow') {
      ctx.fillStyle = '#c084fc'; ctx.shadowColor = '#c084fc';
      ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(0, -12); ctx.lineTo(12, 8); ctx.fill();
    } else if (this.type === 'magnet') {
      ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444';
      ctx.beginPath(); ctx.arc(0, 0, 12, Math.PI, 0); ctx.lineTo(8, 0); ctx.arc(0, 0, 4, 0, Math.PI, true); ctx.fill();
    }
    ctx.restore();
  }
}

export class Particle {
  constructor(x, y, vx, vy, life, size, color = '#cbd5e1') {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life; this.size = size;
    this.color = color;
  }
  update(dt) {
    this.vy += 800 * dt; // Gravity
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class Cloud {
  constructor(x, y, size) {
    this.x = x; this.y = y; this.size = size;
  }
  update(dt, speed) {
    this.x -= speed * 0.15 * dt;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 1.5, this.size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}