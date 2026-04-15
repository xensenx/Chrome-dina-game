export class AudioManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.12;
    this.masterGain.connect(this.ctx.destination);
    this.muted = false;
  }

  setMuted(isMuted) {
    this.muted = isMuted;
    this.masterGain.gain.value = isMuted ? 0 : 0.12;
  }

  playTone(freq = 440, time = 0.06, type = 'sine', decay = 0.02) {
    if (this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    o.type = type;
    o.frequency.value = freq;
    
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + time + decay);
    
    o.connect(g);
    g.connect(this.masterGain);
    
    o.start(t);
    o.stop(t + time + decay + 0.02);
  }

  playJump() { this.playTone(880, 0.06, 'sine'); }
  playScoreTick() { this.playTone(1200, 0.03, 'square'); }
  playHit() { this.playTone(80, 0.4, 'sawtooth', 0.1); }
  playPower(type) {
    if (type === 'shield') this.playTone(880, 0.12, 'triangle');
    else if (type === 'slow') this.playTone(520, 0.12, 'triangle');
    else if (type === 'magnet') this.playTone(720, 0.12, 'triangle');
  }
}