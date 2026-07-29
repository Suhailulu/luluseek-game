import { Player, GameStats } from '../types';
import { getUserProfile } from './progression';

export interface PersistentPlayerTagStat {
  id: string;
  name: string;
  color?: string;
  totalCatches: number; // Lifetime successful tags
  bestMatchCatches: number; // Highest tags in a single match
  matchesPlayedAsSeeker: number;
  lastMatchCatches?: number;
  lastMatchDate?: string;
  isCurrentPlayer?: boolean;
}

export interface MatchTagSummaryEntry {
  playerId: string;
  playerName: string;
  playerColor?: string;
  tagsThisMatch: number;
  lifetimeTags: number;
  bestMatchCatches: number;
  isMvp?: boolean;
  isCurrentPlayer?: boolean;
  role: 'seeker' | 'hider' | 'spectator';
}

const STORAGE_KEY = 'hide_seek_persistent_tag_stats';

// Initial default seed entries to ensure leaderboard is vibrant and competitive
const DEFAULT_SEED_PLAYERS: Omit<PersistentPlayerTagStat, 'isCurrentPlayer'>[] = [
  { id: 'p_stealth', name: 'StealthMaster', color: '#ec4899', totalCatches: 210, bestMatchCatches: 8, matchesPlayedAsSeeker: 42, lastMatchCatches: 5, lastMatchDate: 'Today' },
  { id: 'p_seekerpro', name: 'SeekerPro', color: '#ef4444', totalCatches: 195, bestMatchCatches: 9, matchesPlayedAsSeeker: 38, lastMatchCatches: 6, lastMatchDate: 'Today' },
  { id: 'p_bushlord', name: 'BushLord99', color: '#10b981', totalCatches: 165, bestMatchCatches: 7, matchesPlayedAsSeeker: 35, lastMatchCatches: 4, lastMatchDate: 'Yesterday' },
  { id: 'p_shadow', name: 'ShadowWalker', color: '#8b5cf6', totalCatches: 120, bestMatchCatches: 6, matchesPlayedAsSeeker: 28, lastMatchCatches: 3, lastMatchDate: 'Yesterday' },
  { id: 'p_meadow', name: 'MeadowNinja', color: '#3b82f6', totalCatches: 95, bestMatchCatches: 5, matchesPlayedAsSeeker: 22, lastMatchCatches: 2, lastMatchDate: '2 days ago' },
  { id: 'p_speed', name: 'SpeedDemon', color: '#f59e0b', totalCatches: 70, bestMatchCatches: 4, matchesPlayedAsSeeker: 18, lastMatchCatches: 2, lastMatchDate: '3 days ago' },
];

/**
 * Get all persistent tag statistics from local storage.
 * Automatically synchronizes current local user profile catches.
 */
export function getPersistentTagStats(): PersistentPlayerTagStat[] {
  let statsMap: Record<string, PersistentPlayerTagStat> = {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item && item.id) {
            statsMap[item.id] = item;
          }
        });
      }
    }
  } catch (e) {
    console.warn('Failed to parse persistent tag stats', e);
  }

  // Seed defaults if empty
  if (Object.keys(statsMap).length === 0) {
    DEFAULT_SEED_PLAYERS.forEach((seed) => {
      statsMap[seed.id] = { ...seed };
    });
  }

  // Sync current user's local profile tags
  const userProfile = getUserProfile();
  const userIdKey = 'user_self_' + (userProfile.username || 'Player');
  
  if (!statsMap[userIdKey]) {
    statsMap[userIdKey] = {
      id: userIdKey,
      name: userProfile.username || 'You',
      color: '#38bdf8',
      totalCatches: userProfile.totalCatches || 0,
      bestMatchCatches: Math.min(userProfile.totalCatches || 0, 5),
      matchesPlayedAsSeeker: Math.ceil((userProfile.matchesPlayed || 0) / 2),
      lastMatchCatches: 0,
      lastMatchDate: 'Recent',
      isCurrentPlayer: true,
    };
  } else {
    // Keep user's profile total catches updated if profile catches are higher
    if (userProfile.totalCatches > statsMap[userIdKey].totalCatches) {
      statsMap[userIdKey].totalCatches = userProfile.totalCatches;
    }
    statsMap[userIdKey].name = userProfile.username || statsMap[userIdKey].name;
    statsMap[userIdKey].isCurrentPlayer = true;
  }

  // Convert map to array and sort descending by totalCatches
  const list = Object.values(statsMap).sort((a, b) => b.totalCatches - a.totalCatches);
  
  // Persist updated list
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}

  return list;
}

/**
 * Record tag statistics after a game finishes.
 * Updates lifetime tags, single match records, and seeker match counts.
 */
export function recordMatchTagResults(
  roomPlayers: Record<string, Player>,
  roomStats?: GameStats,
  currentPlayerId?: string
): MatchTagSummaryEntry[] {
  const currentStats = getPersistentTagStats();
  const statsMap: Record<string, PersistentPlayerTagStat> = {};

  currentStats.forEach((st) => {
    statsMap[st.id] = { ...st };
  });

  const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const userProfile = getUserProfile();
  const matchEntries: MatchTagSummaryEntry[] = [];

  // Process all players in the completed match
  Object.values(roomPlayers).forEach((player) => {
    const isSelf = player.id === currentPlayerId;
    const key = isSelf ? 'user_self_' + (userProfile.username || 'Player') : 'p_room_' + player.name.replace(/\s+/g, '_').toLowerCase();
    
    // Determine tags scored in this match
    let tagsScored = player.score || 0;
    if (roomStats?.seekerFoundCounts) {
      tagsScored = roomStats.seekerFoundCounts[player.id] ?? roomStats.seekerFoundCounts[player.name] ?? tagsScored;
    }

    const isSeeker = player.role === 'seeker';

    // Existing entry or create new
    const existing = statsMap[key] || {
      id: key,
      name: isSelf ? (userProfile.username || player.name) : player.name,
      color: player.color || '#3b82f6',
      totalCatches: 0,
      bestMatchCatches: 0,
      matchesPlayedAsSeeker: 0,
      lastMatchCatches: 0,
      lastMatchDate: nowStr,
      isCurrentPlayer: isSelf,
    };

    if (isSeeker) {
      existing.totalCatches += tagsScored;
      existing.bestMatchCatches = Math.max(existing.bestMatchCatches, tagsScored);
      existing.matchesPlayedAsSeeker += 1;
      existing.lastMatchCatches = tagsScored;
      existing.lastMatchDate = nowStr;
      existing.color = player.color || existing.color;
      existing.name = isSelf ? (userProfile.username || player.name) : player.name;
    }

    statsMap[key] = existing;

    matchEntries.push({
      playerId: player.id,
      playerName: isSelf ? (userProfile.username || player.name) : player.name,
      playerColor: player.color,
      tagsThisMatch: tagsScored,
      lifetimeTags: existing.totalCatches,
      bestMatchCatches: existing.bestMatchCatches,
      isMvp: roomStats?.mvpSeeker === player.name || roomStats?.mvp === player.name,
      isCurrentPlayer: isSelf,
      role: player.role,
    });
  });

  // Save updated map back to local storage
  try {
    const updatedList = Object.values(statsMap).sort((a, b) => b.totalCatches - a.totalCatches);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  } catch (e) {
    console.warn('Failed to update persistent tag results', e);
  }

  // Sort match entries by tagsThisMatch descending
  return matchEntries.sort((a, b) => b.tagsThisMatch - a.tagsThisMatch);
}

/**
 * Extract top taggers for the current match.
 */
export function getMatchTopTaggers(
  roomPlayers: Record<string, Player>,
  roomStats?: GameStats,
  currentPlayerId?: string
): MatchTagSummaryEntry[] {
  const userProfile = getUserProfile();
  const persistentList = getPersistentTagStats();
  const persistentMap = new Map(persistentList.map((p) => [p.name, p]));

  const entries: MatchTagSummaryEntry[] = Object.values(roomPlayers)
    .filter((p) => p.role === 'seeker' || (p.score && p.score > 0))
    .map((player) => {
      const isSelf = player.id === currentPlayerId;
      const name = isSelf ? (userProfile.username || player.name) : player.name;
      let tagsScored = player.score || 0;
      if (roomStats?.seekerFoundCounts) {
        tagsScored = roomStats.seekerFoundCounts[player.id] ?? roomStats.seekerFoundCounts[player.name] ?? tagsScored;
      }

      const persistent = persistentMap.get(name);
      const lifetime = (persistent?.totalCatches || 0) + (persistent ? 0 : tagsScored);

      return {
        playerId: player.id,
        playerName: name,
        playerColor: player.color,
        tagsThisMatch: tagsScored,
        lifetimeTags: lifetime,
        bestMatchCatches: Math.max(persistent?.bestMatchCatches || 0, tagsScored),
        isMvp: roomStats?.mvpSeeker === name || roomStats?.mvp === name,
        isCurrentPlayer: isSelf,
        role: player.role,
      };
    });

  return entries.sort((a, b) => b.tagsThisMatch - a.tagsThisMatch);
}

/**
 * Reset persistent tag statistics to default seed values.
 */
export function resetPersistentTagStats(): PersistentPlayerTagStat[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  return getPersistentTagStats();
}
