export type CharacterClass = 'scout' | 'ninja' | 'tank' | 'trickster' | 'explorer';
export type PlayerRole = 'hider' | 'seeker' | 'spectator';
export type PlayerStatus = 'alive' | 'found' | 'disconnected';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  x: number;
  y: number;
  status: PlayerStatus;
  ready: boolean;
  isHost: boolean;
  color: string;
  accessory?: string;
  hair?: string;
  outfit?: string;
  glasses?: string;
  characterClass?: CharacterClass;
  rankScore?: number;
  level?: number;
  emote?: { symbol: string; until: number };
  score: number;
  lastActive: number;
  speed: number;
  angle?: number;
  survivalTime?: number;
}

export interface RoomSettings {
  maxPlayers: number;
  numSeekers: number;
  hideTime: number; // in seconds
  matchDuration: number; // in minutes
  mapId?: string; // 'meadow' | 'graveyard' | 'toybox'
  isPrivate?: boolean;
}

export type GameState = 'lobby' | 'hiding' | 'playing' | 'ended';

export interface GameStats {
  winner: 'hiders' | 'seekers';
  duration: number; // seconds played
  totalPlayers: number;
  foundCount: number;
  escapedCount: number;
  mvpSeeker?: string;
  seekerFoundCounts: Record<string, number>;
  mvp?: string;
  hiderSurvivalTimes?: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: string;
  text: string;
  timestamp: number;
}

export interface Room {
  code: string;
  players: Record<string, Player>;
  gameState: GameState;
  hideCountdown: number;
  matchTimer: number;
  settings: RoomSettings;
  stats?: GameStats;
  activeMapId?: string;
  chatHistory?: ChatMessage[];
  weather?: WeatherEvent;
}

// Special 1-Person Hiding Spot with 60s cooldown
export interface SpecialHidingSpot {
  id: string;
  type: 'hollow_tree' | 'barrel' | 'haystack' | 'cave' | 'cellar' | 'crate' | 'locker';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  occupiedBy?: string | null;
  cooldownUntil?: number; // timestamp when spot becomes available again (60s after leaving)
}

// Map configuration
export interface Obstacle {
  id: string;
  type: 'wall' | 'bush' | 'tree' | 'rock' | 'crate' | 'barrel' | 'log' | 'fence' | 'haystack' | 'cart' | 'bridge' | 'tower' | 'water' | 'flower';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameMap {
  width: number;
  height: number;
  obstacles: Obstacle[];
  specialHidingSpots?: SpecialHidingSpot[];
}

export interface PowerUp {
  id: string;
  type: 'speed' | 'silent' | 'jammer' | 'shield' | 'extra_time' | 'dash';
  x: number;
  y: number;
  spawnTime: number;
}

export type WeatherEvent = 'normal' | 'fog' | 'rain' | 'night' | 'wind';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  rewardXp: number;
}

// WebSocket Event Structure
export interface WSMessage<T = any> {
  type: string;
  payload: T;
  senderId?: string;
}
