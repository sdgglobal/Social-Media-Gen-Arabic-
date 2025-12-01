import { AspectRatio, Tone } from "./types";

export const ASPECT_RATIOS: AspectRatio[] = [
  '1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'
];

export const TONE_LABELS: Record<Tone, string> = {
  [Tone.PROFESSIONAL]: 'مهني',
  [Tone.WITTY]: 'ذكي / فكاهي',
  [Tone.URGENT]: 'عاجل',
};

export const TONE_ICONS: Record<Tone, string> = {
  [Tone.PROFESSIONAL]: '👔',
  [Tone.WITTY]: '✨',
  [Tone.URGENT]: '🔥',
};
