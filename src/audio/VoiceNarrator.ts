import type { AmbientMood } from './AudioManager';
import type { StageId, StarKey } from '../types/observatory';

export interface VoiceContext {
  mood: AmbientMood;
  starKey: StarKey;
  stage: StageId;
  tempC: number;
  runaway: boolean;
}

const LINES_TEMPERATE = [
  "Surface temperatures are holding steady. Notice how Earth's thin atmosphere keeps the ocean liquid.",
  'Right now, incoming sunlight and trapped infrared warmth are in delicate balance.',
  'Take your time exploring the deck. Every instrument reveals a piece of how climates stabilize.',
  'Just enough greenhouse warmth, and just enough polar ice. This is the habitable sweet spot.',
];

const LINES_FROZEN = [
  'The polar ice shelves are spreading. Bright ice reflects starlight back to space, cooling the planet further.',
  'Watch the thermometer drop. Without enough heat trapped above, the bay begins to freeze.',
  'Snowfall is drifting across the observatory deck as planetary albedo climbs.',
];

const LINES_HOT = [
  'Look at the ocean mist rising. Extra water vapor traps even more infrared heat, amplifying the warmth.',
  'Thermal energy is climbing fast. A thick heat blanket can push an ocean world toward runaway steam.',
  'Warm embers and shimmering haze across the bay show how strongly greenhouse gases trap outgoing heat.',
];

const LINES_TRAPPIST = [
  'Orbiting a dim red dwarf changes everything. The sky glows amber, and one hemisphere faces endless day.',
  'On a tidally locked world, the twilight band between burning noon and frozen night becomes a quiet haven.',
  'TRAPPIST-1 shines cooler and redder than our Sun, so planets must orbit far closer to stay warm.',
];

const LINES_GENERAL = [
  'Look out toward the ocean horizon. Even subtle shifts in orbit or air rewrite an entire world.',
  'Try switching between walking mode and the overview camera to study Earth from space.',
  'Every planetary climate is a conversation between starlight, ice reflection, and atmospheric warmth.',
  'Good having your little space pup trotting beside you out here on the deck.',
  'Look how curious your little companion gets whenever you inspect a new instrument.',
];

/**
 * Calm, zero-dependency Web Speech narrator for occasional TERRA voice observations.
 * Automatically picks a soft natural voice, avoids repeats, and cancels cleanly on mute/dispose.
 */
export class VoiceNarrator {
  private muted = false;
  private disposed = false;
  private speaking = false;
  private lastSpokenAt = 0;
  private recentHistory: string[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private onSpeakingChange?: (speaking: boolean, text: string | null) => void;

  constructor(onSpeakingChange?: (speaking: boolean, text: string | null) => void) {
    this.onSpeakingChange = onSpeakingChange;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.resolveVoice();
      window.speechSynthesis.addEventListener?.('voiceschanged', this.handleVoicesChanged);
    }
  }

  private handleVoicesChanged = () => {
    this.resolveVoice();
  };

  private resolveVoice(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;

    const preferredNames = [
      'Google UK English Female',
      'Google US English',
      'Samantha',
      'Aria',
      'Jenny',
      'Karen',
      'Serena',
      'Victoria',
      'Daniel',
    ];

    for (const name of preferredNames) {
      const match = voices.find((v) => v.name.includes(name) && v.lang.startsWith('en'));
      if (match) {
        this.selectedVoice = match;
        return;
      }
    }
    this.selectedVoice = voices.find((v) => v.lang.startsWith('en')) ?? voices[0] ?? null;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stop();
    }
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public getLastSpokenAt(): number {
    return this.lastSpokenAt;
  }

  public speakLine(text: string): boolean {
    if (
      this.disposed ||
      this.muted ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      return false;
    }

    if (!this.selectedVoice) {
      this.resolveVoice();
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.lang = this.selectedVoice?.lang || 'en-US';
      utterance.rate = 0.89;
      utterance.pitch = 0.98;
      utterance.volume = 0.72;

      utterance.onstart = () => {
        if (this.disposed || this.muted) return;
        this.speaking = true;
        this.onSpeakingChange?.(true, text);
      };

      const finish = () => {
        if (this.speaking) {
          this.speaking = false;
          this.onSpeakingChange?.(false, null);
        }
      };
      utterance.onend = finish;
      utterance.onerror = finish;

      this.lastSpokenAt = Date.now();
      this.recentHistory.push(text);
      if (this.recentHistory.length > 5) {
        this.recentHistory.shift();
      }

      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }

  public speakContextual(ctx: VoiceContext, forceGeneral = false): boolean {
    if (this.muted || this.disposed) return false;
    let pool: string[];

    if (forceGeneral) {
      pool = LINES_GENERAL;
    } else if (ctx.starKey === 'trappist1' || ctx.stage === 'CH3') {
      pool = Math.random() < 0.7 ? LINES_TRAPPIST : LINES_GENERAL;
    } else if (ctx.mood === 'frozen') {
      pool = LINES_FROZEN;
    } else if (ctx.mood === 'hot' || ctx.runaway) {
      pool = LINES_HOT;
    } else {
      pool = Math.random() < 0.65 ? LINES_TEMPERATE : LINES_GENERAL;
    }

    const candidates = pool.filter((line) => !this.recentHistory.includes(line));
    const list = candidates.length > 0 ? candidates : pool;
    const chosen = list[Math.floor(Math.random() * list.length)];
    return this.speakLine(chosen);
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore speechSynthesis cancel errors in restricted environments
      }
    }
    if (this.speaking) {
      this.speaking = false;
      this.onSpeakingChange?.(false, null);
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.removeEventListener?.('voiceschanged', this.handleVoicesChanged);
    }
  }
}
