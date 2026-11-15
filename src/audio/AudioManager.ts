export type AmbientMood = 'frozen' | 'temperate' | 'hot';

interface MoodBus {
  gain: GainNode;
  stop: () => void;
}

/**
 * Procedural Web Audio ambient soundscape manager.
 * Synthesizes three crossfading climate soundscapes without external audio assets:
 * - frozen: low arctic wind hum + subtle sub-harmonic drone
 * - temperate: soft coastal water lap with slow wave-swell LFO
 * - hot: crackling thermal shimmer with procedural micro-crackles
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buses: Record<AmbientMood, MoodBus> | null = null;
  private introBus: MoodBus | null = null;
  private crackleTimer: number | null = null;
  private introArpTimer: number | null = null;
  private introArpStep = 0;
  private noiseBuffer: AudioBuffer | null = null;

  private currentMood: AmbientMood = 'temperate';
  private introMusicActive = false;
  private storyChapter: 1 | 2 | 3 | null = null;
  private muted = false;
  private disposed = false;

  private isThemeActive(): boolean {
    return this.introMusicActive || this.storyChapter !== null;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.18, now, 0.12);
    if (!muted && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    if (!this.muted) {
      this.unlock();
    }
    return this.muted;
  }

  public unlock(): void {
    if (this.disposed || typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.buildGraph(this.ctx);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => {
        if (!this.disposed && this.isThemeActive() && !this.muted && this.ctx && this.introBus) {
          this.triggerIntroChime(this.ctx, this.introBus.gain);
        }
      });
    } else if (this.isThemeActive() && !this.muted && this.introBus && this.introArpStep === 0) {
      this.triggerIntroChime(this.ctx, this.introBus.gain);
    }

    // Apply current mood, intro/story theme & mute state immediately after graph is ready
    this.applyMood(this.currentMood);
    this.applyIntroMusic(this.isThemeActive());
    this.setMuted(this.muted);
  }

  public setMood(mood: AmbientMood): void {
    this.currentMood = mood;
    if (!this.ctx || !this.buses) return;
    this.applyMood(mood);
  }

  public setIntroMusicActive(active: boolean): void {
    const wasTheme = this.isThemeActive();
    this.introMusicActive = active;
    const nowTheme = this.isThemeActive();
    if (!this.ctx || !this.buses || !this.introBus) return;
    this.applyMood(this.currentMood);
    this.applyIntroMusic(nowTheme);
    if (nowTheme && !wasTheme && !this.muted && this.ctx.state === 'running') {
      this.triggerIntroChime(this.ctx, this.introBus.gain);
    }
  }

  public setStoryChapter(chapter: 1 | 2 | 3 | null): void {
    const changed = this.storyChapter !== chapter;
    this.storyChapter = chapter;
    const nowTheme = this.isThemeActive();
    if (!this.ctx || !this.buses || !this.introBus) return;
    this.applyMood(this.currentMood);
    this.applyIntroMusic(nowTheme);
    if (chapter !== null && changed && !this.muted && this.ctx.state === 'running') {
      this.triggerIntroChime(this.ctx, this.introBus.gain);
    }
  }

  private applyMood(mood: AmbientMood): void {
    if (!this.ctx || !this.buses) return;
    const now = this.ctx.currentTime;
    const scale = this.isThemeActive() ? 0.32 : 1;
    (['frozen', 'temperate', 'hot'] as AmbientMood[]).forEach((key) => {
      const bus = this.buses![key];
      bus.gain.gain.setTargetAtTime(key === mood ? scale : 0, now, 0.55);
    });
  }

  private applyIntroMusic(active: boolean): void {
    if (!this.ctx || !this.introBus) return;
    const now = this.ctx.currentTime;
    this.introBus.gain.gain.setTargetAtTime(active ? 1 : 0, now, active ? 0.75 : 0.7);
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Voss-McCartney style smooth pink/brown-leaning noise for organic wind & surf
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      data[i] = Math.max(-1, Math.min(1, pink * 0.08));
    }

    // Crossfade start/end 256 samples for seamless looping
    const fade = 256;
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      data[i] = data[i] * t + data[length - fade + i] * (1 - t);
    }

    return buffer;
  }

  private buildGraph(ctx: AudioContext): void {
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.18;
    master.connect(ctx.destination);
    this.masterGain = master;

    this.noiseBuffer = this.createNoiseBuffer(ctx);

    // 1. FROZEN: Low arctic wind hum
    const frozenBus = (() => {
      const busGain = ctx.createGain();
      busGain.gain.value = this.currentMood === 'frozen' ? 1 : 0;
      busGain.connect(master);

      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 175;
      filter.Q.value = 1.6;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.11;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 55;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.72;

      const drone = ctx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 110;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.06;

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(busGain);

      drone.connect(droneGain);
      droneGain.connect(busGain);

      noise.start();
      lfo.start();
      drone.start();

      return {
        gain: busGain,
        stop: () => {
          noise.stop();
          lfo.stop();
          drone.stop();
        },
      };
    })();

    // 2. TEMPERATE: Soft coastal water lap
    const temperateBus = (() => {
      const busGain = ctx.createGain();
      busGain.gain.value = this.currentMood === 'temperate' ? 1 : 0;
      busGain.connect(master);

      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 460;
      lp.Q.value = 0.7;

      const surfGain = ctx.createGain();
      surfGain.gain.value = 0.36;

      // Gentle rhythmic wave swell
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.16;
      const lfoFilterGain = ctx.createGain();
      lfoFilterGain.gain.value = 210;
      lfo.connect(lfoFilterGain);
      lfoFilterGain.connect(lp.frequency);

      const lfoAmpGain = ctx.createGain();
      lfoAmpGain.gain.value = 0.14;
      lfo.connect(lfoAmpGain);
      lfoAmpGain.connect(surfGain.gain);

      const oceanWarmth = ctx.createOscillator();
      oceanWarmth.type = 'sine';
      oceanWarmth.frequency.value = 73.4;
      const warmthGain = ctx.createGain();
      warmthGain.gain.value = 0.03;

      noise.connect(lp);
      lp.connect(surfGain);
      surfGain.connect(busGain);

      oceanWarmth.connect(warmthGain);
      warmthGain.connect(busGain);

      noise.start();
      lfo.start();
      oceanWarmth.start();

      return {
        gain: busGain,
        stop: () => {
          noise.stop();
          lfo.stop();
          oceanWarmth.stop();
        },
      };
    })();

    // 3. HOT: Crackling thermal shimmer
    const hotBus = (() => {
      const busGain = ctx.createGain();
      busGain.gain.value = this.currentMood === 'hot' ? 1 : 0;
      busGain.connect(master);

      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;

      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 2350;
      hp.Q.value = 1.5;

      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0.24;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.35;
      const lfoFreq = ctx.createGain();
      lfoFreq.gain.value = 480;
      lfo.connect(lfoFreq);
      lfoFreq.connect(hp.frequency);

      // Subtle warm harmonic shimmer
      const oscA = ctx.createOscillator();
      oscA.type = 'triangle';
      oscA.frequency.value = 330;
      const oscB = ctx.createOscillator();
      oscB.type = 'sine';
      oscB.frequency.value = 495;
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.022;

      noise.connect(hp);
      hp.connect(shimmerGain);
      shimmerGain.connect(busGain);

      oscA.connect(oscGain);
      oscB.connect(oscGain);
      oscGain.connect(busGain);

      noise.start();
      lfo.start();
      oscA.start();
      oscB.start();

      return {
        gain: busGain,
        stop: () => {
          noise.stop();
          lfo.stop();
          oscA.stop();
          oscB.stop();
        },
      };
    })();

    this.buses = {
      frozen: frozenBus,
      temperate: temperateBus,
      hot: hotBus,
    };

    // 4. OPENING SPACE AMBIENT THEME: gentle lowpass warm pad + delicate sparse chimes
    const introBus = (() => {
      const busGain = ctx.createGain();
      busGain.gain.value = this.introMusicActive ? 1 : 0;
      busGain.connect(master);

      const padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 540;
      padFilter.Q.value = 0.65;

      const padSwirlLfo = ctx.createOscillator();
      padSwirlLfo.type = 'sine';
      padSwirlLfo.frequency.value = 0.08;
      const padSwirlGain = ctx.createGain();
      padSwirlGain.gain.value = 180;
      padSwirlLfo.connect(padSwirlGain);
      padSwirlGain.connect(padFilter.frequency);

      const padMaster = ctx.createGain();
      padMaster.gain.value = 0.24;
      padFilter.connect(padMaster);
      padMaster.connect(busGain);

      // Calm orbital Cmaj9 voicing (C3, G3, B3, E4)
      const padFreqs = [130.81, 196.0, 246.94, 329.63];
      const padOscs: OscillatorNode[] = [];
      padFreqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.value = f;
        osc.detune.value = (idx - 1.5) * 3.5;

        const g = ctx.createGain();
        g.gain.value = idx === 0 ? 0.34 : 0.22;
        osc.connect(g);
        g.connect(padFilter);
        osc.start();
        padOscs.push(osc);
      });

      padSwirlLfo.start();

      return {
        gain: busGain,
        stop: () => {
          padSwirlLfo.stop();
          padOscs.forEach((o) => o.stop());
        },
      };
    })();
    this.introBus = introBus;

    // Gentle non-intrusive sparse orbital chime melody while intro or chapter story briefing is active
    this.introArpTimer = window.setInterval(() => {
      if (
        this.disposed ||
        this.muted ||
        !this.isThemeActive() ||
        !this.ctx ||
        this.ctx.state !== 'running' ||
        !this.introBus
      ) {
        return;
      }
      this.triggerIntroChime(this.ctx, this.introBus.gain);
    }, 1850);

    // Procedural thermal micro-crackles when in 'hot' mood
    this.crackleTimer = window.setInterval(() => {
      if (
        this.disposed ||
        this.muted ||
        this.currentMood !== 'hot' ||
        !this.ctx ||
        this.ctx.state !== 'running' ||
        !this.buses
      ) {
        return;
      }
      if (Math.random() > 0.65) return;
      this.triggerCrackle(this.ctx, this.buses.hot.gain);
    }, 160);
  }

  private triggerIntroChime(ctx: AudioContext, dest: AudioNode): void {
    const scales: Record<'default' | 1 | 2 | 3, number[]> = {
      default: [523.25, 659.25, 783.99, 587.33, 987.77, 783.99, 659.25, 493.88],
      1: [523.25, 587.33, 659.25, 783.99, 987.77, 783.99, 659.25, 587.33],
      2: [587.33, 659.25, 880.0, 739.99, 1174.66, 880.0, 659.25, 554.37],
      3: [440.0, 523.25, 659.25, 493.88, 783.99, 659.25, 523.25, 392.0],
    };
    const melody = this.storyChapter ? scales[this.storyChapter] : scales.default;
    const freq = melody[this.introArpStep % melody.length];
    this.introArpStep += 1;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const shimmerGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(freq * 2, now);
    shimmerGain.gain.setValueAtTime(0.08, now);

    filter.type = 'lowpass';
    filter.frequency.value = 1750;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.35);

    osc.connect(filter);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    shimmer.start(now);
    osc.stop(now + 2.45);
    shimmer.stop(now + 2.45);
  }

  private triggerCrackle(ctx: AudioContext, dest: AudioNode): void {
    if (!this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200 + Math.random() * 2800;
    filter.Q.value = 4.5;

    const env = ctx.createGain();
    const peak = 0.08 + Math.random() * 0.14;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.055 + Math.random() * 0.05);

    src.connect(filter);
    filter.connect(env);
    env.connect(dest);

    const offset = Math.random() * Math.max(0.1, this.noiseBuffer.duration - 0.15);
    src.start(now, offset, 0.12);
  }

  /** Uplifting 2-note crystal chime for completing a step or answering correctly. */
  public playStepSuccess(): void {
    if (this.disposed || this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 783.99]; // C5 -> G5
    notes.forEach((freq, i) => {
      const start = now + i * 0.085;
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, start);

      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.18, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      overtoneGain.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      overtone.start(start);
      osc.stop(start + 0.38);
      overtone.stop(start + 0.38);
    });
  }

  /** Celebratory 4-note arpeggio when all 3 chapter mission steps are completed. */
  public playMissionComplete(): void {
    if (this.disposed || this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 -> E5 -> G5 -> C6
    notes.forEach((freq, i) => {
      const start = now + i * 0.085;
      const osc = ctx.createOscillator();
      const shimmer = ctx.createOscillator();
      const gain = ctx.createGain();
      const shimmerGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(freq * 1.5, start);
      shimmerGain.gain.setValueAtTime(0.14, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (i === 3 ? 0.65 : 0.34));

      osc.connect(gain);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      shimmer.start(start);
      osc.stop(start + 0.68);
      shimmer.stop(start + 0.68);
    });
  }

  /** Gentle low descending nudge sound for wrong quiz answers. */
  public playWrong(): void {
    if (this.disposed || this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [233.08, 174.61]; // Bb3 -> F3
    notes.forEach((freq, i) => {
      const start = now + i * 0.11;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, start + 0.12);

      filter.type = 'lowpass';
      filter.frequency.value = 520;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  /** Soft holographic telemetry chirp when advancing between story briefing beats. */
  public playStoryBeat(): void {
    if (this.disposed || this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(988, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /** Cinematic atmospheric theme cue played at the start of each Chapter story briefing. */
  public playChapterIntro(chapterNum: 1 | 2 | 3): void {
    if (this.disposed || this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    // Distinct harmonic profiles per chapter:
    // Ch 1 (Earth Home): warm major-9th sunlit swell
    // Ch 2 (Too Close / Solar Surge): bright ascending energy fifth/ninth
    // Ch 3 (Red Dwarf TRAPPIST-1): mysterious deep M-dwarf minor-9th
    const chords: Record<1 | 2 | 3, { notes: number[]; wave: OscillatorType; cutoff: number }> = {
      1: { notes: [261.63, 392.0, 493.88, 587.33], wave: 'triangle', cutoff: 1800 },
      2: { notes: [293.66, 440.0, 554.37, 659.25], wave: 'triangle', cutoff: 2400 },
      3: { notes: [220.0, 329.63, 392.0, 493.88], wave: 'sine', cutoff: 1400 },
    };
    const cfg = chords[chapterNum];

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(cfg.cutoff, now + 0.55);
    filter.frequency.exponentialRampToValueAtTime(550, now + 1.65);
    filter.connect(ctx.destination);

    cfg.notes.forEach((freq, idx) => {
      const start = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const pad = ctx.createOscillator();
      const gain = ctx.createGain();
      const padGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      pad.type = cfg.wave;
      pad.frequency.setValueAtTime(freq * 0.5, start);
      padGain.gain.setValueAtTime(0.32, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.35);

      osc.connect(gain);
      pad.connect(padGain);
      padGain.connect(gain);
      gain.connect(filter);

      osc.start(start);
      pad.start(start);
      osc.stop(start + 1.4);
      pad.stop(start + 1.4);
    });
  }

  /** Soft metallic/boot tap synced to 3rd-person explorer footsteps on the deck. */
  public playFootstep(): void {
    if (this.disposed || this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(118 + Math.random() * 18, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.055);

    filter.type = 'lowpass';
    filter.frequency.value = 340;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.085);
  }

  /** Ultra-soft comms terminal keystroke blip for the intro briefing typewriter. */
  public playTypingTick(accent = false): void {
    if (this.disposed || this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const base = accent ? 1320 : 980 + Math.random() * 140;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.85, now + 0.018);

    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1.8;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.022 : 0.014, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.028);
  }

  public dispose(): void {
    this.disposed = true;
    if (this.crackleTimer !== null) {
      window.clearInterval(this.crackleTimer);
      this.crackleTimer = null;
    }
    if (this.introArpTimer !== null) {
      window.clearInterval(this.introArpTimer);
      this.introArpTimer = null;
    }
    if (this.buses) {
      this.buses.frozen.stop();
      this.buses.temperate.stop();
      this.buses.hot.stop();
      this.buses = null;
    }
    if (this.introBus) {
      this.introBus.stop();
      this.introBus = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
  }
}
