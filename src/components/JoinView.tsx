import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Gamepad2, Compass, Users, Trophy, Settings, Globe, Gift, Check, Trash2, UserPlus, Sliders, Volume2, Shield, HelpCircle, BookOpen, MessageSquare, Bug, Eye, Smartphone, VolumeX, Maximize2, Send, RotateCw, Activity, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';
import { soundManager } from '../lib/sound';
import { getGAStatus, setRuntimeMeasurementId, trackEvent, getActiveMeasurementId } from '../lib/analytics';
import {
  getGameSettings,
  saveGameSettings,
  getFriendsList,
  addFriend,
  removeFriend,
  getLeaderboards,
  checkDailyReward,
  claimDailyReward,
  isTutorialCompleted,
  setTutorialCompleted,
  submitFeedbackReport,
  getAnalyticsSummary,
  Friend,
  GameSettings,
  LeaderboardEntry
} from '../lib/socialAndSettings';
import { getUserProfile, saveUserProfile, UserProfile, formatTime } from '../lib/progression';

interface JoinViewProps {
  onJoin: (name: string, code: string) => void;
  onCreate: (name: string) => void;
  loading: boolean;
  error: string | null;
}

interface PublicLobby {
  code: string;
  playerCount: number;
  maxPlayers: number;
  mapId: string;
  hostName: string;
}

export default function JoinView({ onJoin, onCreate, loading, error }: JoinViewProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Phase 4 & 5 State Modals
  const [activeModal, setActiveModal] = useState<'public_lobbies' | 'friends' | 'leaderboards' | 'settings' | 'help' | 'tutorial' | null>(null);
  const [publicLobbies, setPublicLobbies] = useState<PublicLobby[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [newFriendName, setNewFriendName] = useState('');

  const [leaderboardCategory, setLeaderboardCategory] = useState<'wins' | 'level' | 'survival' | 'catches'>('wins');
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile());
  const [gameSettings, setGameSettingsState] = useState<GameSettings>(getGameSettings());

  const [dailyRewardAvailable, setDailyRewardAvailable] = useState(false);
  const [claimedRewardMessage, setClaimedRewardMessage] = useState<string | null>(null);

  // Help & Tutorial states
  const [helpTab, setHelpTab] = useState<'guide' | 'faq' | 'feedback' | 'about'>('guide');
  const [reportType, setReportType] = useState<'bug' | 'feedback'>('bug');
  const [reportCategory, setReportCategory] = useState('Gameplay');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // GA4 Measurement ID runtime state
  const [gaInput, setGaInput] = useState<string>(getActiveMeasurementId() || '');
  const [gaFeedbackMessage, setGaFeedbackMessage] = useState<string | null>(null);
  const gaStatus = getGAStatus();

  // Auto-fill room code from URL parameters or location hash (e.g., ?code=ABCD or #ABCD)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code') || params.get('room') || window.location.hash.replace('#', '');
      if (urlCode && urlCode.trim().length >= 4) {
        setCode(urlCode.trim().toUpperCase().substring(0, 4));
        setIsJoining(true);
      }
    } catch (e) {
      console.warn('Unable to parse room code from URL:', e);
    }

    setFriends(getFriendsList());
    setUserProfile(getUserProfile());
    setGameSettingsState(getGameSettings());

    const rewardCheck = checkDailyReward();
    setDailyRewardAvailable(rewardCheck.canClaim);

    // Auto open tutorial for new players
    if (!isTutorialCompleted()) {
      setActiveModal('tutorial');
    }
  }, []);

  const fetchPublicLobbies = async () => {
    setLoadingLobbies(true);
    try {
      const res = await fetch('/api/public-lobbies');
      if (res.ok) {
        const data = await res.json();
        setPublicLobbies(data.lobbies || []);
      }
    } catch (e) {
      console.warn('Failed to fetch public lobbies', e);
    } finally {
      setLoadingLobbies(false);
    }
  };

  const handleOpenModal = (modal: 'public_lobbies' | 'friends' | 'leaderboards' | 'settings' | 'help' | 'tutorial') => {
    soundManager.playClick();
    setActiveModal(modal);
    if (modal === 'public_lobbies') {
      fetchPublicLobbies();
    } else if (modal === 'friends') {
      setFriends(getFriendsList());
    } else if (modal === 'leaderboards') {
      setUserProfile(getUserProfile());
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportMessage.trim()) return;
    soundManager.playClick();
    submitFeedbackReport(reportType, reportCategory, reportMessage.trim());
    setReportSubmitted(true);
    setReportMessage('');
    setTimeout(() => setReportSubmitted(false), 4000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    soundManager.playClick();
    onCreate(name.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    soundManager.playClick();
    onJoin(name.trim(), code.trim().toUpperCase());
  };

  const toggleMode = () => {
    soundManager.playClick();
    setIsJoining(!isJoining);
  };

  const handleAddFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    soundManager.playClick();
    addFriend(newFriendName.trim());
    setFriends(getFriendsList());
    setNewFriendName('');
  };

  const handleRemoveFriend = (id: string) => {
    soundManager.playClick();
    removeFriend(id);
    setFriends(getFriendsList());
  };

  const handleClaimDaily = () => {
    soundManager.playClick();
    const coins = claimDailyReward();
    const updated = saveUserProfile({ coins: userProfile.coins + coins });
    setUserProfile(updated);
    setDailyRewardAvailable(false);
    setClaimedRewardMessage(`🎉 Claimed +${coins} Daily Coins!`);
    setTimeout(() => setClaimedRewardMessage(null), 3500);
  };

  const handleUpdateSettingField = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    const updated = saveGameSettings({ [key]: val });
    setGameSettingsState(updated);
    if (key === 'musicVolume') {
      soundManager.setMusicVolume(updated.musicVolume / 100);
    } else if (key === 'sfxVolume') {
      soundManager.setSfxVolume(updated.sfxVolume / 100);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] p-4 font-sans select-none relative" id="join-view-container">
      {/* Decorative Bubbly Elements */}
      <div className="absolute top-20 left-10 w-12 h-12 bg-toy-pink/30 rounded-full blur-sm animate-bounce" style={{ animationDuration: '4s' }} />
      <div className="absolute top-40 right-12 w-16 h-16 bg-toy-blue/20 rounded-full blur-md animate-pulse" />
      <div className="absolute bottom-16 left-24 w-10 h-10 bg-toy-yellow/30 rounded-full blur-sm" />

      {/* TOP ACTION BAR: Lobbies, Friends, Leaderboards, Settings & Daily Reward */}
      <div className="w-full max-w-xl flex items-center justify-center flex-wrap gap-2 mb-6 z-10" id="main-nav-bar">
        <button
          type="button"
          onClick={() => handleOpenModal('public_lobbies')}
          className="bg-white hover:bg-sky-50 text-toy-dark font-black text-xs px-3.5 py-2 rounded-2xl border-3 border-toy-dark shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 cursor-pointer"
        >
          <Globe className="w-4 h-4 text-toy-blue" />
          <span>Public Lobbies</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenModal('friends')}
          className="bg-white hover:bg-emerald-50 text-toy-dark font-black text-xs px-3.5 py-2 rounded-2xl border-3 border-toy-dark shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 cursor-pointer relative"
        >
          <Users className="w-4 h-4 text-emerald-500" />
          <span>Friends</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        </button>

        <button
          type="button"
          onClick={() => handleOpenModal('leaderboards')}
          className="bg-white hover:bg-amber-50 text-toy-dark font-black text-xs px-3.5 py-2 rounded-2xl border-3 border-toy-dark shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 cursor-pointer"
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Rankings</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenModal('settings')}
          className="bg-white hover:bg-slate-100 text-toy-dark font-black text-xs px-3.5 py-2 rounded-2xl border-3 border-toy-dark shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 cursor-pointer"
        >
          <Settings className="w-4 h-4 text-slate-600" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenModal('help')}
          className="bg-white hover:bg-purple-50 text-toy-dark font-black text-xs px-3.5 py-2 rounded-2xl border-3 border-toy-dark shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-purple-600" />
          <span>Help & Guide</span>
        </button>

        {dailyRewardAvailable && (
          <button
            type="button"
            onClick={handleClaimDaily}
            className="bg-amber-400 hover:bg-amber-300 text-toy-dark font-black text-xs px-3.5 py-2 rounded-2xl border-3 border-toy-dark shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 cursor-pointer animate-bounce"
          >
            <Gift className="w-4 h-4 text-amber-800" />
            <span>Daily Reward!</span>
          </button>
        )}
      </div>

      {claimedRewardMessage && (
        <div className="mb-4 bg-emerald-500 text-white font-black text-xs px-4 py-2 rounded-2xl border-3 border-toy-dark shadow-md animate-bounce">
          {claimedRewardMessage}
        </div>
      )}

      {/* Main Friendly Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="text-center mb-6"
        id="join-header-container"
      >
        <div className="inline-flex items-center justify-center p-3.5 bg-toy-yellow text-toy-dark border-4 border-toy-dark rounded-2xl shadow-[4px_4px_0px_#1e293b] mb-3 bouncy-pulse" id="game-logo-badge">
          <Gamepad2 className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-toy-dark select-none font-display drop-shadow-[0_2px_0px_white]" id="game-main-title">
          Lulu Seek!
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium max-w-sm mx-auto" id="game-subtitle">
          The ultimate cute & cozy hide-and-seek arena. Play with your friends online!
        </p>
      </motion.div>

      {/* Playful 3D Shadowed Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 12, delay: 0.1 }}
        className="w-full max-w-md bg-white border-4 border-toy-dark p-6 md:p-8 rounded-3xl shadow-[8px_8px_0px_#1e293b] relative overflow-hidden"
        id="join-card"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-toy-orange via-toy-yellow to-toy-blue" id="card-rainbow-border" />
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-50 border-2 border-rose-200 text-rose-600 text-sm font-semibold rounded-2xl text-center"
            id="join-error-msg"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={isJoining ? handleJoin : handleCreate} className="space-y-6" id="join-form">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2 pl-1" htmlFor="player-name-input">
              Choose your nickname
            </label>
            <input
              id="player-name-input"
              type="text"
              required
              maxLength={15}
              placeholder="e.g. HappyPanda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border-4 border-toy-dark text-toy-dark rounded-2xl px-4 py-3.5 font-bold placeholder-slate-400 focus:bg-white focus:outline-none transition-all"
              disabled={loading}
            />
          </div>

          {isJoining && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
              id="room-code-section"
            >
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2 pl-1" htmlFor="room-code-input">
                Enter Room Code
              </label>
              <input
                id="room-code-input"
                type="text"
                required
                maxLength={4}
                autoComplete="off"
                placeholder="ABCD"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-4 border-toy-dark text-center text-3xl font-black tracking-widest text-toy-orange placeholder-slate-300 rounded-2xl py-3.5 focus:bg-white focus:outline-none transition-all font-mono"
                disabled={loading}
              />
            </motion.div>
          )}

          <div className="flex flex-col gap-3 pt-2" id="action-buttons-container">
            {isJoining ? (
              <>
                <button
                  id="submit-join-btn"
                  type="submit"
                  disabled={loading || !name.trim() || !code.trim()}
                  className="w-full bg-toy-orange hover:bg-orange-400 text-white font-black py-4 px-4 rounded-2xl border-4 border-toy-dark shadow-[4px_4px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#1e293b] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <Compass className="w-5 h-5 animate-pulse" />
                  {loading ? 'CONNECTING...' : 'JOIN ROOM'}
                </button>
                <button
                  id="cancel-join-btn"
                  type="button"
                  onClick={toggleMode}
                  className="w-full bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-bold py-3 px-4 rounded-2xl transition-all cursor-pointer text-xs uppercase tracking-widest text-center"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  id="submit-create-btn"
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="w-full bg-toy-green hover:bg-green-400 text-toy-dark font-black py-4 px-4 rounded-2xl border-4 border-toy-dark shadow-[4px_4px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#1e293b] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <Sparkles className="w-5 h-5" />
                  {loading ? 'CREATING...' : 'CREATE NEW ROOM'}
                </button>
                
                <div className="relative flex items-center justify-center my-2" id="or-separator-container">
                  <div className="absolute w-full border-t-2 border-slate-100" />
                  <span className="relative px-3 bg-white text-xs font-bold text-slate-400 uppercase tracking-widest">
                    or
                  </span>
                </div>

                <button
                  id="switch-to-join-btn"
                  type="button"
                  onClick={toggleMode}
                  className="w-full bg-toy-sky hover:bg-sky-200 text-toy-blue font-black py-3.5 px-4 rounded-2xl border-4 border-toy-dark shadow-[4px_4px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#1e293b] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  JOIN AN EXISTING ROOM
                </button>
              </>
            )}
          </div>
        </form>
      </motion.div>

      {/* MODAL 1: PUBLIC LOBBIES */}
      {activeModal === 'public_lobbies' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-toy-dark rounded-3xl max-w-lg w-full p-6 shadow-[8px_8px_0px_#1e293b] space-y-5 my-auto"
          >
            <div className="flex items-center justify-between border-b-4 border-toy-dark pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-6 h-6 text-toy-blue" />
                <h2 className="text-xl font-black text-toy-dark">Active Public Lobbies</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 border-2 border-toy-dark flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto p-1">
              {loadingLobbies ? (
                <div className="text-center py-8 font-bold text-slate-400">Loading open lobbies...</div>
              ) : publicLobbies.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="text-3xl">🏕️</div>
                  <div className="font-bold text-slate-500 text-sm">No open public lobbies right now.</div>
                  <div className="text-xs text-slate-400">Create a new room and invite your friends!</div>
                </div>
              ) : (
                publicLobbies.map((lobby) => (
                  <div
                    key={lobby.code}
                    className="bg-slate-50 border-3 border-toy-dark p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-toy-orange text-base">#{lobby.code}</span>
                        <span className="text-xs font-bold text-toy-dark">Host: {lobby.hostName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-bold capitalize">
                        Map: {lobby.mapId} • {lobby.playerCount}/{lobby.maxPlayers} Players
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setCode(lobby.code);
                        setIsJoining(true);
                        setActiveModal(null);
                      }}
                      className="bg-toy-green hover:bg-green-400 text-toy-dark border-2 border-toy-dark px-3 py-1.5 rounded-xl font-black text-xs uppercase"
                    >
                      Join
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={fetchPublicLobbies}
              className="w-full bg-slate-100 hover:bg-slate-200 text-toy-dark border-3 border-toy-dark py-2.5 rounded-xl font-black text-xs uppercase"
            >
              Refresh Lobbies
            </button>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: FRIENDS SYSTEM */}
      {activeModal === 'friends' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-toy-dark rounded-3xl max-w-md w-full p-6 shadow-[8px_8px_0px_#1e293b] space-y-5 my-auto"
          >
            <div className="flex items-center justify-between border-b-4 border-toy-dark pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-emerald-500" />
                <h2 className="text-xl font-black text-toy-dark">Friends List</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 border-2 border-toy-dark flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            {/* Add Friend Input */}
            <form onSubmit={handleAddFriendSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter friend username..."
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                className="flex-1 bg-slate-50 border-3 border-toy-dark px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs px-3 py-2 rounded-xl border-2 border-toy-dark flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2.5 max-h-64 overflow-y-auto p-1">
              {friends.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-bold">No friends added yet.</div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-slate-50 border-2 border-toy-dark p-2.5 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg border border-toy-dark flex items-center justify-center font-black text-xs text-white"
                        style={{ backgroundColor: friend.avatarColor || '#3b82f6' }}
                      >
                        {friend.username.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-toy-dark flex items-center gap-1">
                          <span>{friend.username}</span>
                          <span className="text-[9px] bg-amber-200 text-amber-900 border border-amber-400 px-1 rounded font-black">
                            LVL {friend.level}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              friend.status === 'online' ? 'bg-emerald-500' : friend.status === 'in-game' ? 'bg-amber-500' : 'bg-slate-300'
                            }`}
                          />
                          <span className="capitalize">{friend.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {friend.roomCode && (
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setCode(friend.roomCode!);
                            setIsJoining(true);
                            setActiveModal(null);
                          }}
                          className="bg-toy-sky hover:bg-sky-300 text-toy-blue font-black text-[10px] px-2 py-1 rounded-lg border border-toy-dark uppercase"
                        >
                          Join #{friend.roomCode}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="p-1 hover:bg-rose-100 text-rose-500 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: LEADERBOARDS */}
      {activeModal === 'leaderboards' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-toy-dark rounded-3xl max-w-lg w-full p-6 shadow-[8px_8px_0px_#1e293b] space-y-5 my-auto"
          >
            <div className="flex items-center justify-between border-b-4 border-toy-dark pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                <h2 className="text-xl font-black text-toy-dark">Global Leaderboards</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 border-2 border-toy-dark flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border-2 border-toy-dark text-xs font-black">
              {[
                { id: 'wins', label: 'Wins' },
                { id: 'level', label: 'Level' },
                { id: 'survival', label: 'Survival' },
                { id: 'catches', label: 'Catches' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setLeaderboardCategory(cat.id as any);
                  }}
                  className={`flex-1 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                    leaderboardCategory === cat.id ? 'bg-amber-400 text-toy-dark shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto p-1">
              {getLeaderboards(leaderboardCategory, userProfile).map((entry) => (
                <div
                  key={entry.username + entry.rank}
                  className={`p-2.5 rounded-xl border-2 flex items-center justify-between text-xs font-bold ${
                    entry.isCurrentPlayer
                      ? 'bg-amber-100 border-amber-500 text-amber-950 font-black shadow-sm'
                      : 'bg-slate-50 border-toy-dark text-toy-dark'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 font-black text-center text-slate-400 text-sm">#{entry.rank}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{entry.username}</span>
                        {entry.isCurrentPlayer && (
                          <span className="bg-amber-400 text-toy-dark text-[9px] px-1 rounded uppercase font-black">You</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">Level {entry.level}</div>
                    </div>
                  </div>

                  <div className="font-black text-right">
                    {leaderboardCategory === 'wins' && <span>{entry.wins} Wins</span>}
                    {leaderboardCategory === 'level' && <span>Level {entry.level}</span>}
                    {leaderboardCategory === 'survival' && <span>{formatTime(entry.survivalTime)}</span>}
                    {leaderboardCategory === 'catches' && <span>{entry.catches} Catches</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 4: SETTINGS */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-toy-dark rounded-3xl max-w-md w-full p-6 shadow-[8px_8px_0px_#1e293b] space-y-5 my-auto"
          >
            <div className="flex items-center justify-between border-b-4 border-toy-dark pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6 text-slate-700" />
                <h2 className="text-xl font-black text-toy-dark">Game Settings</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 border-2 border-toy-dark flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold text-toy-dark">
              {/* Music Volume */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Music Volume</span>
                  <span>{gameSettings.musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={gameSettings.musicVolume}
                  onChange={(e) => handleUpdateSettingField('musicVolume', Number(e.target.value))}
                  className="w-full accent-toy-blue cursor-pointer"
                />
              </div>

              {/* SFX Volume */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Sound Effects (SFX) Volume</span>
                  <span>{gameSettings.sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={gameSettings.sfxVolume}
                  onChange={(e) => handleUpdateSettingField('sfxVolume', Number(e.target.value))}
                  className="w-full accent-toy-green cursor-pointer"
                />
              </div>

              {/* Camera Sensitivity */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Camera Sensitivity</span>
                  <span>Level {gameSettings.cameraSensitivity}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={gameSettings.cameraSensitivity}
                  onChange={(e) => handleUpdateSettingField('cameraSensitivity', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Joystick Controls */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-black uppercase mb-1">Joystick Size</label>
                  <select
                    value={gameSettings.joystickSize}
                    onChange={(e) => handleUpdateSettingField('joystickSize', e.target.value as any)}
                    className="w-full bg-slate-50 border-2 border-toy-dark rounded-xl p-2 font-bold"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-black uppercase mb-1">Joystick Hand</label>
                  <select
                    value={gameSettings.joystickPosition}
                    onChange={(e) => handleUpdateSettingField('joystickPosition', e.target.value as any)}
                    className="w-full bg-slate-50 border-2 border-toy-dark rounded-xl p-2 font-bold"
                  >
                    <option value="left">Left Handed</option>
                    <option value="right">Right Handed</option>
                  </select>
                </div>
              </div>

              {/* Graphics Quality */}
              <div>
                <label className="block text-[10px] text-slate-400 font-black uppercase mb-1">Graphics Quality</label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleUpdateSettingField('graphicsQuality', q as any)}
                      className={`flex-1 py-1.5 rounded-xl uppercase font-black border-2 border-toy-dark cursor-pointer ${
                        gameSettings.graphicsQuality === q ? 'bg-toy-yellow text-toy-dark' : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accessibility Section */}
              <div className="border-t-2 border-slate-200 pt-3 space-y-3">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-toy-blue" /> Accessibility & Controls
                </h4>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {/* Vibration toggle */}
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border-2 border-toy-dark cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gameSettings.vibration}
                      onChange={(e) => handleUpdateSettingField('vibration', e.target.checked)}
                      className="accent-toy-pink"
                    />
                    <span>Haptic Vibration</span>
                  </label>

                  {/* Colorblind mode */}
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border-2 border-toy-dark cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gameSettings.colorblindMode}
                      onChange={(e) => handleUpdateSettingField('colorblindMode', e.target.checked)}
                      className="accent-toy-blue"
                    />
                    <span>High-Contrast Colors</span>
                  </label>

                  {/* Master sound */}
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border-2 border-toy-dark cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gameSettings.soundToggle}
                      onChange={(e) => handleUpdateSettingField('soundToggle', e.target.checked)}
                      className="accent-emerald-500"
                    />
                    <span>Master Audio</span>
                  </label>

                  {/* Large UI scale */}
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border-2 border-toy-dark cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gameSettings.uiScale === 'large'}
                      onChange={(e) => handleUpdateSettingField('uiScale', e.target.checked ? 'large' : 'normal')}
                      className="accent-amber-500"
                    />
                    <span>Large Button Mode</span>
                  </label>
                </div>
              </div>

              {/* Google Analytics 4 Setup Section */}
              <div className="border-t-2 border-slate-200 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-600" /> Google Analytics 4 (GA4)
                  </h4>
                  {gaStatus.isInitialized ? (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> ACTIVE
                    </span>
                  ) : (
                    <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5 text-amber-600" /> INACTIVE
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 font-medium">
                  Enter your GA4 Measurement ID (e.g. <code className="bg-slate-100 px-1 rounded font-bold text-slate-700">G-XXXXXXXXXX</code>) or configure <code className="bg-slate-100 px-1 rounded font-bold text-slate-700">VITE_GA_MEASUREMENT_ID</code> in environment variables.
                </p>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="G-XXXXXXXXXX"
                    value={gaInput}
                    onChange={(e) => setGaInput(e.target.value.toUpperCase().trim())}
                    className="flex-1 bg-slate-50 border-2 border-toy-dark px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setRuntimeMeasurementId(gaInput);
                      setGaFeedbackMessage('Saved & initialized!');
                      setTimeout(() => setGaFeedbackMessage(null), 3000);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs px-3 py-1.5 rounded-xl border-2 border-toy-dark cursor-pointer shrink-0 transition active:scale-95"
                  >
                    Save
                  </button>
                </div>

                {gaStatus.isInitialized && (
                  <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-[10px] text-emerald-900 font-bold">
                    <span className="truncate">Tracking Property: <strong>{gaStatus.measurementId}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        trackEvent('test_ping_button', { timestamp: Date.now() });
                        setGaFeedbackMessage('Sent test event to GA4 Realtime dashboard!');
                        setTimeout(() => setGaFeedbackMessage(null), 3500);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg border border-emerald-800 text-[9px] uppercase font-black shrink-0 cursor-pointer active:scale-95 transition"
                    >
                      Send Test Event ⚡
                    </button>
                  </div>
                )}

                {gaFeedbackMessage && (
                  <div className="text-[10px] font-black text-emerald-600 bg-emerald-100 border border-emerald-300 rounded-lg p-1.5 text-center">
                    {gaFeedbackMessage}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full bg-toy-dark text-white border-3 border-toy-dark py-2.5 rounded-xl font-black text-xs uppercase cursor-pointer hover:bg-slate-800"
            >
              Save & Close
            </button>
          </motion.div>
        </div>
      )}

      {/* MODAL 5: HELP & SUPPORT */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-toy-dark rounded-3xl max-w-lg w-full p-6 shadow-[8px_8px_0px_#1e293b] space-y-4 my-auto"
          >
            <div className="flex items-center justify-between border-b-4 border-toy-dark pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-black text-toy-dark">Help & Support</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 border-2 border-toy-dark flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border-2 border-toy-dark text-xs font-black">
              {[
                { id: 'guide', label: 'Guide' },
                { id: 'faq', label: 'FAQ' },
                { id: 'feedback', label: 'Report / Feedback' },
                { id: 'about', label: 'Release Info' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setHelpTab(tab.id as any);
                  }}
                  className={`flex-1 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                    helpTab === tab.id ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: GUIDE */}
            {helpTab === 'guide' && (
              <div className="space-y-3 text-xs text-slate-700 max-h-72 overflow-y-auto p-1">
                <div className="bg-purple-50 border-2 border-purple-200 p-3 rounded-2xl space-y-1">
                  <h4 className="font-black text-purple-900 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-purple-600" /> Game Rules & Mechanics
                  </h4>
                  <p className="text-[11px] leading-relaxed">
                    Hide & Seek 3D is a multiplayer game where one player is chosen as the <strong>Seeker</strong> and all other players are <strong>Hiders</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-emerald-50 border-2 border-emerald-200 p-2.5 rounded-xl">
                    <div className="font-black text-emerald-800">🌳 Hiders Objective</div>
                    <p className="text-slate-600 mt-0.5">Blend into bushes, use jump pads, speed boosts, or invisibility powerups. Survive until time runs out!</p>
                  </div>

                  <div className="bg-rose-50 border-2 border-rose-200 p-2.5 rounded-xl">
                    <div className="font-black text-rose-800">🔍 Seeker Objective</div>
                    <p className="text-slate-600 mt-0.5">Use your proximity radar and vision cone to locate hiders. Touch hiders to catch them before time expires!</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setTutorialStep(0);
                    setActiveModal('tutorial');
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-2 rounded-xl border-2 border-toy-dark shadow-[2px_2px_0px_#1e293b] flex items-center justify-center gap-2 text-xs uppercase cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" /> Replay Interactive Tutorial
                </button>
              </div>
            )}

            {/* TAB 2: FAQ */}
            {helpTab === 'faq' && (
              <div className="space-y-2 text-xs max-h-72 overflow-y-auto p-1">
                <div className="bg-slate-50 border-2 border-toy-dark p-2.5 rounded-xl space-y-1">
                  <div className="font-black text-toy-dark">Q: How do I join or invite friends?</div>
                  <div className="text-[11px] text-slate-600">Share your 4-letter Room Code or copy the direct lobby link. Friends can also join via the Friends tab!</div>
                </div>

                <div className="bg-slate-50 border-2 border-toy-dark p-2.5 rounded-xl space-y-1">
                  <div className="font-black text-toy-dark">Q: How do I unlock skins & hats?</div>
                  <div className="text-[11px] text-slate-600">Earn Coins and XP by completing matches. Level up to unlock exclusive hats, glasses, and outfit cosmetics in the Lobby Locker!</div>
                </div>

                <div className="bg-slate-50 border-2 border-toy-dark p-2.5 rounded-xl space-y-1">
                  <div className="font-black text-toy-dark">Q: What happens if I disconnect?</div>
                  <div className="text-[11px] text-slate-600">The server safely cleans up rooms and allows you to quickly rejoin with your previous lobby code.</div>
                </div>
              </div>
            )}

            {/* TAB 3: REPORT & FEEDBACK */}
            {helpTab === 'feedback' && (
              <form onSubmit={handleFeedbackSubmit} className="space-y-3 text-xs max-h-72 overflow-y-auto p-1">
                {reportSubmitted ? (
                  <div className="bg-emerald-100 border-2 border-emerald-400 text-emerald-900 p-4 rounded-2xl text-center font-black">
                    ✅ Thank you! Your report has been submitted to the developers.
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setReportType('bug')}
                        className={`flex-1 py-1.5 rounded-xl font-black border-2 border-toy-dark cursor-pointer ${
                          reportType === 'bug' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        🐛 Report Bug
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportType('feedback')}
                        className={`flex-1 py-1.5 rounded-xl font-black border-2 border-toy-dark cursor-pointer ${
                          reportType === 'feedback' ? 'bg-toy-blue text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        💡 Send Feedback
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-black uppercase mb-1">Category</label>
                      <select
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-toy-dark rounded-xl p-2 font-bold text-xs"
                      >
                        <option value="Gameplay">Gameplay & Controls</option>
                        <option value="Multiplayer">Multiplayer & Connection</option>
                        <option value="Graphics">Graphics & Audio</option>
                        <option value="Cosmetics">Skins & Locker</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-black uppercase mb-1">Details</label>
                      <textarea
                        rows={3}
                        value={reportMessage}
                        onChange={(e) => setReportMessage(e.target.value)}
                        placeholder="Describe the issue or feature request..."
                        className="w-full bg-slate-50 border-2 border-toy-dark rounded-xl p-2 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-2 rounded-xl border-2 border-toy-dark shadow-[2px_2px_0px_#1e293b] flex items-center justify-center gap-2 uppercase cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Submit Report
                    </button>
                  </>
                )}
              </form>
            )}

            {/* TAB 4: ABOUT / RELEASE INFO */}
            {helpTab === 'about' && (
              <div className="space-y-3 text-xs max-h-72 overflow-y-auto p-1 text-center">
                <div className="p-4 bg-slate-50 border-2 border-toy-dark rounded-2xl space-y-2">
                  <div className="font-black text-base text-toy-dark">🎮 Hide & Seek 3D Multiplayer</div>
                  <div className="inline-block bg-emerald-100 border border-emerald-400 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    Version 1.0.0 Production Release
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Engineered with 3D Canvas, WebSocket real-time sync, custom toy audio, local progression, and Google Cloud Run deployment architecture.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* MODAL 6: GUIDED GAME TUTORIAL */}
      {activeModal === 'tutorial' && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-toy-dark rounded-3xl max-w-md w-full p-6 shadow-[8px_8px_0px_#1e293b] space-y-5 my-auto text-center"
          >
            <div className="flex items-center justify-between border-b-4 border-toy-dark pb-2">
              <span className="bg-toy-yellow border-2 border-toy-dark px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-toy-dark">
                Tutorial Step {tutorialStep + 1} of 5
              </span>
              <button
                type="button"
                onClick={() => {
                  setTutorialCompleted(true);
                  setActiveModal(null);
                }}
                className="text-xs font-black text-slate-400 hover:text-slate-700 underline"
              >
                Skip Tutorial
              </button>
            </div>

            {/* Tutorial Step Content */}
            {tutorialStep === 0 && (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-toy-sky/30 border-3 border-toy-dark rounded-full mx-auto flex items-center justify-center text-3xl">
                  🕹️
                </div>
                <h3 className="text-lg font-black text-toy-dark">1. Movement & Controls</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Use the <strong>WASD / Arrow Keys</strong> on desktop or the <strong>On-Screen Touch Joystick</strong> on mobile devices to move your character around the map.
                </p>
              </div>
            )}

            {tutorialStep === 1 && (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-emerald-100 border-3 border-toy-dark rounded-full mx-auto flex items-center justify-center text-3xl">
                  🌳
                </div>
                <h3 className="text-lg font-black text-toy-dark">2. Hiding Mechanics</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  As a <strong>Hider</strong>, step inside green bushes or crouch behind objects. Bushes turn semi-transparent for you and grant stealth invisibility from seekers!
                </p>
              </div>
            )}

            {tutorialStep === 2 && (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-rose-100 border-3 border-toy-dark rounded-full mx-auto flex items-center justify-center text-3xl">
                  🔍
                </div>
                <h3 className="text-lg font-black text-toy-dark">3. Seeker Objective & Radar</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  As the <strong>Seeker</strong>, watch your <strong>Proximity Radar</strong>. When hiders are nearby, the radar rings flash faster and emit audio beeps!
                </p>
              </div>
            )}

            {tutorialStep === 3 && (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-amber-100 border-3 border-toy-dark rounded-full mx-auto flex items-center justify-center text-3xl">
                  ⚡
                </div>
                <h3 className="text-lg font-black text-toy-dark">4. Power-ups & Traps</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pick up glowing map items! Collect <strong>Speed Boots</strong> for a sprint boost, <strong>Invisibility Cloaks</strong>, or step on <strong>Jump Pads</strong> to leap onto high rooftops.
                </p>
              </div>
            )}

            {tutorialStep === 4 && (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-purple-100 border-3 border-toy-dark rounded-full mx-auto flex items-center justify-center text-3xl">
                  🏆
                </div>
                <h3 className="text-lg font-black text-toy-dark">5. Match Timer & Rewards</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hiders win if at least 1 survives before the match timer ends. Seekers win if all hiders are caught. Earn <strong>Coins & XP</strong> after every game to unlock new skins!
                </p>
              </div>
            )}

            {/* Navigation controls */}
            <div className="flex gap-2 pt-2">
              {tutorialStep > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setTutorialStep((s) => s - 1);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-toy-dark font-black py-2 rounded-xl border-2 border-toy-dark text-xs uppercase cursor-pointer"
                >
                  Back
                </button>
              )}

              {tutorialStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setTutorialStep((s) => s + 1);
                  }}
                  className="flex-1 bg-toy-blue text-white font-black py-2 rounded-xl border-2 border-toy-dark shadow-[2px_2px_0px_#1e293b] text-xs uppercase cursor-pointer hover:bg-blue-600"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setTutorialCompleted(true);
                    setActiveModal(null);
                  }}
                  className="flex-1 bg-emerald-500 text-white font-black py-2 rounded-xl border-2 border-toy-dark shadow-[2px_2px_0px_#1e293b] text-xs uppercase cursor-pointer hover:bg-emerald-600"
                >
                  Ready to Play! 🚀
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

