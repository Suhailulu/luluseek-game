import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Player, GameStats } from '../types';
import { soundManager } from '../lib/sound';
import {
  Trophy,
  Target,
  Shield,
  Clock,
  Crown,
  Medal,
  Sparkles,
  Zap,
  Copy,
  Check,
  Users,
  Award,
  Flame,
  Footprints,
  Eye,
  Heart,
} from 'lucide-react';

export interface PlayerTrackerData {
  distanceTraveled?: number;
  timeSpentHiding?: number;
}

export interface LeaderboardProps {
  roomPlayers: Record<string, Player>;
  roomStats?: GameStats;
  currentPlayerId?: string;
  playersStatsTracker?: Record<string, PlayerTrackerData>;
  onClose?: () => void;
}

export function Leaderboard({
  roomPlayers,
  roomStats,
  currentPlayerId,
  playersStatsTracker = {},
  onClose,
}: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'seekers' | 'hiders'>('all');
  const [copied, setCopied] = useState(false);

  const playersList = Object.values(roomPlayers || {});
  const matchDuration = roomStats?.duration || 0;

  // Process Seekers Leaderboard
  const seekers = playersList
    .filter((p) => p.role === 'seeker')
    .map((p) => {
      const tags = roomStats?.seekerFoundCounts?.[p.id] ?? roomStats?.seekerFoundCounts?.[p.name] ?? p.score ?? 0;
      const tracker = playersStatsTracker[p.id] || {};
      const distM = Math.round((tracker.distanceTraveled || 0) / 24);
      return {
        ...p,
        tags,
        distM,
        isMvp: roomStats?.mvpSeeker === p.name || roomStats?.mvp === p.name,
      };
    })
    .sort((a, b) => b.tags - a.tags || b.distM - a.distM);

  // Process Hiders Leaderboard
  const hiders = playersList
    .filter((p) => p.role === 'hider')
    .map((p) => {
      const survivalTime =
        roomStats?.hiderSurvivalTimes?.[p.id] ??
        roomStats?.hiderSurvivalTimes?.[p.name] ??
        p.survivalTime ??
        (p.status === 'alive' ? matchDuration : 0);

      const tracker = playersStatsTracker[p.id] || {};
      const hideS = Math.round(tracker.timeSpentHiding || 0);
      const distM = Math.round((tracker.distanceTraveled || 0) / 24);
      const survived = p.status === 'alive' || survivalTime >= matchDuration;

      return {
        ...p,
        survivalTime,
        survived,
        hideS,
        distM,
        isMvp: roomStats?.mvp === p.name,
      };
    })
    .sort((a, b) => {
      // Survived hiders first, then by longest survival time, then hiding time
      if (a.survived !== b.survived) return a.survived ? -1 : 1;
      return b.survivalTime - a.survivalTime || b.hideS - a.hideS;
    });

  // Process Overall Match Standings
  const overallStandings = playersList
    .map((p) => {
      const isSeeker = p.role === 'seeker';
      const tags = isSeeker ? roomStats?.seekerFoundCounts?.[p.id] ?? roomStats?.seekerFoundCounts?.[p.name] ?? p.score ?? 0 : 0;
      const survivalTime = !isSeeker
        ? roomStats?.hiderSurvivalTimes?.[p.id] ?? roomStats?.hiderSurvivalTimes?.[p.name] ?? p.survivalTime ?? (p.status === 'alive' ? matchDuration : 0)
        : 0;
      const tracker = playersStatsTracker[p.id] || {};
      const hideS = Math.round(tracker.timeSpentHiding || 0);
      const distM = Math.round((tracker.distanceTraveled || 0) / 24);
      const survived = !isSeeker && (p.status === 'alive' || survivalTime >= matchDuration);

      // Score calculation for overall rank
      let rankScore = 0;
      if (isSeeker) {
        rankScore = tags * 100 + distM * 0.5;
      } else {
        rankScore = (survived ? 150 : 0) + survivalTime * 2 + hideS * 1.5;
      }

      return {
        ...p,
        tags,
        survivalTime,
        survived,
        hideS,
        distM,
        rankScore,
        isMvp: roomStats?.mvp === p.name || roomStats?.mvpSeeker === p.name,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);

  // Identify Key Highlights
  const topSeeker = seekers.length > 0 && seekers[0].tags > 0 ? seekers[0] : null;
  const topHider = hiders.length > 0 ? hiders[0] : null;

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Copy Leaderboard to Clipboard
  const handleCopyLeaderboard = () => {
    soundManager.playClick();
    let text = `🏆 LULU SEEK! - POST-MATCH LEADERBOARD 🏆\n`;
    text += `==========================================\n`;
    text += `🏆 Match Winner: ${roomStats?.winner === 'seekers' ? 'SEEKERS 🔍' : 'HIDERS 🎉'}\n`;
    text += `⏱️ Duration: ${formatTime(matchDuration)}\n\n`;

    if (topSeeker) {
      text += `🎯 TOP SEEKER: ${topSeeker.name} (${topSeeker.tags} Tags)\n`;
    }
    if (topHider) {
      text += `🛡️ TOP HIDER: ${topHider.name} (${topHider.survived ? 'SURVIVED' : `${topHider.survivalTime}s`})\n`;
    }

    text += `==========================================\n`;
    text += `📊 PLAYER STANDINGS:\n`;

    overallStandings.forEach((p, idx) => {
      const badge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
      if (p.role === 'seeker') {
        text += `${badge} ${p.name} [SEEKER] - 🔍 ${p.tags} Tags | 🏃 ${p.distM}m\n`;
      } else {
        const statusStr = p.survived ? 'SURVIVED 🎉' : `FOUND at ${p.survivalTime}s 💀`;
        text += `${badge} ${p.name} [HIDER] - ${statusStr} | 🍃 Hide: ${p.hideS}s\n`;
      }
    });

    text += `==========================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="w-full bg-slate-900/95 border-2 border-toy-yellow/50 rounded-3xl p-4 sm:p-6 shadow-2xl text-white space-y-4 relative overflow-hidden backdrop-blur-xl"
      id="post-match-leaderboard-container"
    >
      {/* Ambient background decorative glow */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-toy-yellow/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-toy-blue/15 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-2xl text-slate-950 shadow-lg shrink-0">
            <Trophy className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                Match Leaderboard
              </h3>
              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 shrink-0">
                END GAME STATS
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
              Performance rankings for all hiders and seekers in this match
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="copy-leaderboard-btn"
            onClick={handleCopyLeaderboard}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/15 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="Copy Leaderboard to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-toy-yellow" />
                <span>Share</span>
              </>
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition cursor-pointer text-xs font-bold"
              title="Close Leaderboard"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* HIGHLIGHT CARDS: TOP SEEKER & TOP HIDER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10" id="leaderboard-highlight-cards">
        {/* Top Seeker Award Card */}
        <div className="bg-gradient-to-r from-rose-500/15 to-orange-500/10 border border-rose-500/30 p-3 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-300" />
              Master Tag Hunter
            </div>
            <div className="text-sm font-black text-white truncate">
              {topSeeker ? topSeeker.name : 'No Tags Claimed'}
            </div>
            <div className="text-[10px] text-slate-300 font-mono font-bold mt-0.5">
              {topSeeker ? `🔍 ${topSeeker.tags} Successful Tags` : 'Seekers had no catches'}
            </div>
          </div>
        </div>

        {/* Top Hider Award Card */}
        <div className="bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 p-3 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-300" />
              Ultimate Survivalist
            </div>
            <div className="text-sm font-black text-white truncate">
              {topHider ? topHider.name : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-300 font-mono font-bold mt-0.5">
              {topHider
                ? topHider.survived
                  ? `🎉 Survived Full Match (${formatTime(topHider.survivalTime)})`
                  : `💀 Survived for ${topHider.survivalTime}s`
                : 'No Hiders active'}
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY TAB SELECTOR */}
      <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-white/10 relative z-10" id="leaderboard-tabs">
        <button
          type="button"
          id="tab-all-standings-btn"
          onClick={() => {
            soundManager.playClick();
            setActiveTab('all');
          }}
          className={`flex-1 py-1.5 px-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All ({overallStandings.length})</span>
        </button>

        <button
          type="button"
          id="tab-top-seekers-btn"
          onClick={() => {
            soundManager.playClick();
            setActiveTab('seekers');
          }}
          className={`flex-1 py-1.5 px-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'seekers'
              ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Seekers 🔍 ({seekers.length})</span>
        </button>

        <button
          type="button"
          id="tab-top-hiders-btn"
          onClick={() => {
            soundManager.playClick();
            setActiveTab('hiders');
          }}
          className={`flex-1 py-1.5 px-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'hiders'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Hiders 🟢 ({hiders.length})</span>
        </button>
      </div>

      {/* LEADERBOARD LIST CONTAINER */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 relative z-10" id="leaderboard-rows-container">
        {/* TAB 1: ALL STANDINGS */}
        {activeTab === 'all' && (
          <>
            {overallStandings.map((p, idx) => {
              const rankNum = idx + 1;
              const isPodium = rankNum <= 3;
              const isCurrentPlayer = p.id === currentPlayerId;

              const rankBadge =
                rankNum === 1
                  ? '🥇 1st'
                  : rankNum === 2
                  ? '🥈 2nd'
                  : rankNum === 3
                  ? '🥉 3rd'
                  : `#${rankNum}`;

              const bgClass =
                rankNum === 1
                  ? 'border-amber-400/80 bg-amber-500/10'
                  : rankNum === 2
                  ? 'border-slate-300/60 bg-slate-400/10'
                  : rankNum === 3
                  ? 'border-amber-700/60 bg-amber-800/10'
                  : 'border-white/5 bg-white/5';

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${bgClass} ${
                    isCurrentPlayer ? 'ring-2 ring-toy-yellow/70' : ''
                  }`}
                  id={`leaderboard-row-all-${p.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-xl font-mono shrink-0 shadow-sm ${
                        rankNum === 1
                          ? 'bg-amber-400 text-slate-950'
                          : rankNum === 2
                          ? 'bg-slate-300 text-slate-950'
                          : rankNum === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {rankBadge}
                    </span>

                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/40 shrink-0"
                      style={{ backgroundColor: p.color || '#38bdf8' }}
                    />

                    <div className="min-w-0">
                      <div className="text-xs font-black text-white flex items-center gap-1.5 truncate">
                        <span>{p.name}</span>
                        {isCurrentPlayer && (
                          <span className="text-[8px] bg-toy-blue/20 text-toy-blue border border-toy-blue/40 px-1.5 py-0.2 rounded-full font-black shrink-0">
                            YOU
                          </span>
                        )}
                        {p.isMvp && (
                          <span className="text-[8px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-1.5 py-0.2 rounded-full font-black flex items-center gap-0.5 shrink-0">
                            <Sparkles className="w-2.5 h-2.5" /> MVP
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium flex items-center gap-2">
                        <span className={`font-bold uppercase ${p.role === 'seeker' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {p.role === 'seeker' ? 'Seeker 🔍' : 'Hider 🟢'}
                        </span>
                        {p.distM > 0 && <span>• 🏃 {p.distM}m</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right Score Badges */}
                  <div className="text-right shrink-0 flex items-center gap-1.5">
                    {p.role === 'seeker' ? (
                      <span className="font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl px-2 py-1 text-xs font-mono">
                        🔍 {p.tags} TAGS
                      </span>
                    ) : (
                      <span
                        className={`font-black rounded-xl px-2 py-1 text-xs font-mono border ${
                          p.survived
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-white/5 text-slate-400 border-white/10'
                        }`}
                      >
                        {p.survived ? '🎉 SURVIVED' : `💀 ${p.survivalTime}s`}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </>
        )}

        {/* TAB 2: TOP SEEKERS */}
        {activeTab === 'seekers' && (
          <>
            {seekers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-white/5 rounded-2xl text-xs font-bold uppercase">
                No Seekers Played This Game
              </div>
            ) : (
              seekers.map((s, idx) => {
                const rankNum = idx + 1;
                const isCurrentPlayer = s.id === currentPlayerId;

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 bg-rose-500/10 border-rose-500/25 ${
                      isCurrentPlayer ? 'ring-2 ring-toy-yellow/70' : ''
                    }`}
                    id={`leaderboard-row-seeker-${s.id}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-black px-2 py-0.5 bg-rose-500 text-white rounded-xl font-mono shrink-0">
                        #{rankNum}
                      </span>

                      <div
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shrink-0"
                        style={{ backgroundColor: s.color || '#ef4444' }}
                      />

                      <div className="min-w-0">
                        <div className="text-xs font-black text-white flex items-center gap-1.5 truncate">
                          <span>{s.name}</span>
                          {isCurrentPlayer && (
                            <span className="text-[8px] bg-toy-blue/20 text-toy-blue border border-toy-blue/40 px-1.5 py-0.2 rounded-full font-black shrink-0">
                              YOU
                            </span>
                          )}
                          {s.isMvp && (
                            <span className="text-[8px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-1.5 py-0.2 rounded-full font-black shrink-0">
                              ⭐ TOP SEEKER
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          Distance Covered: <span className="text-slate-200 font-bold font-mono">{s.distM}m</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-rose-400 font-mono flex items-center gap-1">
                        <Target className="w-4 h-4 text-rose-500" />
                        <span>{s.tags}</span>
                        <span className="text-[9px] font-sans text-slate-400 font-bold uppercase">Tags</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </>
        )}

        {/* TAB 3: TOP HIDERS */}
        {activeTab === 'hiders' && (
          <>
            {hiders.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-white/5 rounded-2xl text-xs font-bold uppercase">
                No Hiders Played This Game
              </div>
            ) : (
              hiders.map((h, idx) => {
                const rankNum = idx + 1;
                const isCurrentPlayer = h.id === currentPlayerId;

                return (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 bg-emerald-500/10 border-emerald-500/25 ${
                      isCurrentPlayer ? 'ring-2 ring-toy-yellow/70' : ''
                    }`}
                    id={`leaderboard-row-hider-${h.id}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-black px-2 py-0.5 bg-emerald-500 text-slate-950 rounded-xl font-mono shrink-0">
                        #{rankNum}
                      </span>

                      <div
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shrink-0"
                        style={{ backgroundColor: h.color || '#10b981' }}
                      />

                      <div className="min-w-0">
                        <div className="text-xs font-black text-white flex items-center gap-1.5 truncate">
                          <span>{h.name}</span>
                          {isCurrentPlayer && (
                            <span className="text-[8px] bg-toy-blue/20 text-toy-blue border border-toy-blue/40 px-1.5 py-0.2 rounded-full font-black shrink-0">
                              YOU
                            </span>
                          )}
                          {h.survived && (
                            <span className="text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full font-black shrink-0">
                              🎉 SURVIVOR
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          Time Hidden: <span className="text-emerald-300 font-bold font-mono">{h.hideS}s</span> • Dist:{' '}
                          <span className="text-slate-200 font-bold font-mono">{h.distM}m</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-black font-mono px-2 py-1 rounded-xl border ${
                          h.survived
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-white/5 text-slate-400 border-white/10'
                        }`}
                      >
                        {h.survived ? 'SURVIVED' : `FOUND (${h.survivalTime}s)`}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
