// Procedural Web Audio API Sound Engine for Wings of the Wild
(function () {
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.masterGain = null;
      this.ambientInterval = null;
      this.lastFlapTime = 0;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.45;
      this.masterGain.connect(this.ctx.destination);
      this.startAmbience();
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(
          this.muted ? 0 : 0.45,
          this.ctx.currentTime,
          0.05
        );
      }
      return this.muted;
    }

    startAmbience() {
      if (this.ambientInterval) clearInterval(this.ambientInterval);
      this.ambientInterval = setInterval(() => {
        if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
        if (Math.random() < 0.45) {
          this.playBirdChirp();
        }
      }, 3200);
    }

    playBirdChirp() {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 1800 + Math.random() * 900;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.28, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.22);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.26);
    }

    playFlap(intensity = 0.5) {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      if (now - this.lastFlapTime < 0.09) return;
      this.lastFlapTime = now;

      // Soft filtered noise puff for butterfly wing beat
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.055);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 320 + intensity * 240;
      filter.Q.value = 1.8;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.045 * Math.min(1.3, intensity);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
    }

    playEatFruit(isGolden = false) {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const notes = isGolden
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
        : [587.33, 783.99, 1046.5];

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isGolden ? 'triangle' : 'sine';
        const t = now + idx * 0.055;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.03, t + 0.14);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    }

    playDash() {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(820, now + 0.16);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.28);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.31);
    }

    playPredatorAlert(type) {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'hawk') {
        // High piercing hawk screech
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1650, now);
        osc.frequency.exponentialRampToValueAtTime(920, now + 0.35);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.09, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      } else if (type === 'frog') {
        // Deep resonant croak
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(135, now);
        osc.frequency.linearRampToValueAtTime(195, now + 0.09);
        osc.frequency.linearRampToValueAtTime(115, now + 0.22);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      } else {
        // Fox / Lynx sharp growl-bark
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.2);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      }

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.4);
    }

    playLoseLife() {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const freqs = [392.0, 349.23, 293.66, 220.0];
      freqs.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        const t = now + i * 0.09;
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.88, t + 0.22);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.26);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.28);
      });
    }

    playLowFuelBeep() {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.19);
    }
  }

  window.ButterflyGame = window.ButterflyGame || {};
  window.ButterflyGame.SoundEngine = SoundEngine;
})();
