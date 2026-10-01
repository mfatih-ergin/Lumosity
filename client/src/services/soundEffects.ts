/**
 * Zero-dependency Procedural Web Audio API Sound Synthesizer
 * Provides instant, zero-latency cognitive sound feedback for brain training.
 */

class SoundEffectsService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  private getContext(): AudioContext | null {
    if (this.isMuted || this.volume <= 0) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getDestination(): AudioNode | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public playClick() {
    const ctx = this.getContext();
    const dest = this.getDestination();
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(dest);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  public playCorrect(combo: number = 0) {
    const ctx = this.getContext();
    const dest = this.getDestination();
    if (!ctx || !dest) return;

    // Base pitch scales slightly with combo for cognitive reward
    const baseFreq = 523.25 * Math.pow(1.05, Math.min(combo, 10)); // C5
    const secondFreq = baseFreq * 1.25; // E5 major third

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(baseFreq, now);
    osc2.frequency.setValueAtTime(secondFreq, now + 0.05);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(now);
    osc1.stop(now + 0.22);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.22);
  }

  public playWrong() {
    const ctx = this.getContext();
    const dest = this.getDestination();
    if (!ctx || !dest) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.18);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playComboUp(combo: number) {
    const ctx = this.getContext();
    const dest = this.getDestination();
    if (!ctx || !dest) return;

    const now = ctx.currentTime;
    const freqs = [440, 554.37, 659.25, 880]; // A major arpeggio

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * (1 + combo * 0.03), now + idx * 0.04);

      gain.gain.setValueAtTime(0.3, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.2);
    });
  }

  public playLevelUp() {
    const ctx = this.getContext();
    const dest = this.getDestination();
    if (!ctx || !dest) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.35, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }

  public playCountdown(isGo: boolean = false) {
    const ctx = this.getContext();
    const dest = this.getDestination();
    if (!ctx || !dest) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isGo ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

    gain.gain.setValueAtTime(isGo ? 0.45 : 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.35 : 0.12));

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + (isGo ? 0.35 : 0.12));
  }

  public playVictory() {
    const ctx = this.getContext();
    const dest = this.getDestination();
    if (!ctx || !dest) return;

    const now = ctx.currentTime;
    const melody = [
      { f: 523.25, t: 0.0 },
      { f: 659.25, t: 0.12 },
      { f: 783.99, t: 0.24 },
      { f: 1046.5, t: 0.36 },
      { f: 1046.5, t: 0.52 },
    ];

    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.4, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.3);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now + note.t);
      osc.stop(now + note.t + 0.3);
    });
  }

  public playDefeat() {
    const ctx = this.getContext();
    const dest = this.getDestination();
    if (!ctx || !dest) return;

    const now = ctx.currentTime;
    const melody = [
      { f: 440, t: 0.0 },
      { f: 415.3, t: 0.16 },
      { f: 392, t: 0.32 },
      { f: 349.23, t: 0.48 },
    ];

    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.35, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.38);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now + note.t);
      osc.stop(now + note.t + 0.38);
    });
  }
}

export const sounds = new SoundEffectsService();
