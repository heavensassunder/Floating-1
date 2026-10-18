export interface SlimeStatsData {
  hunger: number;
  happiness: number;
  energy: number;
  lastFed: number;
  moodIndex: number; // 0: Happy, 1: Sleepy, 2: Angry, 3: In Love, 4: Yummy, 5: Confused
}

export type SlimeMood = 'HAPPY' | 'SLEEPY' | 'ANGRY' | 'LOVE' | 'YUMMY' | 'CONFUSED' | 'DANCE';

export interface CodeFile {
  name: string;
  path: string;
  language: string;
  category: 'Kotlin' | 'Config' | 'Manifest' | 'Resource';
  description: string;
  content: string;
}

export type MockAppScreen = 'main_activity' | 'home' | 'browser' | 'gallery' | 'notes';
