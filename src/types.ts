export interface SlimeStatsData {
  hunger: number;
  happiness: number;
  energy: number;
  lastFed: number;
  moodIndex: number; // 0: Happy, 1: Sleepy, 2: Angry/Dizzy, 3: In Love/Charging, 4: Yummy
}

export type SlimeMood = 'HAPPY' | 'SLEEPY' | 'ANGRY' | 'LOVE' | 'YUMMY';

export interface CodeFile {
  name: string;
  path: string;
  language: string;
  category: 'Kotlin' | 'Config' | 'Manifest' | 'Resource';
  description: string;
  content: string;
}

export type MockAppScreen = 'main_activity' | 'home' | 'browser' | 'gallery' | 'notes';
