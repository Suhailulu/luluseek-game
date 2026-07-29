import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, GameStats } from '../types';
import { soundManager } from '../lib/sound';
import {
  getPersistentTagStats,
  recordMatchTagResults,
  getMatchTopTaggers,
  resetPersistentTagStats,
  PersistentPlayerTagStat,
  MatchTagSummaryEntry,
} from '../lib/tagStatsPersistence';
import {
  Trophy,
  Target,
  Zap,
  Award,
  Crown,
  Flame,
  RotateCcw,
  Copy,
  Check,
  Users,
  BarChart3,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface TopTaggersSummaryProps {
  roomPlayers?: Record<string, Player>;
  roomStats?: GameStats;
  currentPlayerId?: string;
  isGameOverScreen?: boolean;
  onClose?: () => void;
}

export function TopTaggersSummary({
  roomPlayers,
  roomStats,
  currentPlayerId,
  isGameOverScreen = true,
  onClose,
}: TopTaggersSummaryProps) {
  const [activeTab, setActiveTab] = useState<'match' | 'alltime'>('match');
  const [matchTaggers, setMatchTaggers] = useState<MatchTagSummaryEntry[]>([]);
  const [allTimeStats, setAllTimeStats] = useState<PersistentPlayerTagStat[]>([]);
  const [copied, setCopied] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Initialize and record match statistics
  useEffect(() => {
    if (roomPlayers) {
      const recorded = recordMatchTagResults(roomPlayers, roomStats, currentPlayerId);
      setMatchTaggers(recorded);
    } else {
      setActiveTab('alltime');
    }
    setAllTimeStats(getPersistentTagStats());
  }, [roomPlayers, roomStats, currentPlayerId]);

  // Copy tag statistics summary to clipboard
  const handleCopySummary = () => {
    soundManager.playClick();
    let text = `🎯 LULU SEEK! - TOP TAGGERS SUMMARY 🎯\n`;
    text += `==========================================\n`;

    if (matchTaggers.length > 0) {
      text += `🏆 THIS MATCH TOP TAG HUNTERS:\n`;
      matchTaggers.forEach((m, idx) => {
        text += ` #${idx + 1} ${m.playerName}: ${m.tagsThisMatch} Tags (${m.lifetimeTags} Lifetime)\n`;
      });
      text += `------------------------------------------\n`;
    }

    text += `👑 ALL-TIME PERSISTENT TAG HALL OF FAME:\n`;
    allTimeStats.slice(0, 5).forEach((p, idx) => {
      text += ` #${idx + 1} ${p.name}: ${p.totalCatches} Total Tags (Best Match: ${p.bestMatchCatches})\n`;
    });
    text += `==========================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Reset persistent tag stats
  const handleResetStats = () => {
    soundManager.playClick();
    const res = resetPersistentTagStats();
    setAllTimeStats(res);
    if (roomPlayers) {
      setMatchTaggers(getMatchTopTaggers(roomPlayers, roomStats, currentPlayerId));
    }
    setShowResetConfirm(false);
  };

  // Find overall match top tagger
  const topMatchTagger = matchTaggers.length > 0 ? matchTaggers[0] : null;
  const totalMatchTags = matchTaggers.reduce((acc, curr) => acc + curr.tagsThisMatch, 0);

  return (
    <div
      className="w-full bg-slate-900/95 border-2 border-toy-orange/60 rounded-3xl p-4 sm:p-6 shadow-2xl text-white space-y-4 relative overflow-hidden backdrop-blur-xl"
      id="top-taggers-summary-container"
    >
      {/* Decorative ambient background glows */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-toy-orange/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-toy-yellow/20 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-toy-orange to-amber-500 rounded-2xl text-slate-950 shadow-lg shrink-0">
            <Target className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Tag Champions Summary
              </h3>
              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-toy-orange/20 border border-toy-orange/40 text-toy-orange shrink-0">
                PERSISTENT STATS
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
              Rankings based on total successful tag catches across matches
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="copy-tag-summary-btn"
            onClick={handleCopySummary}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/15 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="Copy tag stats summary to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-toy-yellow" />
                <span>Share Stats</span>
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
              title="Close Summary"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* QUICK HIGHLIGHT CARDS (Match Totals & MVP) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 relative z-10" id="tag-stats-metrics-cards">
        <div className="bg-slate-950/70 border border-white/10 p-2.5 rounded-2xl flex items-center gap-2.5">
          <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Match Tags</div>
            <div className="text-base font-black text-white font-mono">{totalMatchTags}</div>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-white/10 p-2.5 rounded-2xl flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
            <Crown className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Top Seeker</div>
            <div className="text-xs font-black text-amber-300 truncate font-mono">
              {topMatchTagger && topMatchTagger.tagsThisMatch > 0
                ? `${topMatchTagger.playerName} (${topMatchTagger.tagsThisMatch})`
                : 'None'}
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-950/70 border border-white/10 p-2.5 rounded-2xl flex items-center gap-2.5">
          <div className="p-2 bg-toy-blue/20 text-toy-blue rounded-xl">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hall of Fame #1</div>
            <div className="text-xs font-black text-toy-blue truncate font-mono">
              {allTimeStats.length > 0 ? `${allTimeStats[0].name} (${allTimeStats[0].totalCatches})` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION SWITCHER */}
      <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-white/10 relative z-10" id="tag-stats-tabs">
        <button
          type="button"
          id="tab-this-match-btn"
          onClick={() => {
            soundManager.playClick();
            setActiveTab('match');
          }}
          className={`flex-1 py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'match'
              ? 'bg-gradient-to-r from-toy-orange to-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>This Game ({matchTaggers.length})</span>
        </button>

        <button
          type="button"
          id="tab-all-time-btn"
          onClick={() => {
            soundManager.playClick();
            setActiveTab('alltime');
          }}
          className={`flex-1 py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'alltime'
              ? 'bg-gradient-to-r from-toy-blue to-teal-400 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>All-Time Hall of Fame</span>
        </button>
      </div>

      {/* TAB 1: THIS MATCH TOP TAGGERS */}
      {activeTab === 'match' && (
        <div className="space-y-2 relative z-10" id="this-match-taggers-panel">
          {matchTaggers.length === 0 ? (
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-6 text-center text-slate-400 space-y-2">
              <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs font-bold uppercase tracking-wider">No Seekers Active This Game</p>
              <p className="text-[10px] text-slate-500">
                Check the All-Time Hall of Fame tab to see persistent top taggers!
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {matchTaggers.map((entry, idx) => {
                const rankNum = idx + 1;
                const isPodium = rankNum <= 3;
                const podiumColor =
                  rankNum === 1
                    ? 'border-amber-400/80 bg-amber-500/10'
                    : rankNum === 2
                    ? 'border-slate-300/60 bg-slate-400/10'
                    : rankNum === 3
                    ? 'border-amber-700/60 bg-amber-800/10'
                    : 'border-white/5 bg-white/5';

                const rankBadge =
                  rankNum === 1 ? '🥇 1st' : rankNum === 2 ? '🥈 2nd' : rankNum === 3 ? '🥉 3rd' : `#${rankNum}`;

                return (
                  <motion.div
                    key={entry.playerId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${podiumColor} ${
                      entry.isCurrentPlayer ? 'ring-2 ring-toy-yellow/60' : ''
                    }`}
                    id={`match-tagger-row-${entry.playerId}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Position */}
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-xl font-mono shrink-0 shadow-sm ${
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

                      {/* Player Color Dot & Name */}
                      <div
                        className="w-4 h-4 rounded-full border border-black/40 shrink-0"
                        style={{ backgroundColor: entry.playerColor || '#38bdf8' }}
                      />

                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 truncate">
                          <span>{entry.playerName}</span>
                          {entry.isCurrentPlayer && (
                            <span className="text-[8px] bg-toy-blue/20 text-toy-blue border border-toy-blue/40 px-1.5 py-0.2 rounded-full font-black">
                              YOU
                            </span>
                          )}
                          {entry.isMvp && (
                            <span className="text-[8px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-1.5 py-0.2 rounded-full font-black flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> MVP
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          Role: <span className="text-slate-300 font-bold uppercase">{entry.role}</span> • Lifetime Tags:{' '}
                          <span className="text-emerald-400 font-mono font-bold">{entry.lifetimeTags}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tag Count Badge */}
                    <div className="text-right shrink-0">
                      <div className="text-sm sm:text-base font-black text-rose-400 font-mono flex items-center gap-1">
                        <Target className="w-4 h-4 text-rose-500" />
                        <span>{entry.tagsThisMatch}</span>
                        <span className="text-[9px] font-sans font-bold text-slate-400 uppercase">Tags</span>
                      </div>
                      <div className="text-[8px] text-slate-400 font-mono">Best: {entry.bestMatchCatches} Max</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL-TIME PERSISTENT HALL OF FAME */}
      {activeTab === 'alltime' && (
        <div className="space-y-2 relative z-10" id="all-time-taggers-panel">
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {allTimeStats.map((st, idx) => {
              const rankNum = idx + 1;
              const isTop3 = rankNum <= 3;

              return (
                <div
                  key={st.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    st.isCurrentPlayer
                      ? 'bg-toy-blue/15 border-toy-blue/50 ring-1 ring-toy-blue/40'
                      : isTop3
                      ? 'bg-slate-950/80 border-white/10'
                      : 'bg-white/5 border-white/5'
                  }`}
                  id={`alltime-tagger-row-${st.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-xs font-black w-7 h-7 rounded-xl flex items-center justify-center font-mono shrink-0 ${
                        rankNum === 1
                          ? 'bg-amber-400 text-slate-950 font-extrabold'
                          : rankNum === 2
                          ? 'bg-slate-300 text-slate-950 font-extrabold'
                          : rankNum === 3
                          ? 'bg-amber-700 text-white font-extrabold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rankNum === 1 ? '👑' : `#${rankNum}`}
                    </span>

                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/40 shrink-0"
                      style={{ backgroundColor: st.color || '#3b82f6' }}
                    />

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 truncate">
                        <span>{st.name}</span>
                        {st.isCurrentPlayer && (
                          <span className="text-[8px] bg-toy-blue/20 text-toy-blue border border-toy-blue/40 px-1.5 py-0.2 rounded-full font-black">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium">
                        Seeker Matches: <span className="text-slate-200 font-bold font-mono">{st.matchesPlayedAsSeeker}</span>{' '}
                        • Single Best: <span className="text-amber-300 font-bold font-mono">{st.bestMatchCatches} tags</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Tags Badge */}
                  <div className="text-right shrink-0">
                    <div className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                      {st.totalCatches}
                    </div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Total Tags</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset Confirmation Bar */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Persistent history stored locally</span>

            {showResetConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-rose-400 font-bold">Reset stats?</span>
                <button
                  type="button"
                  onClick={handleResetStats}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-black text-[10px] uppercase cursor-pointer"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold text-[10px] uppercase cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset History
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
