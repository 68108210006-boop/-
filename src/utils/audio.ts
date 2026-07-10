// Simple Web Audio API Synth for Retro 8-bit Sound Effects and Background Music
class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private bgmInterval: any = null;
  private currentNotes: AudioNode[] = [];
  private bgmPlaying = false;
  private settings = {
    soundEnabled: true,
    bgmVolume: 0.2,
    sfxVolume: 0.4,
  };

  constructor() {
    // Lazy initialize when user interacts
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public updateSettings(enabled: boolean, bgmVol: number, sfxVol: number) {
    this.settings.soundEnabled = enabled;
    this.settings.bgmVolume = bgmVol;
    this.settings.sfxVolume = sfxVol;

    if (!enabled) {
      this.stopBgm();
    } else if (this.bgmPlaying && !this.bgmInterval) {
      this.startBgm();
    }
  }

  // --- Sound Effects ---

  public playAttack() {
    if (!this.settings.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // Swoosh frequency sweep
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(this.settings.sfxVolume * 0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  public playSkill() {
    if (!this.settings.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(this.settings.sfxVolume * 0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  public playHit() {
    if (!this.settings.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Short crunchy explosion sound (using noise filter or low frequency square wave)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(this.settings.sfxVolume * 1.0, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  public playCollect() {
    if (!this.settings.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    // High pitched retro "ding!" (two notes quickly C5 -> C6)
    const now = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(this.settings.sfxVolume * 0.7, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.1);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.08); // C6
    gain2.gain.setValueAtTime(this.settings.sfxVolume * 0.7, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.38);
  }

  public playHurt() {
    if (!this.settings.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Low pitched retro grunt
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(this.settings.sfxVolume * 1.0, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  public playGameOver() {
    if (!this.settings.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Sad descending retro scale
    const notes = [293.66, 261.63, 220.00, 196.00]; // D4, C4, A3, G3
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.25);
      
      gain.gain.setValueAtTime(this.settings.sfxVolume * 0.8, now + idx * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.25 + 0.3);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.25);
      osc.stop(now + idx * 0.25 + 0.35);
    });
  }

  // --- Background Music Sequencer ---

  public startBgm() {
    this.bgmPlaying = true;
    if (!this.settings.soundEnabled) return;

    this.initContext();
    if (!this.ctx) return;

    if (this.bgmInterval) return;

    // RPG adventure sequence melody (8-bit)
    // Notes: C4, G4, A4, F4, G4, E4, F4, D4
    const melody = [261.63, 392.00, 440.00, 349.23, 392.00, 329.63, 349.23, 293.66];
    const bass = [130.81, 196.00, 220.00, 174.61, 196.00, 164.81, 174.61, 146.83];
    let step = 0;
    const tempo = 220; // ms per step

    this.bgmInterval = setInterval(() => {
      if (!this.ctx || this.ctx.state === 'suspended' || !this.settings.soundEnabled) return;

      const now = this.ctx.currentTime;
      
      // Melody note (Square wave)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle'; // triangle is smoother for BG
      osc1.frequency.setValueAtTime(melody[step], now);
      gain1.gain.setValueAtTime(this.settings.bgmVolume * 0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + (tempo / 1000) * 0.9);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + (tempo / 1000));

      // Bass note (Sine/Triangle wave)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(bass[step] / 2, now); // Octave lower bass
      gain2.gain.setValueAtTime(this.settings.bgmVolume * 0.6, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + (tempo / 1000) * 0.95);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + (tempo / 1000));

      step = (step + 1) % melody.length;
    }, tempo);
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const audio = new RetroAudioEngine();
