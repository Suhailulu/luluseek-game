import React, { useState, useEffect, useRef, ChangeEvent, MouseEvent } from 'react';
import { motion } from 'motion/react';
import { Room, RoomSettings } from '../types';
import { Users, Music, Volume2, Shield, LogOut, Copy, Check, Sparkles, Shuffle, RotateCcw, MessageSquare, Send, Trophy, Coins, Award, User, Flame, Smile, ThumbsUp, Heart } from 'lucide-react';
import { soundManager } from '../lib/sound';
import {
  COLOR_OPTIONS,
  ACCESSORY_OPTIONS,
  HAIR_OPTIONS,
  OUTFIT_OPTIONS,
  GLASSES_OPTIONS,
  getRandomCustomization,
  DEFAULT_CUSTOMIZATION
} from '../lib/customization';
import { getUserProfile, getXpForNextLevel, formatTime, UserProfile } from '../lib/progression';
import { getMatchHistory, MatchHistoryEntry } from '../lib/socialAndSettings';

interface LobbyViewProps {
  room: Room;
  currentPlayerId: string;
  onUpdateSettings: (settings: RoomSettings) => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeave: () => void;
  onUpdateCustomization: (color: string, accessory: string, hair?: string, outfit?: string, glasses?: string) => void;
  onSendChat?: (text: string) => void;
  onSendEmote?: (emote: string) => void;
  onKickPlayer?: (targetPlayerId: string) => void;
  lastEmoteEvent?: { playerId: string; emote: string; timestamp: number } | null;
}

export default function LobbyView({
  room,
  currentPlayerId,
  onUpdateSettings,
  onToggleReady,
  onStartGame,
  onLeave,
  onUpdateCustomization,
  onSendChat,
  onSendEmote,
  onKickPlayer,
  lastEmoteEvent,
}: LobbyViewProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(() => {
    return localStorage.getItem('hide_seek_guide_seen') !== 'true';
  });

  useEffect(() => {
    setUserProfile(getUserProfile());
  }, []);

  const handleCloseTutorial = () => {
    soundManager.playClick();
    localStorage.setItem('hide_seek_guide_seen', 'true');
    setShowTutorialModal(false);
  };
  const [activeTab, setActiveTab] = useState<'color' | 'accessory' | 'hair' | 'outfit' | 'glasses'>('color');
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const players = Object.values(room.players);
  const currentPlayer = room.players[currentPlayerId];
  const isHost = currentPlayer?.isHost;

  // Auto scroll chat to bottom when chatHistory updates
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [room.chatHistory?.length]);

  // Local state for settings and volumes
  const [settings, setSettings] = useState<RoomSettings>({
    maxPlayers: room.settings.maxPlayers,
    numSeekers: room.settings.numSeekers,
    hideTime: room.settings.hideTime,
    matchDuration: room.settings.matchDuration,
    mapId: room.settings.mapId || 'meadow'
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sound manager volumes local state for sliders
  const [sfxVolume, setSfxVolumeState] = useState(soundManager.getSfxVolume());
  const [musicVolume, setMusicVolumeState] = useState(soundManager.getMusicVolume());

  // Keep local settings in sync when updated from server/host
  useEffect(() => {
    if (!isHost) {
      setSettings({
        maxPlayers: room.settings.maxPlayers,
        numSeekers: room.settings.numSeekers,
        hideTime: room.settings.hideTime,
        matchDuration: room.settings.matchDuration,
        mapId: room.settings.mapId || 'meadow'
      });
    }
  }, [room.settings, isHost]);

  // Seeker validation limits logic
  const getMinSeekers = (count: number) => {
    if (count <= 1) return 1;
    if (count <= 6) return 1;
    if (count <= 12) return 2;
    if (count <= 18) return 3;
    return Math.floor((count - 1) / 6) + 1;
  };

  const validate = (currentSettings: RoomSettings) => {
    const playerCount = players.length;
    const minSeekers = getMinSeekers(playerCount);

    if (currentSettings.numSeekers < minSeekers) {
      return `${playerCount} player${playerCount > 1 ? 's' : ''} require${playerCount === 1 ? 's' : ''} at least ${minSeekers} seeker${minSeekers > 1 ? 's' : ''}.`;
    }
    if (currentSettings.numSeekers >= playerCount) {
      return 'Cannot have more seekers than active players minus 1.';
    }
    const hidersCount = playerCount - currentSettings.numSeekers;
    if (hidersCount <= 0) {
      return 'Must have at least one hider.';
    }
    if (currentSettings.maxPlayers < 2 || currentSettings.maxPlayers > 50) {
      return 'Player limit must be between 2 and 50.';
    }
    if (currentSettings.hideTime < 10 || currentSettings.hideTime > 120) {
      return 'Hide countdown must be between 10 and 120 seconds.';
    }
    if (currentSettings.matchDuration < 1 || currentSettings.matchDuration > 30) {
      return 'Game duration must be between 1 and 30 minutes.';
    }
    return null;
  };

  // Perform validation on settings or player count change
  useEffect(() => {
    const error = validate(settings);
    setValidationError(error);
  }, [settings, players.length]);

  const handleSettingChange = (key: keyof RoomSettings, value: any) => {
    if (!isHost) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    
    const error = validate(updated);
    if (!error) {
      onUpdateSettings(updated);
    }
  };

  const handleCopyRawCode = (e?: MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(room.code);
    soundManager.playClick();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = (e?: MouseEvent) => {
    e?.stopPropagation();
    const inviteUrl = `${window.location.origin}/?code=${room.code}`;
    navigator.clipboard.writeText(inviteUrl);
    soundManager.playClick();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleUpdate = (color?: string, accessory?: string, hair?: string, outfit?: string, glasses?: string) => {
    soundManager.playClick();
    onUpdateCustomization(
      color ?? currentPlayer?.color ?? '#38bdf8',
      accessory ?? currentPlayer?.accessory ?? 'none',
      hair ?? currentPlayer?.hair ?? 'none',
      outfit ?? currentPlayer?.outfit ?? 'none',
      glasses ?? currentPlayer?.glasses ?? 'none'
    );
  };

  const handleRandomize = () => {
    soundManager.playClick();
    const rand = getRandomCustomization();
    onUpdateCustomization(rand.color, rand.accessory, rand.hair, rand.outfit, rand.glasses);
  };

  const handleResetDefault = () => {
    soundManager.playClick();
    onUpdateCustomization(
      DEFAULT_CUSTOMIZATION.color,
      DEFAULT_CUSTOMIZATION.accessory,
      DEFAULT_CUSTOMIZATION.hair,
      DEFAULT_CUSTOMIZATION.outfit,
      DEFAULT_CUSTOMIZATION.glasses
    );
  };

  const handleSfxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfxVolumeState(val);
    soundManager.setSfxVolume(val);
  };

  const handleMusicChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMusicVolumeState(val);
    soundManager.setMusicVolume(val);
  };

  const isReadyToStart = players.length >= 2 && players.every(p => p.ready) && !validationError;

  // Render hairstyle preview
  const renderHairPreview = (hairId?: string) => {
    switch (hairId) {
      case 'afro':
        return <div className="absolute -top-4 w-16 h-8 bg-amber-950 rounded-t-full border-2 border-toy-dark z-0" />;
      case 'spiky':
        return (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-5 flex justify-between z-0">
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-[14px] border-b-amber-900 border-l-transparent border-r-transparent" />
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-[18px] border-b-amber-900 border-l-transparent border-r-transparent" />
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-[14px] border-b-amber-900 border-l-transparent border-r-transparent" />
          </div>
        );
      case 'long':
        return <div className="absolute top-2 -inset-x-2 h-14 bg-amber-900 rounded-t-xl border-2 border-toy-dark z-0" />;
      case 'bob':
        return <div className="absolute top-1 -inset-x-1.5 h-10 bg-amber-800 rounded-t-2xl border-2 border-toy-dark z-0" />;
      case 'curly':
        return <div className="absolute -top-3 w-14 h-6 bg-yellow-700 rounded-t-full border-2 border-toy-dark z-0" />;
      case 'pony':
        return (
          <>
            <div className="absolute -top-2 w-12 h-4 bg-yellow-600 rounded-t-full border-2 border-toy-dark z-0" />
            <div className="absolute top-0 -right-3 w-4 h-8 bg-yellow-600 rounded-r-full border-2 border-toy-dark z-0" />
          </>
        );
      default:
        return null;
    }
  };

  // Render glasses preview
  const renderGlassesPreview = (glassesId?: string) => {
    switch (glassesId) {
      case 'sunglasses':
        return (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-11 h-4 bg-slate-900 rounded border border-toy-dark flex justify-between px-1 items-center z-20">
            <div className="w-4 h-2.5 bg-slate-800 rounded-sm" />
            <div className="w-4 h-2.5 bg-slate-800 rounded-sm" />
          </div>
        );
      case 'nerd_glasses':
        return (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-11 h-4 border-2 border-toy-dark flex justify-between px-1 items-center z-20">
            <div className="w-4 h-3 border-2 border-toy-dark rounded-full bg-white/40" />
            <div className="w-4 h-3 border-2 border-toy-dark rounded-full bg-white/40" />
          </div>
        );
      case 'eyepatch':
        return (
          <div className="absolute top-4 left-2 w-5 h-4 bg-slate-900 rounded-sm border border-toy-dark z-20">
            <div className="absolute -top-3 -right-6 w-10 h-0.5 bg-toy-dark transform rotate-12" />
          </div>
        );
      case 'vr_headset':
        return (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-5 bg-toy-dark rounded border border-sky-400 flex items-center justify-center z-20">
            <div className="w-8 h-2 bg-sky-400 rounded-full animate-pulse" />
          </div>
        );
      default:
        return null;
    }
  };

  // Render a cute preview of the selected accessory
  const renderAccessoryPreview = (accessoryId: string) => {
    switch (accessoryId) {
      case 'cat_ears':
        return (
          <>
            <div className="absolute -top-3 left-2 w-5 h-5 bg-toy-dark rounded-tr-lg transform -rotate-12 flex items-center justify-center z-10">
              <div className="w-2.5 h-2.5 bg-pink-300 rounded-tr-md" />
            </div>
            <div className="absolute -top-3 right-2 w-5 h-5 bg-toy-dark rounded-tl-lg transform rotate-12 flex items-center justify-center z-10">
              <div className="w-2.5 h-2.5 bg-pink-300 rounded-tl-md" />
            </div>
          </>
        );
      case 'crown':
        return (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-10 h-7 flex items-end justify-center z-20 animate-bounce" style={{ animationDuration: '3s' }}>
            <div className="w-8 h-4 bg-yellow-400 border-2 border-toy-dark relative flex justify-between px-1">
              <div className="absolute -top-2 left-0 w-0 h-0 border-l-4 border-r-4 border-b-8 border-b-yellow-400" />
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-8 border-b-yellow-400" />
              <div className="absolute -top-2 right-0 w-0 h-0 border-l-4 border-r-4 border-b-8 border-b-yellow-400" />
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mx-auto my-auto" />
            </div>
          </div>
        );
      case 'cowboy_hat':
        return (
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-14 h-6 z-20">
            <div className="w-10 h-4 bg-amber-700 border-2 border-toy-dark rounded-t-lg mx-auto" />
            <div className="w-14 h-2 bg-amber-800 border-2 border-toy-dark rounded-full -mt-1" />
          </div>
        );
      case 'ninja':
        return (
          <div className="absolute top-3 w-full h-3 bg-red-500 border-y-2 border-toy-dark flex items-center justify-center z-20">
            <div className="w-4 h-2 bg-slate-100 border border-toy-dark rounded-sm text-[5px] text-center font-bold">●</div>
            <div className="absolute -right-2 top-0 w-3 h-1.5 bg-red-600 border border-toy-dark transform rotate-12" />
            <div className="absolute -right-2.5 top-1.5 w-3 h-1.5 bg-red-600 border border-toy-dark transform -rotate-12" />
          </div>
        );
      case 'space':
        return (
          <div className="absolute inset-[-6px] rounded-full border-4 border-sky-300 bg-sky-200/20 flex items-center justify-center z-20 animate-pulse">
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-white/60 rounded-full" />
          </div>
        );
      case 'chef':
        return (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-10 h-7 z-20">
            <div className="w-10 h-5 bg-white border-2 border-toy-dark rounded-t-2xl shadow-sm" />
            <div className="w-8 h-3 bg-slate-50 border-x-2 border-b-2 border-toy-dark rounded-b-sm mx-auto -mt-1" />
          </div>
        );
      case 'pirate':
        return (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-11 h-6 z-20">
            <div className="w-10 h-5 bg-slate-900 border-2 border-toy-dark rounded-t-full flex items-center justify-center relative">
              <div className="w-2 h-2 bg-white rounded-full text-[4px] font-bold text-black flex items-center justify-center">☠</div>
            </div>
            <div className="w-11 h-1.5 bg-red-500 rounded-full -mt-1 border-x border-b border-toy-dark" />
          </div>
        );
      case 'party_hat':
        return (
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[20px] border-l-transparent border-r-transparent border-b-toy-pink z-20 flex items-end justify-center">
            <div className="w-2 h-2 bg-toy-yellow rounded-full -mb-1" />
          </div>
        );
      case 'halo':
        return (
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-3 border-2 border-yellow-300 rounded-full bg-yellow-200/40 z-20 animate-pulse" />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-grow min-h-0 font-sans text-toy-dark" id="lobby-root">
      
      {/* Lobby Grid layout */}
      <div className="flex flex-col lg:flex-row flex-grow min-h-0 border-b-4 border-toy-dark">
        
        {/* LEFT COLUMN: Customizer, Map Select & Volume Settings */}
        <div className="w-full lg:w-1/2 border-r-0 lg:border-r-4 border-toy-dark p-4 md:p-6 space-y-6 bg-white overflow-y-auto" id="lobby-settings-column">
          
          {/* PLAYER PROGRESSION & PROFILE HEADER CARD */}
          <div className="bg-amber-400 border-4 border-toy-dark p-3.5 rounded-2xl flex items-center justify-between shadow-[4px_4px_0px_#1e293b] gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-toy-dark text-toy-yellow rounded-xl border-2 border-toy-dark flex items-center justify-center font-black text-sm shadow">
                LVL {userProfile.level}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-toy-dark">{currentPlayer?.name || 'Player'}</span>
                  <span className="bg-white/90 border border-toy-dark text-toy-dark px-1.5 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
                    <span>{userProfile.coins}</span>
                    <Coins className="w-3 h-3 text-amber-600" />
                  </span>
                </div>
                {/* Mini XP bar */}
                <div className="w-28 sm:w-36 h-2.5 bg-toy-dark/20 rounded-full border border-toy-dark/40 overflow-hidden mt-1 relative">
                  <div 
                    className="h-full bg-toy-green transition-all" 
                    style={{ width: `${getXpForNextLevel(userProfile.xp).percent}%` }}
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              id="open-profile-btn"
              onClick={() => {
                soundManager.playClick();
                setShowProfileModal(true);
              }}
              className="bg-white hover:bg-slate-100 text-toy-dark border-3 border-toy-dark px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow active:scale-95 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-toy-dark" />
              <span>Profile</span>
            </button>
          </div>

          {/* Room Code Indicator Card */}
          <div className="bg-toy-sky border-4 border-toy-dark p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-[4px_4px_0px_#1e293b]" id="room-code-badge">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-black text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>Party Room Code</span>
                <span className="text-[9px] bg-white/80 text-sky-900 px-1.5 py-0.5 rounded font-black border border-sky-300">LOBBY CODE</span>
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-3xl font-black tracking-widest text-toy-dark font-mono bg-white/60 px-2.5 py-0.5 rounded-xl border-2 border-sky-300 shadow-inner">
                  {room.code}
                </span>
                <button
                  type="button"
                  id="copy-raw-code-btn"
                  onClick={handleCopyRawCode}
                  title="Copy 4-letter room code to clipboard"
                  className={`border-3 border-toy-dark px-3 py-1.5 font-black rounded-xl shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 text-xs uppercase tracking-wider ${
                    copiedCode
                      ? 'bg-emerald-400 text-toy-dark border-emerald-600 scale-105 ring-2 ring-emerald-300'
                      : 'bg-white hover:bg-amber-100 text-toy-dark'
                  }`}
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-toy-dark stroke-[3.5]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-toy-dark" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="open-guide-btn"
                onClick={() => {
                  soundManager.playClick();
                  setShowTutorialModal(true);
                }}
                className="bg-amber-400 hover:bg-amber-300 text-toy-dark border-4 border-toy-dark px-3 py-2.5 font-black rounded-xl shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 text-xs uppercase tracking-wider"
              >
                📖 Game Guide
              </button>
              <button
                type="button"
                id="copy-invite-link-btn"
                onClick={handleCopyInviteLink}
                title="Copy full invite URL to clipboard"
                className={`border-4 border-toy-dark px-3.5 py-2.5 font-black rounded-xl shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 text-xs uppercase tracking-wider ${
                  copiedLink
                    ? 'bg-emerald-400 text-toy-dark border-emerald-600 scale-105 ring-2 ring-emerald-300'
                    : 'bg-white hover:bg-sky-100 text-toy-dark'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-toy-dark stroke-[3.5]" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-toy-dark" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* CHARACTER CUSTOMIZATION AREA */}
          <div className="bg-slate-50 border-4 border-toy-dark p-5 rounded-3xl shadow-[4px_4px_0px_#1e293b]" id="customization-panel">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-black text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-toy-yellow" />
                Customize Avatar
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="randomize-avatar-btn"
                  onClick={handleRandomize}
                  className="bg-toy-yellow hover:bg-yellow-300 text-toy-dark font-black text-xs px-3 py-1.5 rounded-xl border-2 border-toy-dark flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                  title="Randomize Character"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Random
                </button>
                <button
                  type="button"
                  id="reset-avatar-btn"
                  onClick={handleResetDefault}
                  className="bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs px-3 py-1.5 rounded-xl border-2 border-toy-dark flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                  title="Reset to Default"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* Cute Live Player Preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-white border-4 border-toy-dark rounded-2xl w-36 h-36 relative shadow-inner overflow-hidden">
                <div 
                  className="w-16 h-16 rounded-full border-4 border-toy-dark relative animate-bounce flex items-center justify-center"
                  style={{ 
                    backgroundColor: currentPlayer?.color || '#38bdf8',
                    animationDuration: '2s'
                  }}
                >
                  {/* Hairstyle */}
                  {renderHairPreview(currentPlayer?.hair)}

                  {/* Hat Accessory */}
                  {renderAccessoryPreview(currentPlayer?.accessory || 'none')}

                  {/* Glasses */}
                  {renderGlassesPreview(currentPlayer?.glasses)}

                  {/* Bouncy Eyes */}
                  <div className="absolute top-4 left-3 w-3.5 h-4.5 bg-white rounded-full flex items-center justify-center z-10">
                    <div className="w-1.5 h-1.5 bg-toy-dark rounded-full mt-1.5" />
                  </div>
                  <div className="absolute top-4 right-3 w-3.5 h-4.5 bg-white rounded-full flex items-center justify-center z-10">
                    <div className="w-1.5 h-1.5 bg-toy-dark rounded-full mt-1.5" />
                  </div>
                  {/* Happy Mouth */}
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-4 h-2 border-b-2 border-toy-dark rounded-b-full z-10" />

                  {/* Outfit Pattern Tag */}
                  {currentPlayer?.outfit && currentPlayer.outfit !== 'none' && (
                    <div className="absolute bottom-0 w-full h-3 bg-white/30 border-t border-toy-dark/40 flex items-center justify-center text-[6px] font-black uppercase text-toy-dark z-10">
                      {currentPlayer.outfit}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest z-10">Preview</span>
              </div>

              {/* Customizer Tabs & Options */}
              <div className="flex-1 space-y-3 w-full">
                {/* Category Navigation Tabs */}
                <div className="flex border-b-2 border-slate-200 gap-1 overflow-x-auto pb-1 text-[10px] font-black uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setActiveTab('color')}
                    className={`px-2.5 py-1 rounded-t-lg transition-all cursor-pointer ${
                      activeTab === 'color' ? 'bg-toy-dark text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🎨 Skin
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('accessory')}
                    className={`px-2.5 py-1 rounded-t-lg transition-all cursor-pointer ${
                      activeTab === 'accessory' ? 'bg-toy-dark text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    👑 Headwear
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('hair')}
                    className={`px-2.5 py-1 rounded-t-lg transition-all cursor-pointer ${
                      activeTab === 'hair' ? 'bg-toy-dark text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    💇 Hair
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('outfit')}
                    className={`px-2.5 py-1 rounded-t-lg transition-all cursor-pointer ${
                      activeTab === 'outfit' ? 'bg-toy-dark text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    👕 Outfit
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('glasses')}
                    className={`px-2.5 py-1 rounded-t-lg transition-all cursor-pointer ${
                      activeTab === 'glasses' ? 'bg-toy-dark text-white' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    👓 Glasses
                  </button>
                </div>

                {/* Tab 1: Colors */}
                {activeTab === 'color' && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Select Skin Color</span>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map((col) => {
                        const isTaken = Object.values(room.players).some(
                          (p) => p.id !== currentPlayerId && p.color.toUpperCase() === col.value.toUpperCase()
                        );
                        const isSelected = currentPlayer?.color === col.value;
                        return (
                          <button
                            key={col.value}
                            disabled={isTaken}
                            onClick={() => !isTaken && handleUpdate(col.value)}
                            className={`w-7 h-7 rounded-full border-2 transition-all relative cursor-pointer flex items-center justify-center ${
                              isSelected 
                                ? 'border-toy-dark scale-110 ring-2 ring-toy-yellow/50' 
                                : isTaken 
                                  ? 'opacity-30 border-transparent cursor-not-allowed' 
                                  : 'border-transparent shadow-sm hover:scale-110'
                            }`}
                            style={{ backgroundColor: col.value }}
                            title={isTaken ? `${col.label} (Taken)` : col.label}
                          >
                            {isTaken && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white text-[10px] font-bold drop-shadow-md">✕</span>
                              </div>
                            )}
                            {isSelected && !isTaken && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full border border-toy-dark animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab 2: Headwear */}
                {activeTab === 'accessory' && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Select Headwear</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ACCESSORY_OPTIONS.map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => handleUpdate(undefined, acc.id)}
                          className={`py-1 px-1 border-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            (currentPlayer?.accessory || 'none') === acc.id
                              ? 'bg-toy-dark text-white border-toy-dark'
                              : 'bg-white text-toy-dark border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block text-sm mb-0.5">{acc.emoji}</span>
                          <span className="truncate block max-w-full text-[8px]">{acc.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: Hairstyles */}
                {activeTab === 'hair' && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Select Hairstyle</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {HAIR_OPTIONS.map((hr) => (
                        <button
                          key={hr.id}
                          onClick={() => handleUpdate(undefined, undefined, hr.id)}
                          className={`py-1 px-1 border-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            (currentPlayer?.hair || 'none') === hr.id
                              ? 'bg-toy-dark text-white border-toy-dark'
                              : 'bg-white text-toy-dark border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block text-sm mb-0.5">{hr.emoji}</span>
                          <span className="truncate block max-w-full text-[8px]">{hr.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 4: Outfits */}
                {activeTab === 'outfit' && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Select Clothing Style</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {OUTFIT_OPTIONS.map((out) => (
                        <button
                          key={out.id}
                          onClick={() => handleUpdate(undefined, undefined, undefined, out.id)}
                          className={`py-1 px-1 border-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            (currentPlayer?.outfit || 'none') === out.id
                              ? 'bg-toy-dark text-white border-toy-dark'
                              : 'bg-white text-toy-dark border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block text-sm mb-0.5">{out.emoji}</span>
                          <span className="truncate block max-w-full text-[8px]">{out.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 5: Glasses */}
                {activeTab === 'glasses' && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Select Glasses / Eyewear</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {GLASSES_OPTIONS.map((gl) => (
                        <button
                          key={gl.id}
                          onClick={() => handleUpdate(undefined, undefined, undefined, undefined, gl.id)}
                          className={`py-1.5 px-1 border-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            (currentPlayer?.glasses || 'none') === gl.id
                              ? 'bg-toy-dark text-white border-toy-dark'
                              : 'bg-white text-toy-dark border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block text-sm mb-0.5">{gl.emoji}</span>
                          <span className="truncate block max-w-full text-[8px]">{gl.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AUDIO CONTROLS SECTION */}
          <div className="bg-slate-50 border-4 border-toy-dark p-5 rounded-3xl shadow-[4px_4px_0px_#1e293b] space-y-4" id="audio-panel">
            <h3 className="font-black text-base flex items-center gap-2">
              <Music className="w-5 h-5 text-toy-pink" />
              Volume Adjustment
            </h3>
            
            <div className="space-y-3 font-medium text-sm">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>🎵 Background Music</span>
                  <span>{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={musicVolume}
                  onChange={handleMusicChange}
                  className="w-full accent-toy-pink cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>🔊 Sound Effects</span>
                  <span>{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={sfxVolume}
                  onChange={handleSfxChange}
                  className="w-full accent-toy-blue cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* MAP SELECTION FOR HOST / VIEWER FOR PLAYER */}
          <div className="space-y-4" id="map-selection-panel">
            <h3 className="font-black text-lg text-toy-dark flex items-center justify-between">
              <span>Select High-Quality Map</span>
              {!isHost && <span className="text-xs text-slate-400 font-medium">(Host Selection Only)</span>}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Map 1: Forest Camp */}
              <button
                type="button"
                disabled={!isHost}
                onClick={() => handleSettingChange('mapId', 'meadow')}
                className={`text-left p-4 border-4 rounded-2xl transition-all flex flex-col justify-between h-32 relative overflow-hidden ${
                  settings.mapId === 'meadow'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-[4px_4px_0px_#059669]'
                    : 'bg-white border-slate-200 hover:bg-slate-50 disabled:hover:bg-white'
                } ${isHost ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl">🌲</span>
                    <h4 className="font-black text-sm text-toy-dark mt-1">Map 1: Forest Camp</h4>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full border border-emerald-300">
                    BALANCED • MEADOW
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                  Trees, bushes, campfire, river bridge, cabins, & hollow trees. Medium visibility with dynamic weather!
                </p>
                {settings.mapId === 'meadow' && <div className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />}
              </button>

              {/* Map 2: Warehouse Escape */}
              <button
                type="button"
                disabled={!isHost}
                onClick={() => handleSettingChange('mapId', 'graveyard')}
                className={`text-left p-4 border-4 rounded-2xl transition-all flex flex-col justify-between h-32 relative overflow-hidden ${
                  settings.mapId === 'graveyard'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-[4px_4px_0px_#d97706]'
                    : 'bg-white border-slate-200 hover:bg-slate-50 disabled:hover:bg-white'
                } ${isHost ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl">📦</span>
                    <h4 className="font-black text-sm text-toy-dark mt-1">Map 2: Warehouse Escape</h4>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full border border-amber-300">
                    CLOSE COMBAT • CHASE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                  Narrow corridors, wooden crates, storage lockers, machinery & vent hiding spots. High difficulty!
                </p>
                {settings.mapId === 'graveyard' && <div className="absolute top-2 right-2 w-3 h-3 bg-amber-500 rounded-full animate-ping" />}
              </button>
            </div>
          </div>

          {/* Standard Room Settings (Sliders) */}
          <div className="bg-slate-50 border-4 border-toy-dark p-5 rounded-3xl shadow-[4px_4px_0px_#1e293b] space-y-4" id="standard-settings-panel">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base">Game Rules</h3>

              {/* Public vs Private Lobby Toggle */}
              <button
                type="button"
                disabled={!isHost}
                onClick={() => handleSettingChange('isPrivate' as any, !settings.isPrivate)}
                className={`px-3 py-1.5 rounded-xl border-2 border-toy-dark font-black text-xs flex items-center gap-1.5 transition-all ${
                  settings.isPrivate
                    ? 'bg-rose-100 text-rose-800 border-rose-400'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-400'
                } ${isHost ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
              >
                <span>{settings.isPrivate ? '🔒 Private Lobby' : '🌐 Public Lobby'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Max Players Adjuster */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Max Players ({settings.maxPlayers})</label>
                <input
                  type="range"
                  min="2"
                  max="16"
                  step="1"
                  disabled={!isHost}
                  value={settings.maxPlayers}
                  onChange={(e) => handleSettingChange('maxPlayers', parseInt(e.target.value))}
                  className="w-full accent-toy-dark disabled:opacity-50 cursor-pointer"
                />
              </div>

              {/* Number of Seekers Adjuster */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Seeker Count ({settings.numSeekers})</label>
                <input
                  type="range"
                  min="1"
                  max={Math.max(1, players.length - 1)}
                  step="1"
                  disabled={!isHost}
                  value={settings.numSeekers}
                  onChange={(e) => handleSettingChange('numSeekers', parseInt(e.target.value))}
                  className="w-full accent-toy-dark disabled:opacity-50 cursor-pointer"
                />
              </div>

              {/* Hide Countdown Time Adjuster */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Hide Time ({settings.hideTime}s)</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  disabled={!isHost}
                  value={settings.hideTime}
                  onChange={(e) => handleSettingChange('hideTime', parseInt(e.target.value))}
                  className="w-full accent-toy-dark disabled:opacity-50 cursor-pointer"
                />
              </div>

              {/* Match Duration Adjuster */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Match Duration ({settings.matchDuration}m)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  disabled={!isHost}
                  value={settings.matchDuration}
                  onChange={(e) => handleSettingChange('matchDuration', parseInt(e.target.value))}
                  className="w-full accent-toy-dark disabled:opacity-50 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Players Roster */}
        <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col bg-slate-50" id="lobby-players-column">
          <h2 className="text-toy-dark font-black text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-toy-blue" />
            Players in Lobby ({players.length})
          </h2>

          {validationError && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-200 text-rose-600 text-xs font-semibold rounded-2xl mb-4" id="settings-validation-box">
              ⚠ {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1 content-start overflow-y-auto pr-1" id="players-roster">
            {players.map((p) => {
              const isMe = p.id === currentPlayerId;
              
              return (
                <motion.div
                  key={p.id}
                  layoutId={`player-card-${p.id}`}
                  className={`p-3.5 flex items-center justify-between border-4 rounded-2xl transition-all ${
                    p.ready
                      ? 'bg-emerald-50/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400/50'
                      : p.isHost 
                        ? 'bg-white border-toy-yellow shadow-[4px_4px_0px_#1e293b]' 
                        : 'bg-white border-toy-dark shadow-[4px_4px_0px_#cbd5e1]'
                  }`}
                  id={`player-item-${p.id}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Tiny Player Avatar Render */}
                    <div 
                      className="w-10 h-10 rounded-full border-2 border-toy-dark relative flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: p.color || '#38bdf8' }}
                    >
                      {/* Bouncy Eyes */}
                      <div className="absolute top-2 left-1.5 w-2 h-3 bg-white rounded-full flex items-center justify-center">
                        <div className="w-0.5 h-1 bg-toy-dark rounded-full mt-1" />
                      </div>
                      <div className="absolute top-2 right-1.5 w-2 h-3 bg-white rounded-full flex items-center justify-center">
                        <div className="w-0.5 h-1 bg-toy-dark rounded-full mt-1" />
                      </div>
                      {/* Hat Emoji label */}
                      <span className="absolute -top-3.5 text-base select-none">
                        {p.accessory === 'cat_ears' && '🐱'}
                        {p.accessory === 'crown' && '👑'}
                        {p.accessory === 'cowboy_hat' && '🤠'}
                        {p.accessory === 'ninja' && '🧣'}
                        {p.accessory === 'space' && '🪐'}
                        {p.accessory === 'chef' && '🧁'}
                        {p.accessory === 'pirate' && '🏴‍☠️'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-bold tracking-tight text-sm flex items-center gap-1.5 text-toy-dark">
                        {p.name}
                        <span className="text-[9px] bg-amber-200 text-amber-900 border border-amber-400 px-1.5 py-0.2 rounded font-black">
                          LVL {p.level || 1}
                        </span>
                        {p.isHost && (
                          <span className="text-[9px] bg-toy-yellow text-toy-dark px-1.5 py-0.5 rounded-full font-black">
                            HOST
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[9px] bg-toy-sky text-toy-blue px-1.5 py-0.5 rounded-full font-black">
                            YOU
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {p.ready ? 'Ready to play!' : 'Customizing...'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isHost && !p.isHost && p.id !== currentPlayerId && onKickPlayer && (
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          onKickPlayer(p.id);
                        }}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-[10px] px-2 py-1 rounded-lg border border-rose-300 uppercase cursor-pointer"
                        title="Kick player"
                      >
                        Kick
                      </button>
                    )}

                    {p.ready ? (
                      <motion.div
                        initial={{ scale: 0.7, rotate: -10 }}
                        animate={{ scale: [1, 1.22, 1], rotate: 0 }}
                        transition={{ duration: 0.3, type: 'spring' }}
                        className="bg-emerald-500 text-white font-black px-3 py-1 rounded-xl shadow-md border-2 border-toy-dark flex items-center gap-1.5 ring-2 ring-emerald-300 animate-pulse"
                      >
                        <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                        <span className="text-[11px] tracking-wider uppercase">READY</span>
                      </motion.div>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-400 font-bold px-2.5 py-1 rounded-xl border border-slate-200">
                        WAITING
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* LOBBY EMOTE ACTION BAR */}
          <div className="mt-3 bg-amber-100 border-3 border-toy-dark p-2.5 rounded-2xl flex items-center justify-between flex-wrap gap-2 shadow-sm" id="lobby-emote-bar">
            <span className="font-black text-xs uppercase tracking-wider text-toy-dark flex items-center gap-1">
              <span>🎭 Express Emote:</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { symbol: '👋', label: 'Wave' },
                { symbol: '😂', label: 'Laugh' },
                { symbol: '👍', label: 'Thumbs Up' },
                { symbol: '💃', label: 'Dance' },
                { symbol: '😴', label: 'Sleep' },
                { symbol: '🔥', label: 'Fire' },
              ].map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    if (onSendEmote) {
                      onSendEmote(item.symbol);
                    }
                  }}
                  className="bg-white hover:bg-toy-yellow text-toy-dark font-black text-sm px-2 py-1 rounded-xl border-2 border-toy-dark flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                  title={item.label}
                >
                  <span>{item.symbol}</span>
                  <span className="text-[10px] hidden sm:inline font-bold">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* LOBBY CHAT WINDOW */}
          <div className="mt-4 bg-white border-4 border-toy-dark rounded-3xl shadow-[4px_4px_0px_#1e293b] flex flex-col h-56 overflow-hidden" id="lobby-chat-card">
            {/* Header */}
            <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between border-b-2 border-toy-dark">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-toy-sky" />
                <span className="font-black text-xs uppercase tracking-wider">Lobby Chat</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {room.chatHistory?.length || 0} messages
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-slate-50/50 text-xs font-medium" ref={chatScrollRef}>
              {(!room.chatHistory || room.chatHistory.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-6 text-[11px] italic">
                  <span>💬 No messages yet. Say hello to everyone in the lobby!</span>
                </div>
              ) : (
                room.chatHistory.map((m) => {
                  const isMe = m.senderId === currentPlayerId;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5 px-1">
                        <span className="font-black text-[10px]" style={{ color: m.senderColor || '#0f172a' }}>
                          {m.senderName}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`px-3 py-1.5 rounded-2xl max-w-[85%] break-words font-medium text-xs border ${
                        isMe 
                          ? 'bg-toy-dark text-white border-toy-dark rounded-tr-none' 
                          : 'bg-white text-slate-800 border-slate-200 shadow-sm rounded-tl-none'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Emoji Buttons */}
            <div className="px-3 py-1 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
              {['👋', '🎮', '🔥', '🏆', '👀', '❤️', '😊', '🚀'].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    if (onSendChat) {
                      onSendChat(e);
                      soundManager.playClick();
                    }
                  }}
                  className="text-xs hover:scale-125 transition-transform cursor-pointer px-1 py-0.5 rounded hover:bg-slate-200 active:scale-95 shrink-0"
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatInput.trim()) return;
                if (onSendChat) {
                  onSendChat(chatInput.trim());
                  soundManager.playClick();
                }
                setChatInput('');
              }}
              className="p-2 bg-white border-t-2 border-toy-dark flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={150}
                placeholder="Type a message..."
                className="flex-1 bg-slate-100 border border-slate-300 focus:border-toy-dark text-slate-800 text-xs px-3 py-1.5 rounded-xl outline-none font-medium"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-toy-dark hover:bg-slate-800 disabled:opacity-40 text-white font-bold p-2 rounded-xl transition cursor-pointer active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Quick instructions Card */}
          <div className="mt-4 p-4 border-2 border-toy-dark bg-white rounded-2xl text-[11px] text-slate-400 font-medium space-y-1">
            <div className="font-bold text-slate-600 mb-1">🎮 How to play:</div>
            <div>• Move using keyboard <span className="font-bold bg-slate-100 border border-slate-300 rounded px-1 text-slate-700">W, A, S, D</span> or mobile Joysticks.</div>
            <div>• Hold <span className="font-bold bg-slate-100 border border-slate-300 rounded px-1 text-slate-700">SHIFT</span> to sprint! Run away to conserve stamina!</div>
            <div>• Stand inside <span className="font-bold text-emerald-600">Green Foliage Bushes</span> to disappear completely!</div>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROL TRAY: Leave / Ready / Start */}
      <div className="p-4 md:p-6 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 border-t-4 border-toy-dark" id="lobby-action-tray">
        <button
          id="lobby-leave-btn"
          onClick={onLeave}
          className="text-toy-orange hover:text-orange-600 text-xs font-black uppercase tracking-widest cursor-pointer flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          Leave Lobby
        </button>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* I'M READY button for non-host clients */}
          {!isHost && (
            <button
              id="lobby-ready-btn"
              onClick={() => {
                soundManager.playClick();
                onToggleReady();
              }}
              className={`border-4 border-toy-dark text-toy-dark font-black px-10 py-3 rounded-2xl shadow-[4px_4px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#1e293b] transition-all cursor-pointer text-xs uppercase tracking-wider ${
                currentPlayer?.ready ? 'bg-toy-green hover:bg-green-300' : 'bg-toy-yellow hover:bg-yellow-300'
              }`}
            >
              {currentPlayer?.ready ? "✓ I'm Ready!" : "Mark Ready"}
            </button>
          )}

          {/* LAUNCH MATCH button for host */}
          {isHost ? (
            <button
              id="host-start-game-btn"
              onClick={() => {
                soundManager.playClick();
                onStartGame();
              }}
              disabled={!isReadyToStart}
              className="bg-toy-green text-toy-dark font-black px-12 md:px-16 py-3 border-4 border-toy-dark rounded-2xl shadow-[4px_4px_0px_#1e293b] hover:bg-green-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#1e293b] disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none transition-all cursor-pointer text-xs uppercase tracking-wider"
            >
              Start Game!
            </button>
          ) : (
            <div className="text-right flex items-center justify-center p-3 bg-slate-50 border-2 border-toy-dark rounded-xl text-xs text-slate-500 font-bold">
              <span className="w-2 h-2 bg-toy-yellow rounded-full animate-ping mr-2"></span>
              Waiting for host to start the round...
            </div>
          )}
        </div>
      </div>

      {/* GAME GUIDE / TUTORIAL MODAL SCREEN */}
      {showTutorialModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white border-4 border-toy-dark rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-[8px_8px_0px_#1e293b] space-y-6 my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-4 border-toy-dark pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎮</span>
                <div>
                  <h2 className="text-2xl font-black text-toy-dark tracking-tight">Game Guide & Arena Rules</h2>
                  <p className="text-xs text-slate-500 font-bold">Master the art of hiding and seeking!</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseTutorial}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border-2 border-toy-dark flex items-center justify-center font-black text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Objective: Hiders */}
              <div className="bg-emerald-50 border-3 border-emerald-400 p-4 rounded-2xl space-y-1">
                <span className="text-2xl block mb-1">🌿 Hiders Objective</span>
                <h4 className="font-black text-sm text-emerald-950">Survive Until Time Expires</h4>
                <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                  Scatter into bushes, hollow trees, and cabins during the 30s hide phase. Collect energy orbs & coins for speed boosts!
                </p>
              </div>

              {/* Objective: Seeker */}
              <div className="bg-amber-50 border-3 border-amber-400 p-4 rounded-2xl space-y-1">
                <span className="text-2xl block mb-1">🔍 Seeker Objective</span>
                <h4 className="font-black text-sm text-amber-950">Tag Every Hider</h4>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  Search dense bushes, inspect special hiding spots, and listen for footstep ripples to catch all hiders before time runs out!
                </p>
              </div>

              {/* Basic Movement & Controls */}
              <div className="bg-sky-50 border-3 border-sky-400 p-4 rounded-2xl space-y-2 col-span-1 md:col-span-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-sky-900 flex items-center gap-2">
                  <span>👣 Controls & Actions</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold text-slate-700">
                  <div className="bg-white p-2.5 rounded-xl border-2 border-sky-200 flex items-center gap-2">
                    <span className="bg-sky-200 text-sky-900 px-2 py-0.5 rounded font-mono font-black">WASD</span>
                    <span>Move Player</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border-2 border-sky-200 flex items-center gap-2">
                    <span className="bg-sky-200 text-sky-900 px-2 py-0.5 rounded font-mono font-black">SHIFT</span>
                    <span>Sprint / Dash</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border-2 border-sky-200 flex items-center gap-2">
                    <span className="bg-sky-200 text-sky-900 px-2 py-0.5 rounded font-mono font-black">E</span>
                    <span>Use Special Spot</span>
                  </div>
                </div>
              </div>

              {/* Special Hiding Spots & Dynamic Events */}
              <div className="bg-purple-50 border-3 border-purple-300 p-4 rounded-2xl space-y-2 col-span-1 md:col-span-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-purple-900">
                  ⚡ 1-Person Special Hiding Spots & Weather Events
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-purple-950 font-medium">
                  <div className="space-y-1">
                    <span className="font-bold text-purple-900 block">🪵 1-Person Secret Spots</span>
                    <p>Hollow trees, cellar doors, and storage lockers hide 1 player completely. When you leave, they lock for 60 seconds!</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-purple-900 block">☁️ Dynamic Events (Every 45s)</span>
                    <p>Heavy Fog reduces line-of-sight, Night Mode dims lights, and Wind shakes bushes to reveal hidden players!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Got It Button */}
            <div className="pt-2">
              <button
                type="button"
                id="close-tutorial-modal-btn"
                onClick={handleCloseTutorial}
                className="w-full bg-toy-green hover:bg-green-400 text-toy-dark border-4 border-toy-dark py-4 rounded-2xl font-black text-base uppercase tracking-wider shadow-[4px_4px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                Got It, Let's Play! 🚀
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* PROFILE & STATS MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white border-4 border-toy-dark rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-[8px_8px_0px_#1e293b] space-y-6 my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-4 border-toy-dark pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-toy-yellow text-toy-dark rounded-2xl border-3 border-toy-dark flex items-center justify-center font-black text-xl shadow">
                  🏆
                </div>
                <div>
                  <h2 className="text-2xl font-black text-toy-dark tracking-tight">Player Profile & Stats</h2>
                  <p className="text-xs text-slate-500 font-bold">Your Hide & Seek Progression</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setShowProfileModal(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border-2 border-toy-dark flex items-center justify-center font-black text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Level & XP Overview Card */}
            <div className="bg-amber-100 border-3 border-toy-dark p-4 rounded-2xl space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-toy-dark text-toy-yellow font-black text-sm px-3 py-1 rounded-xl border border-toy-dark">
                    LEVEL {userProfile.level}
                  </span>
                  <span className="font-black text-toy-dark text-sm">{currentPlayer?.name || 'Player'}</span>
                </div>
                <div className="flex items-center gap-1 font-black text-amber-900 text-sm">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>{userProfile.coins} Coins</span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[11px] font-black text-toy-dark mb-1">
                  <span>Level Progress</span>
                  <span>{getXpForNextLevel(userProfile.xp).current} / {getXpForNextLevel(userProfile.xp).total} XP</span>
                </div>
                <div className="w-full h-4 bg-white border-2 border-toy-dark rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-toy-green rounded-full transition-all duration-500"
                    style={{ width: `${getXpForNextLevel(userProfile.xp).percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Lifetime Statistics Grid */}
            <div className="space-y-2">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-500">Lifetime Career Statistics</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 border-2 border-toy-dark p-3 rounded-2xl flex flex-col">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Matches Played</span>
                  <span className="text-xl font-black text-toy-dark">{userProfile.matchesPlayed}</span>
                </div>
                <div className="bg-slate-50 border-2 border-toy-dark p-3 rounded-2xl flex flex-col">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Victories (Wins)</span>
                  <span className="text-xl font-black text-emerald-600">{userProfile.wins} <span className="text-xs text-slate-400 font-normal">({userProfile.matchesPlayed > 0 ? Math.round((userProfile.wins / userProfile.matchesPlayed) * 100) : 0}%)</span></span>
                </div>
                <div className="bg-slate-50 border-2 border-toy-dark p-3 rounded-2xl flex flex-col">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Time Survived</span>
                  <span className="text-xl font-black text-toy-blue">{formatTime(userProfile.survivalTime)}</span>
                </div>
                <div className="bg-slate-50 border-2 border-toy-dark p-3 rounded-2xl flex flex-col">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Hiders Caught</span>
                  <span className="text-xl font-black text-amber-600">{userProfile.totalCatches}</span>
                </div>
              </div>
            </div>

            {/* Match History Section */}
            <div className="space-y-2">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-500">Recent Match History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                {getMatchHistory().length === 0 ? (
                  <div className="text-center py-4 text-xs font-bold text-slate-400 bg-slate-50 border-2 border-toy-dark rounded-xl">
                    No completed matches yet. Play your first game!
                  </div>
                ) : (
                  getMatchHistory().map((match) => (
                    <div
                      key={match.id}
                      className="bg-slate-50 border-2 border-toy-dark p-2.5 rounded-xl flex items-center justify-between text-xs font-bold"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white ${
                              match.result === 'win' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          >
                            {match.result}
                          </span>
                          <span className="text-toy-dark font-black">{match.mapName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">({match.role})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">{match.date}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-amber-600 font-black">+{match.coinsEarned} Coins • +{match.xpEarned} XP</div>
                        <div className="text-[10px] text-slate-400 font-medium">Survived: {formatTime(match.survivalTime)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setShowProfileModal(false);
                }}
                className="w-full bg-toy-dark hover:bg-slate-800 text-white border-4 border-toy-dark py-3 rounded-2xl font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
