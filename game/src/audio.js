// Shadow Vault — every sound is synthesized with WebAudio: no audio files,
// no network, just oscillators and filtered noise.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  /** Call from a user gesture; browsers block audio before one. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, seconds, type = 'sine', volume = 0.2, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  /** Short filtered-noise tick: a footstep, volume by distance. */
  footstep(volume, low = false) {
    if (!this.ctx || this.muted || volume <= 0.01) return;
    const t0 = this.ctx.currentTime;
    const dur = 0.07;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low ? 300 : 700;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  pickup() { this.tone(880, 0.12, 'sine', 0.22); this.tone(1318, 0.18, 'sine', 0.18, null, 0.07); }
  coinThrow() { this.tone(2400, 0.05, 'square', 0.08); }
  coinLand() { this.tone(1568, 0.3, 'triangle', 0.14, 900); }
  suspicious() { this.tone(330, 0.25, 'triangle', 0.2, 440); }
  alarm() {
    this.tone(196, 0.22, 'sawtooth', 0.2, 392);
    this.tone(196, 0.22, 'sawtooth', 0.2, 392, 0.24);
  }
  caught() {
    this.tone(220, 0.5, 'sawtooth', 0.25, 55);
    this.tone(110, 0.7, 'square', 0.14, 55, 0.1);
  }
  doorOpen() { this.tone(523, 0.15, 'sine', 0.18); this.tone(784, 0.3, 'sine', 0.18, null, 0.1); }
  levelClear() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, null, i * 0.11));
  }
  victory() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.2, null, i * 0.13));
  }
}
