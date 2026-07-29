class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxVolume: number = 0.5; // default 50%
  private musicVolume: number = 0.3; // default 30%
  private musicInterval: any = null;
  private currentStep: number = 0;

  // Delightful 16-step cute cartoon arpeggio melody
  private melody: number[] = [
    261.63, 329.63, 392.00, 523.25, // C4, E4, G4, C5
    440.00, 349.23, 293.66, 349.23, // A4, F4, D4, F4
    392.00, 329.63, 261.63, 329.63, // G4, E4, C4, E4
    293.66, 349.23, 392.00, 440.00  // D4, F4, G4, A4
  ];

  constructor() {
    // Safely parse saved volume preferences from previous sessions
    try {
      const savedSfx = localStorage.getItem('lulu_sfx_volume');
      if (savedSfx !== null) this.sfxVolume = parseFloat(savedSfx);
      const savedMusic = localStorage.getItem('lulu_music_volume');
      if (savedMusic !== null) this.musicVolume = parseFloat(savedMusic);
    } catch (e) {
      console.warn('Storage read disabled', e);
    }
  }

  public init() {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
        this.startMusicLoop();
      } catch (e) {
        console.warn('Web Audio API not supported', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem('lulu_sfx_volume', this.sfxVolume.toString());
    } catch (e) {}
  }

  setMusicVolume(v: number) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem('lulu_music_volume', this.musicVolume.toString());
    } catch (e) {}
    this.init();
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  private startMusicLoop() {
    if (this.musicInterval) return;
    this.musicInterval = setInterval(() => {
      if (!this.ctx || this.musicVolume <= 0.01) return;
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // soft cute triangle chiptune voice
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.melody[this.currentStep], now);

      // soft volume envelope to keep it friendly and atmospheric
      const finalGain = 0.045 * this.musicVolume;
      gain.gain.setValueAtTime(finalGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);

      this.currentStep = (this.currentStep + 1) % this.melody.length;
    }, 280);
  }

  playClick() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
    
    gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(now + 0.05);
  }

  playJoin() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const playBeep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08 * this.sfxVolume, start);
      gain.gain.linearRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playBeep(440, now, 0.08);
    playBeep(659.25, now + 0.08, 0.12);
  }

  playTag() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    // Low frequency crunch/thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
    gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.22);
    
    // White-noise burst for playfulness
    try {
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(450, now);
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.07 * this.sfxVolume, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.12);
    } catch (e) {
      // safe fallback
    }
  }

  playFound() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc2.type = 'sine';
    
    osc1.frequency.setValueAtTime(293.66, now); // D4
    osc1.frequency.linearRampToValueAtTime(146.83, now + 0.28);
    
    osc2.frequency.setValueAtTime(300, now);
    osc2.frequency.linearRampToValueAtTime(150, now + 0.28);
    
    gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.28);
    osc2.stop(now + 0.28);
  }

  playCountdown() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(550, now);
    gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.1);
  }

  playTimerWarning() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const playWarning = (start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, start);
      gain.gain.setValueAtTime(0.04 * this.sfxVolume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.08);
    };

    playWarning(now);
    playWarning(now + 0.12);
  }

  playVictory() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08 * this.sfxVolume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  playDefeat() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const notes = [392.00, 349.23, 311.13, 220.00]; // G4, F4, Eb4, A3
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.06 * this.sfxVolume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, start);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  }

  playFootstep(isSprinting = false) {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    const freq = isSprinting ? 110 : 75;
    osc.frequency.setValueAtTime(freq, now);
    
    const duration = isSprinting ? 0.05 : 0.07;
    const volume = isSprinting ? 0.04 : 0.02;
    gain.gain.setValueAtTime(volume * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + duration);
  }

  playSprintStart() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
    gain.gain.setValueAtTime(0.05 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.12);
  }

  playMatchStart() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const playBeep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12 * this.sfxVolume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    
    playBeep(329.63, now, 0.18); // E4
    playBeep(392.00, now + 0.12, 0.18); // G4
    playBeep(523.25, now + 0.24, 0.35); // C5
  }

  playMatchEnd() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const playBeep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.1 * this.sfxVolume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    
    playBeep(392.00, now, 0.22); // G4
    playBeep(349.23, now + 0.18, 0.22); // F4
    playBeep(261.63, now + 0.36, 0.45); // C4
  }

  playLastHiderAlert() {
    if (this.sfxVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.linearRampToValueAtTime(523.25, now + 0.5); // C5
    
    gain.gain.setValueAtTime(0.07 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, now);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.5);
  }
}

export const soundManager = new SoundManager();
