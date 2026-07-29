export interface Friend {
  id: string;
  username: string;
  level: number;
  status: 'online' | 'offline' | 'in-game';
  roomCode?: string;
  avatarColor?: string;
}

export interface MatchHistoryEntry {
  id: string;
  date: string;
  mapName: string;
  role: 'seeker' | 'hider';
  result: 'win' | 'loss';
  survivalTime: number; // in seconds
  catches: number;
  coinsEarned: number;
  xpEarned: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  wins: number;
  survivalTime: number;
  catches: number;
  matchesPlayed: number;
  isCurrentPlayer?: boolean;
}

export interface GameSettings {
  musicVolume: number; // 0 to 100
  sfxVolume: number; // 0 to 100
  cameraSensitivity: number; // 1 to 10
  joystickSize: 'small' | 'medium' | 'large';
  joystickPosition: 'left' | 'right';
  graphicsQuality: 'low' | 'medium' | 'high';
  language: string;
  vibration: boolean;
  uiScale: 'normal' | 'large';
  colorblindMode: boolean;
  soundToggle: boolean;
}

export interface FeedbackReport {
  id: string;
  type: 'bug' | 'feedback';
  category: string;
  message: string;
  timestamp: string;
}

export interface AnalyticsSummary {
  totalMatchesStarted: number;
  totalMatchesCompleted: number;
  favoriteMap: string;
  disconnectCount: number;
}

const SETTINGS_KEY = 'hide_seek_game_settings';
const FRIENDS_KEY = 'hide_seek_friends_list';
const MATCH_HISTORY_KEY = 'hide_seek_match_history';
const DAILY_REWARD_KEY = 'hide_seek_daily_reward';
const TUTORIAL_KEY = 'hide_seek_tutorial_completed';
const FEEDBACK_KEY = 'hide_seek_feedback_reports';
const ANALYTICS_KEY = 'hide_seek_analytics';

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 80,
  sfxVolume: 90,
  cameraSensitivity: 5,
  joystickSize: 'medium',
  joystickPosition: 'left',
  graphicsQuality: 'high',
  language: 'English',
  vibration: true,
  uiScale: 'normal',
  colorblindMode: false,
  soundToggle: true,
};

// --- SETTINGS MANAGEMENT ---
export function getGameSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load settings', e);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveGameSettings(settings: Partial<GameSettings>): GameSettings {
  const current = getGameSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save settings', e);
  }
  return updated;
}

// --- FRIENDS MANAGEMENT ---
export const DEFAULT_FRIENDS: Friend[] = [
  { id: 'f1', username: 'ShadowNinja', level: 14, status: 'online', roomCode: 'R7X9', avatarColor: '#3b82f6' },
  { id: 'f2', username: 'BushCamper99', level: 9, status: 'in-game', avatarColor: '#10b981' },
  { id: 'f3', username: 'SeekerKing', level: 22, status: 'online', roomCode: 'A2B4', avatarColor: '#ef4444' },
  { id: 'f4', username: 'GhostRunner', level: 5, status: 'offline', avatarColor: '#8b5cf6' },
];

export function getFriendsList(): Friend[] {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (raw) {
      return JSON.parse(raw);
    } else {
      localStorage.setItem(FRIENDS_KEY, JSON.stringify(DEFAULT_FRIENDS));
      return DEFAULT_FRIENDS;
    }
  } catch (e) {
    return DEFAULT_FRIENDS;
  }
}

export function addFriend(username: string): Friend {
  const friends = getFriendsList();
  const newFriend: Friend = {
    id: 'f_' + Date.now(),
    username: username.trim() || 'Player_' + Math.floor(Math.random() * 900 + 100),
    level: Math.floor(Math.random() * 10) + 1,
    status: 'online',
    avatarColor: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)],
  };
  const updated = [...friends, newFriend];
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(updated));
  return newFriend;
}

export function removeFriend(id: string): void {
  const friends = getFriendsList().filter((f) => f.id !== id);
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}

// --- MATCH HISTORY ---
export function getMatchHistory(): MatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(MATCH_HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load match history', e);
  }
  return [];
}

export function addMatchHistoryEntry(entry: Omit<MatchHistoryEntry, 'id' | 'date'>): MatchHistoryEntry {
  const history = getMatchHistory();
  const newEntry: MatchHistoryEntry = {
    ...entry,
    id: 'mh_' + Date.now(),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };
  const updated = [newEntry, ...history].slice(0, 30); // Keep last 30 matches
  localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(updated));
  return newEntry;
}

// --- LEADERBOARDS ---
export const MOCK_TOP_PLAYERS: LeaderboardEntry[] = [
  { rank: 1, username: 'StealthMaster', level: 45, wins: 142, survivalTime: 18400, catches: 210, matchesPlayed: 180 },
  { rank: 2, username: 'BushLord99', level: 38, wins: 115, survivalTime: 15200, catches: 165, matchesPlayed: 150 },
  { rank: 3, username: 'SeekerPro', level: 35, wins: 98, survivalTime: 12100, catches: 195, matchesPlayed: 135 },
  { rank: 4, username: 'ShadowWalker', level: 30, wins: 84, survivalTime: 10500, catches: 120, matchesPlayed: 110 },
  { rank: 5, username: 'MeadowNinja', level: 27, wins: 72, survivalTime: 9200, catches: 95, matchesPlayed: 95 },
  { rank: 6, username: 'GhostInTree', level: 24, wins: 65, survivalTime: 8400, catches: 82, matchesPlayed: 85 },
  { rank: 7, username: 'SpeedDemon', level: 20, wins: 50, survivalTime: 6800, catches: 70, matchesPlayed: 75 },
];

export function getLeaderboards(category: 'wins' | 'level' | 'survival' | 'catches', playerProfile: any): LeaderboardEntry[] {
  const currentEntry: LeaderboardEntry = {
    rank: 0,
    username: playerProfile.username || 'You',
    level: playerProfile.level || 1,
    wins: playerProfile.wins || 0,
    survivalTime: playerProfile.survivalTime || 0,
    catches: playerProfile.totalCatches || 0,
    matchesPlayed: playerProfile.matchesPlayed || 0,
    isCurrentPlayer: true,
  };

  const list = [...MOCK_TOP_PLAYERS, currentEntry];

  // Sort based on category
  if (category === 'wins') {
    list.sort((a, b) => b.wins - a.wins);
  } else if (category === 'level') {
    list.sort((a, b) => b.level - a.level);
  } else if (category === 'survival') {
    list.sort((a, b) => b.survivalTime - a.survivalTime);
  } else if (category === 'catches') {
    list.sort((a, b) => b.catches - a.catches);
  }

  // Re-assign rank indices
  return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
}

// --- DAILY REWARDS ---
export function checkDailyReward(): { canClaim: boolean; rewardCoins: number } {
  try {
    const lastClaim = localStorage.getItem(DAILY_REWARD_KEY);
    const today = new Date().toDateString();
    if (lastClaim !== today) {
      return { canClaim: true, rewardCoins: 100 };
    }
  } catch (e) {
    // ignore
  }
  return { canClaim: false, rewardCoins: 0 };
}

export function claimDailyReward(): number {
  const today = new Date().toDateString();
  localStorage.setItem(DAILY_REWARD_KEY, today);
  return 100; // 100 coins reward
}

// --- TUTORIAL MANAGEMENT ---
export function isTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

export function setTutorialCompleted(completed: boolean): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, completed ? 'true' : 'false');
  } catch (e) {
    // ignore
  }
}

// --- HELP & FEEDBACK / BUG REPORTS ---
export function submitFeedbackReport(type: 'bug' | 'feedback', category: string, message: string): FeedbackReport {
  const report: FeedbackReport = {
    id: 'rep_' + Date.now(),
    type,
    category,
    message,
    timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };

  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    const existing: FeedbackReport[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify([report, ...existing]));
  } catch (e) {
    console.warn('Failed to save feedback report', e);
  }

  return report;
}

// --- ANONYMOUS ANALYTICS ---
export function getAnalyticsSummary(): AnalyticsSummary {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return {
    totalMatchesStarted: 0,
    totalMatchesCompleted: 0,
    favoriteMap: 'Meadow',
    disconnectCount: 0,
  };
}

export function trackAnalyticsEvent(event: 'match_start' | 'match_end' | 'disconnect'): void {
  const summary = getAnalyticsSummary();
  if (event === 'match_start') {
    summary.totalMatchesStarted += 1;
  } else if (event === 'match_end') {
    summary.totalMatchesCompleted += 1;
  } else if (event === 'disconnect') {
    summary.disconnectCount += 1;
  }

  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(summary));
  } catch (e) {
    // ignore
  }
}

