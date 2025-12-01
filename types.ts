export enum Platform {
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  INSTAGRAM = 'INSTAGRAM'
}

export enum Tone {
  PROFESSIONAL = 'PROFESSIONAL',
  WITTY = 'WITTY',
  URGENT = 'URGENT'
}

export interface GeneratedPost {
  text: string;
  imagePrompt: string;
  hashtags?: string[];
  platform: Platform;
  imageUrl?: string;
  imageLoading?: boolean;
}

export interface GenerationResult {
  [Platform.LINKEDIN]: GeneratedPost;
  [Platform.TWITTER]: GeneratedPost;
  [Platform.INSTAGRAM]: GeneratedPost;
}

export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface ImageConfig {
  aspectRatio: AspectRatio | 'AUTO';
  size: ImageSize;
}