// Web Audio API Synth Engine for POS & ERP Sound Effects
// Works 100% offline with zero external audio assets or audio file dependencies

export interface ToneOption {
  id: string;
  name: string;
  duration: string; // e.g. "(1.5s)"
  description: string;
}

export interface SoundCategory {
  id: 'notification' | 'success' | 'scan' | 'warning' | 'delete';
  label: string;
  description: string;
  defaultTone: string;
  tones: ToneOption[];
}

export const SOUND_CATEGORIES: SoundCategory[] = [
  {
    id: 'notification',
    label: 'Notification Ping',
    description: 'Chimes played for system toasts, popups, and real-time alerts.',
    defaultTone: 'notif_digital_chime',
    tones: [
      { id: 'notif_digital_chime', name: 'Modern Digital Chime', duration: '(1.4s)', description: 'Crisp, high-end Apple/Slack style tech chime with crystalline decay.' },
      { id: 'notif_marimba_pop', name: 'Acoustic Marimba Pop', duration: '(1.3s)', description: 'Warm African wooden marimba melodic triad with percussive warmth.' },
      { id: 'notif_arcade_retro', name: '8-Bit Retro Arcade', duration: '(1.2s)', description: 'Nostalgic Nintendo-style coin powerup sparkle arpeggio.' },
      { id: 'notif_zen_bell', name: 'Tibetan Temple Gong', duration: '(1.8s)', description: 'Deep meditative 432Hz brass singing bowl with shimmering low resonance.' },
      { id: 'notif_cyber_pulse', name: 'Cyber Laser Radar', duration: '(1.5s)', description: 'High-tech frequency sweep with spacey radar echo tail.' },
    ],
  },
  {
    id: 'success',
    label: 'Invoice Saved (Success)',
    description: 'Triumphant celebratory chimes played on invoice completion and payment receipts.',
    defaultTone: 'success_cash_register',
    tones: [
      { id: 'success_cash_register', name: 'Cash Register (Ka-Ching!)', duration: '(1.4s)', description: 'Mechanical register ratchet click, metallic coin clink & ringing cash bell.' },
      { id: 'success_brass_fanfare', name: 'Triumphant Brass Fanfare', duration: '(1.6s)', description: 'Grand 5-note royal trumpet celebration chord progression.' },
      { id: 'success_level_up', name: 'Arcade Level-Up Victory', duration: '(1.3s)', description: 'High-energy video game win flourish with happy resolution.' },
      { id: 'success_smooth_rhodes', name: 'Smooth Jazz Rhodes Chord', duration: '(1.7s)', description: 'Luxurious neo-soul electric piano chord with mellow stereo tremolo.' },
      { id: 'success_affirmative_double', name: 'Positive Affirmative Chime', duration: '(1.5s)', description: 'Warm, uplifting double-gong affirmation with lingering major triad.' },
    ],
  },
  {
    id: 'scan',
    label: 'Barcode Scan Beep',
    description: 'Crisp audible confirmations when scanning or adding items to invoices.',
    defaultTone: 'scan_supermarket_beep',
    tones: [
      { id: 'scan_supermarket_beep', name: 'Supermarket Laser Beep', duration: '(1.1s)', description: 'Authentic Zebra/Honeywell retail cashier laser beep with store room reverb.' },
      { id: 'scan_hologram_chirp', name: 'Holographic Cyber Chirp', duration: '(1.2s)', description: 'Fast dual optic laser frequency sweep with modern high-tech shimmer.' },
      { id: 'scan_wooden_click', name: 'Acoustic Woodblock Tap', duration: '(1.1s)', description: 'Mellow, warm wooden percussive knock followed by gentle room ambiance.' },
      { id: 'scan_crystal_ping', name: 'Crystal Glass Rim Ping', duration: '(1.4s)', description: 'Razor-sharp fine crystal glass tap with pure acoustic high-frequency decay.' },
    ],
  },
  {
    id: 'warning',
    label: 'Limit Warning Alert',
    description: 'Noticeable caution tones when customer reaches or exceeds credit boundaries.',
    defaultTone: 'warn_hazard_siren',
    tones: [
      { id: 'warn_hazard_siren', name: 'Two-Tone Hazard Siren', duration: '(1.5s)', description: 'Urgent alternating industrial caution horn (660Hz <-> 440Hz).' },
      { id: 'warn_airplane_dingdong', name: 'Airplane Cabin Ding-Dong', duration: '(1.6s)', description: 'Iconic Boeing/Airbus overhead passenger chime with long cabin sustain.' },
      { id: 'warn_sonar_ping', name: 'Submarine Sonar Ping', duration: '(1.7s)', description: 'Eerie underwater acoustic radar ping with hollow cavern reverberation.' },
      { id: 'warn_triple_buzzer', name: 'Triple Staccato Buzzer', duration: '(1.3s)', description: 'Three sharp aggressive sawtooth warning pulses that command attention.' },
      { id: 'warn_bass_braam', name: 'Deep Cinema Bass Braam', duration: '(1.6s)', description: 'Heavy sub-bass trailer boom (110Hz -> 55Hz) with vibrating low-end weight.' },
    ],
  },
  {
    id: 'delete',
    label: 'Item Removed (Delete)',
    description: 'Acoustic cancellation and removal sounds when deleting invoice line items.',
    defaultTone: 'del_trash_whoosh',
    tones: [
      { id: 'del_trash_whoosh', name: 'Trash Bin Paper Whoosh', duration: '(1.2s)', description: 'Realistic aerodynamic whoosh and crumple sound of item thrown in bin.' },
      { id: 'del_cartoon_slide', name: 'Descending Cartoon Slide', duration: '(1.4s)', description: 'Whimsical downward trombone/spring slide signaling cancellation.' },
      { id: 'del_water_droplet', name: 'Deep Cave Water Plop', duration: '(1.3s)', description: 'Natural cavernous water droplet with steep pitch drop and acoustic ripple.' },
      { id: 'del_muted_woodthud', name: 'Muted Heavy Thud', duration: '(1.2s)', description: 'Low-end muted mechanical strike signaling item removed from the record.' },
    ],
  },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(): AudioBuffer | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    if (!this.noiseBuffer) {
      const bufferSize = ctx.sampleRate * 2;
      this.noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.noiseBuffer;
  }

  // ═════════════════════════════════════════════════════════════
  // 1. NOTIFICATION TONES
  // ═════════════════════════════════════════════════════════════

  /**
   * 1.1 Modern Digital Chime: High-pitch crystal two-tone chime (B5 -> E6)
   */
  playModernDigitalChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [
      { freq: 987.77, start: 0.00, end: 1.10 }, // B5
      { freq: 1318.51, start: 0.16, end: 1.40 }, // E6
    ].forEach(({ freq, start, end }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.24, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + end + 0.02);

      // Crystalline overtone
      const harm = ctx.createOscillator();
      const hGain = ctx.createGain();
      harm.type = 'sine';
      harm.frequency.setValueAtTime(freq * 2.5, now + start);
      hGain.gain.setValueAtTime(0.001, now + start);
      hGain.gain.linearRampToValueAtTime(0.04, now + start + 0.01);
      hGain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.4);
      harm.connect(hGain);
      hGain.connect(ctx.destination);
      harm.start(now + start);
      harm.stop(now + start + 0.42);
    });
  }

  /**
   * 1.2 Acoustic Marimba Pop: Warm African wooden marimba triad (G4 -> C5 -> E5)
   */
  playMarimbaPop(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [
      { freq: 392.00, start: 0.00, end: 0.8 }, // G4
      { freq: 523.25, start: 0.14, end: 1.0 }, // C5
      { freq: 659.25, start: 0.28, end: 1.3 }, // E5
    ].forEach(({ freq, start, end }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Triangle wave with sharp percussive initial attack
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.26, now + start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + end + 0.02);
    });
  }

  /**
   * 1.3 8-Bit Retro Arcade: Nintendo-style coin / powerup sparkle arpeggio
   */
  playArcadeRetro(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Fast square wave arpeggio: B4 -> E5 -> G#5 -> B5 -> E6
    const notes = [493.88, 659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const start = idx * 0.07;
      const isLast = idx === notes.length - 1;
      const end = isLast ? 1.20 : start + 0.09;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.12, now + start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + end + 0.02);
    });
  }

  /**
   * 1.4 Tibetan Temple Gong: Deep meditative 432Hz brass singing bowl
   */
  playZenBell(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 432 Hz healing bowl fundamental + 864 Hz first harmonic
    [
      { freq: 432.0, gainVal: 0.28, end: 1.80 },
      { freq: 864.0, gainVal: 0.10, end: 1.50 },
      { freq: 1296.0, gainVal: 0.04, end: 1.20 },
    ].forEach(({ freq, gainVal, end }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + end + 0.02);
    });
  }

  /**
   * 1.5 Cyber Laser Radar: High-tech frequency sweep with spacey radar echo
   */
  playCyberPulse(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [0.0, 0.45].forEach((start, sweepIdx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startFreq = sweepIdx === 0 ? 800 : 1200;
      const endFreq = sweepIdx === 0 ? 1400 : 2000;

      osc.frequency.setValueAtTime(startFreq, now + start);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + start + 0.25);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.20, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 1.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + 1.08);
    });
  }

  // ═════════════════════════════════════════════════════════════
  // 2. SUCCESS / INVOICE SAVED TONES
  // ═════════════════════════════════════════════════════════════

  /**
   * 2.1 Cash Register (Ka-Ching!): Mechanical ratchet click, coin clink & ringing cash bell
   */
  playCashRegister(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Mechanical Lever Ratchet Click (Filtered Noise Burst)
    const noise = this.getNoiseBuffer();
    if (noise) {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3.0, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.25, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noiseSource.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noiseSource.start(now);
      noiseSource.stop(now + 0.09);
    }

    // 2. Metallic Coin Clinks (High-frequency metallic transient)
    [
      { freq: 2489.02, start: 0.06 }, // D#7
      { freq: 3135.96, start: 0.12 }, // G7
    ].forEach(({ freq, start }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + 0.24);
    });

    // 3. Ringing Cash Register Bell Chime (C6 -> G6)
    [
      { freq: 1046.50, start: 0.18, end: 1.40 }, // C6
      { freq: 1567.98, start: 0.26, end: 1.45 }, // G6
    ].forEach(({ freq, start, end }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.24, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + end + 0.02);
    });
  }

  /**
   * 2.2 Triumphant Brass Fanfare: Grand 5-note royal trumpet celebration chord progression
   */
  playBrassFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Triumphant trumpet fanfare (C4 -> G4 -> C5 -> E5 -> G5)
    const notes = [
      { freq: 261.63, start: 0.00, end: 0.65 },
      { freq: 392.00, start: 0.15, end: 0.85 },
      { freq: 523.25, start: 0.30, end: 1.05 },
      { freq: 659.25, start: 0.45, end: 1.30 },
      { freq: 783.99, start: 0.60, end: 1.60 },
    ];

    notes.forEach(({ freq, start, end }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Sawtooth wave filtered for realistic brass trumpet timbre
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + start);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3.5, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.16, now + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + end);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + end + 0.02);
    });
  }

  /**
   * 2.3 Arcade Level-Up Victory: High-energy video game win flourish
   */
  playLevelUp(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Rapid game powerup flourish
    const sequence = [
      { f: 523.25, s: 0.00 },
      { f: 659.25, s: 0.08 },
      { f: 783.99, s: 0.16 },
      { f: 1046.50, s: 0.24 },
      { f: 1318.51, s: 0.36 },
      { f: 1567.98, s: 0.48 },
    ];

    sequence.forEach(({ f, s }, idx) => {
      const isEnd = idx === sequence.length - 1;
      const decay = isEnd ? 1.30 : s + 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + s);

      gain.gain.setValueAtTime(0.001, now + s);
      gain.gain.linearRampToValueAtTime(0.20, now + s + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + s);
      osc.stop(now + decay + 0.02);
    });
  }

  /**
   * 2.4 Smooth Jazz Rhodes Chord: Luxurious neo-soul electric piano chord with mellow stereo tremolo
   */
  playSmoothRhodes(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Ebmaj9 luxurious chord: Eb3, Bb3, D4, F4, G4
    const chord = [155.56, 233.08, 293.66, 349.23, 392.00];
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.10, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.70);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.72);
    });
  }

  /**
   * 2.5 Positive Affirmative Chime: Warm, uplifting double-gong affirmation with lingering major triad
   */
  playAffirmativeDouble(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [
      { f: 440.0, s: 0.00, e: 1.10 }, // A4
      { f: 880.0, s: 0.28, e: 1.50 }, // A5
      { f: 1108.73, s: 0.42, e: 1.52 }, // C#6
    ].forEach(({ f, s, e }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + s);

      gain.gain.setValueAtTime(0.001, now + s);
      gain.gain.linearRampToValueAtTime(0.22, now + s + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + e);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + s);
      osc.stop(now + e + 0.02);
    });
  }

  // ═════════════════════════════════════════════════════════════
  // 3. SCAN TONES
  // ═════════════════════════════════════════════════════════════

  /**
   * 3.1 Supermarket Laser Beep: Authentic retail POS Honeywell/Zebra laser beep (1850Hz)
   */
  playSupermarketBeep(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Classic 1850 Hz sharp retail scanner beep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, now);

    // Initial punchy click followed by sustain tail
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.10);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.12);
  }

  /**
   * 3.2 Holographic Cyber Chirp: Fast dual optic laser frequency sweep
   */
  playHologramChirp(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sweep 1: 1200 -> 2400 Hz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.20);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.22);
  }

  /**
   * 3.3 Acoustic Woodblock Tap: Mellow, warm wooden percussive knock
   */
  playWoodenClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [480, 320].forEach((freq, idx) => {
      const s = idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + s);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + s + 0.08);

      gain.gain.setValueAtTime(0.001, now + s);
      gain.gain.linearRampToValueAtTime(0.24, now + s + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.10);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + s);
      osc.stop(now + 1.12);
    });
  }

  /**
   * 3.4 Crystal Glass Rim Ping: Razor-sharp fine crystal glass tap
   */
  playCrystalPing(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2637.02, now); // E7 ultra-clear glass harmonic

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.40);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.42);
  }

  // ═════════════════════════════════════════════════════════════
  // 4. WARNING TONES
  // ═════════════════════════════════════════════════════════════

  /**
   * 4.1 Two-Tone Hazard Siren: Urgent alternating industrial caution horn (660Hz <-> 440Hz)
   */
  playHazardSiren(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Alternates: High (660Hz) -> Low (440Hz) -> High (660Hz) -> Low (440Hz)
    const pulses = [
      { freq: 660, start: 0.00, end: 0.32 },
      { freq: 440, start: 0.34, end: 0.68 },
      { freq: 660, start: 0.70, end: 1.04 },
      { freq: 440, start: 1.06, end: 1.50 },
    ];

    pulses.forEach(({ freq, start, end }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + start);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + end);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + end + 0.02);
    });
  }

  /**
   * 4.2 Airplane Cabin Ding-Dong: Iconic overhead passenger chime (F5 -> C5)
   */
  playAirplaneDingDong(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Classic loud overhead cabin announcement chime
    [
      { freq: 698.46, start: 0.00, end: 1.10 }, // F5 (Ding)
      { freq: 523.25, start: 0.45, end: 1.60 }, // C5 (Dong)
    ].forEach(({ freq, start, end }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.28, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + end + 0.02);
    });
  }

  /**
   * 4.3 Submarine Sonar Ping: Eerie underwater acoustic radar ping with hollow cavern reverberation
   */
  playSonarPing(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 840 Hz pure sonar pulse with long underwater reverberation tail
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.70);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.72);
  }

  /**
   * 4.4 Triple Staccato Buzzer: Three sharp aggressive sawtooth warning pulses
   */
  playTripleBuzzer(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Buzz - Buzz - Buzz!
    [0.00, 0.32, 0.64].forEach((start) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.20, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + 0.30);
    });
  }

  /**
   * 4.5 Deep Cinema Bass Braam: Heavy sub-bass trailer boom (110Hz -> 55Hz)
   */
  playBassBraam(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.8);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.60);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.62);
  }

  // ═════════════════════════════════════════════════════════════
  // 5. DELETE TONES
  // ═════════════════════════════════════════════════════════════

  /**
   * 5.1 Trash Bin Paper Whoosh: Realistic aerodynamic whoosh and crumple sound
   */
  playTrashWhoosh(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const noise = this.getNoiseBuffer();
    if (noise) {
      const src = ctx.createBufferSource();
      src.buffer = noise;

      // Downward sweeping bandpass filter mimics paper whoosh into bin
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.6);
      filter.Q.setValueAtTime(2.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.20);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      src.stop(now + 1.22);
    }
  }

  /**
   * 5.2 Descending Cartoon Slide: Whimsical downward trombone/spring slide
   */
  playCartoonSlide(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Descending notes: G4 -> F4 -> D4 -> Bb3
    const notes = [
      { f: 392.00, s: 0.00, e: 0.35 },
      { f: 349.23, s: 0.25, e: 0.60 },
      { f: 293.66, s: 0.50, e: 0.90 },
      { f: 233.08, s: 0.80, e: 1.40 },
    ];

    notes.forEach(({ f, s, e }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + s);

      gain.gain.setValueAtTime(0.001, now + s);
      gain.gain.linearRampToValueAtTime(0.18, now + s + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + e);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + s);
      osc.stop(now + e + 0.02);
    });
  }

  /**
   * 5.3 Deep Cave Water Plop: Natural cavernous water droplet with steep pitch drop
   */
  playWaterDroplet(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(850, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.16);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.30);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.32);
  }

  /**
   * 5.4 Muted Heavy Thud: Low-end muted mechanical strike
   */
  playMutedWoodThud(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.20);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.22);
  }

  // ═════════════════════════════════════════════════════════════
  // UNIVERSAL DISPATCHER BY TONE ID
  // ═════════════════════════════════════════════════════════════

  playToneById(toneId: string): void {
    switch (toneId) {
      // 1. Notification
      case 'notif_digital_chime':
      case 'wind_chime_15':
        this.playModernDigitalChime();
        break;
      case 'notif_marimba_pop':
      case 'crystal_harp_20':
        this.playMarimbaPop();
        break;
      case 'notif_arcade_retro':
      case 'double_bell_12':
        this.playArcadeRetro();
        break;
      case 'notif_zen_bell':
      case 'cosmic_starlight_22':
        this.playZenBell();
        break;
      case 'notif_cyber_pulse':
      case 'warm_epiano_14':
        this.playCyberPulse();
        break;

      // 2. Success / Invoice Saved
      case 'success_cash_register':
      case 'cash_register_12':
        this.playCashRegister();
        break;
      case 'success_brass_fanfare':
      case 'triumphant_fanfare_15':
        this.playBrassFanfare();
        break;
      case 'success_level_up':
      case 'grand_achievement_20':
        this.playLevelUp();
        break;
      case 'success_smooth_rhodes':
      case 'royal_victory_25':
        this.playSmoothRhodes();
        break;
      case 'success_affirmative_double':
      case 'zen_crystal_18':
        this.playAffirmativeDouble();
        break;

      // 3. Scan
      case 'scan_supermarket_beep':
      case 'checkout_chime_11':
        this.playSupermarketBeep();
        break;
      case 'scan_hologram_chirp':
      case 'laser_ping_12':
        this.playHologramChirp();
        break;
      case 'scan_wooden_click':
      case 'optic_crystal_10':
        this.playWoodenClick();
        break;
      case 'scan_crystal_ping':
      case 'digital_sparkle_14':
        this.playCrystalPing();
        break;

      // 4. Warning
      case 'warn_hazard_siren':
      case 'triple_pulse_14':
        this.playHazardSiren();
        break;
      case 'warn_airplane_dingdong':
      case 'airplane_chime_15':
        this.playAirplaneDingDong();
        break;
      case 'warn_sonar_ping':
      case 'radar_beacon_18':
        this.playSonarPing();
        break;
      case 'warn_triple_buzzer':
      case 'urgent_triple_12':
        this.playTripleBuzzer();
        break;
      case 'warn_bass_braam':
      case 'amber_drone_20':
        this.playBassBraam();
        break;

      // 5. Delete
      case 'del_trash_whoosh':
      case 'marimba_fall_13':
        this.playTrashWhoosh();
        break;
      case 'del_cartoon_slide':
      case 'sub_bass_drop_15':
        this.playCartoonSlide();
        break;
      case 'del_water_droplet':
      case 'water_droplet_14':
        this.playWaterDroplet();
        break;
      case 'del_muted_woodthud':
      case 'wooden_block_12':
        this.playMutedWoodThud();
        break;

      default:
        this.playModernDigitalChime();
        break;
    }
  }

  // Backward compatibility methods
  playSuccessChime(): void { this.playCashRegister(); }
  playScanBeep(): void { this.playSupermarketBeep(); }
  playWarningTone(): void { this.playHazardSiren(); }
  playNotificationChime(): void { this.playModernDigitalChime(); }
  playDeleteTone(): void { this.playTrashWhoosh(); }
}

export const soundEngine = new SoundEngine();

/**
 * Storage helpers for per-user audio preference
 * Stored strictly per-user so one cashier's workstation doesn't impact others
 */
const getStorageKey = (userIdOrEmail?: string | null): string => {
  const cleanId = (userIdOrEmail || 'current_user').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
  return `erp_sound_effects_enabled_${cleanId}`;
};

export const isUserAudioEnabled = (userIdOrEmail?: string | null): boolean => {
  if (typeof window === 'undefined') return true;
  const key = getStorageKey(userIdOrEmail);
  const val = localStorage.getItem(key);
  // Default to enabled (true) if not set yet
  return val === null ? true : val === 'true';
};

export const setUserAudioEnabled = (enabled: boolean, userIdOrEmail?: string | null): void => {
  if (typeof window === 'undefined') return;
  const key = getStorageKey(userIdOrEmail);
  localStorage.setItem(key, String(enabled));
  window.dispatchEvent(new CustomEvent('erp_audio_preference_changed', { detail: { enabled, key } }));
};

const getToneStorageKey = (category: string, userIdOrEmail?: string | null): string => {
  const cleanId = (userIdOrEmail || 'current_user').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
  return `erp_tone_pref_${cleanId}_${category}`;
};

export const getUserTone = (category: string, userIdOrEmail?: string | null): string => {
  if (typeof window === 'undefined') return '';
  const key = getToneStorageKey(category, userIdOrEmail);
  const val = localStorage.getItem(key);
  if (val) return val;
  const cat = SOUND_CATEGORIES.find((c) => c.id === category);
  return cat ? cat.defaultTone : '';
};

export const setUserTone = (category: string, toneId: string, userIdOrEmail?: string | null): void => {
  if (typeof window === 'undefined') return;
  const key = getToneStorageKey(category, userIdOrEmail);
  localStorage.setItem(key, toneId);
  window.dispatchEvent(new CustomEvent('erp_tone_preference_changed', { detail: { category, toneId, key } }));
};

let lastPlayedTime = 0;
let lastPlayedKey = '';

/**
 * Universal sound trigger that respects active user audio preference & chosen tone
 */
export const triggerFeedbackSound = (
  type: 'success' | 'scan' | 'warning' | 'delete' | 'notification',
  userIdOrEmail?: string | null
): void => {
  if (!isUserAudioEnabled(userIdOrEmail)) {
    return;
  }
  const now = Date.now();
  // Prevent duplicate sounds overlapping within 350ms
  if (now - lastPlayedTime < 350 && lastPlayedKey === type) {
    return;
  }
  lastPlayedTime = now;
  lastPlayedKey = type;

  try {
    const toneId = getUserTone(type, userIdOrEmail);
    soundEngine.playToneById(toneId);
  } catch (err) {
    console.warn('Audio feedback failed:', err);
  }
};
