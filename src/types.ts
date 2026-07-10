export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER';

export interface GameSettings {
  soundEnabled: boolean;
  bgmVolume: number;
  sfxVolume: number;
  useVirtualJoystick: boolean;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  score: number;
  potionsCollected: number;
  enemiesDefeated: number;
  skillsUsed: number;
}
