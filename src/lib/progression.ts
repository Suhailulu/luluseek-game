export interface UserProfile {
  username: string;
  level: number;
  xp: number;
  coins: number;
  matchesPlayed: number;
  wins: number;
  survivalTime: number; // in seconds
  totalCatches: number;
  distanceMoved: number; // in meters/units
}

const LOCAL_STORAGE_KEY = 'hide_seek_user_profile';
const XP_PER_LEVEL = 150;

export const DEFAULT_PROFILE: UserProfile = {
  username: 'Player',
  level: 1,
  xp: 0,
  coins: 50, // starter coins
  matchesPlayed: 0,
  wins: 0,
  survivalTime: 0,
  totalCatches: 0,
  distanceMoved: 0,
};

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const xp = Number(parsed.xp) || 0;
      const level = Math.floor(xp / XP_PER_LEVEL) + 1;
      return {
        username: parsed.username || 'Player',
        level,
        xp,
        coins: Number(parsed.coins) || 0,
        matchesPlayed: Number(parsed.matchesPlayed) || 0,
        wins: Number(parsed.wins) || 0,
        survivalTime: Number(parsed.survivalTime) || 0,
        totalCatches: Number(parsed.totalCatches) || 0,
        distanceMoved: Number(parsed.distanceMoved) || 0,
      };
    }
  } catch (e) {
    console.warn('Failed to parse user profile', e);
  }
  return { ...DEFAULT_PROFILE };
}

export function saveUserProfile(profile: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const updatedXp = profile.xp !== undefined ? profile.xp : current.xp;
  const updatedLevel = Math.floor(updatedXp / XP_PER_LEVEL) + 1;

  const updated: UserProfile = {
    ...current,
    ...profile,
    xp: updatedXp,
    level: updatedLevel,
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save profile', e);
  }
  return updated;
}

export interface MatchRewardCalculation {
  coinsEarned: number;
  xpEarned: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
  oldXp: number;
  newXp: number;
  xpToNextLevel: number;
  currentLevelXp: number;
}

export function recordMatchEnd(data: {
  isWin: boolean;
  isSeeker: boolean;
  survivalTime: number; // in seconds
  catches: number;
  distanceMoved: number; // in meters/units
}): MatchRewardCalculation {
  const profile = getUserProfile();

  // Calculate rewards
  const baseCoins = 20;
  const baseXp = 50;

  const winCoins = data.isWin ? 35 : 0;
  const winXp = data.isWin ? 75 : 0;

  const survivalCoins = Math.floor(data.survivalTime / 5);
  const survivalXp = Math.floor(data.survivalTime / 5) * 2;

  const catchCoins = data.catches * 15;
  const catchXp = data.catches * 30;

  const coinsEarned = baseCoins + winCoins + survivalCoins + catchCoins;
  const xpEarned = baseXp + winXp + survivalXp + catchXp;

  const oldXp = profile.xp;
  const oldLevel = profile.level;

  const newXp = oldXp + xpEarned;
  const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
  const leveledUp = newLevel > oldLevel;

  const updatedProfile: UserProfile = {
    ...profile,
    coins: profile.coins + coinsEarned,
    xp: newXp,
    level: newLevel,
    matchesPlayed: profile.matchesPlayed + 1,
    wins: profile.wins + (data.isWin ? 1 : 0),
    survivalTime: profile.survivalTime + Math.floor(data.survivalTime),
    totalCatches: profile.totalCatches + data.catches,
    distanceMoved: profile.distanceMoved + Math.floor(data.distanceMoved),
  };

  saveUserProfile(updatedProfile);

  return {
    coinsEarned,
    xpEarned,
    oldLevel,
    newLevel,
    leveledUp,
    oldXp,
    newXp,
    xpToNextLevel: XP_PER_LEVEL,
    currentLevelXp: newXp % XP_PER_LEVEL,
  };
}

export function getXpForNextLevel(xp: number): { current: number; total: number; percent: number } {
  const current = xp % XP_PER_LEVEL;
  const percent = Math.min(100, Math.floor((current / XP_PER_LEVEL) * 100));
  return { current, total: XP_PER_LEVEL, percent };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  }
  return `${mins}m ${secs}s`;
}
