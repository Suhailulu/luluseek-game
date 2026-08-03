import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Room, Player } from '../types';
import { useInputManager } from '../hooks/useInputManager';
import { getMapById, moveWithCollision, getHidingBushId, checkCollision, MAP_WIDTH, MAP_HEIGHT, PLAYER_RADIUS } from '../map';
import { Clock, Eye, AlertTriangle, Play, Trophy, Users, Shield, ArrowLeft, Heart, Smile, LogOut, Minimize2, Maximize2, ZoomIn, ZoomOut, Map, Check, Copy, Settings, Volume2, Music, RotateCw } from 'lucide-react';
import { soundManager } from '../lib/sound';
import { trackEvent } from '../lib/analytics';

import { recordMatchEnd, MatchRewardCalculation } from '../lib/progression';
import { addMatchHistoryEntry } from '../lib/socialAndSettings';
import { PingLatencyChart } from './PingLatencyChart';
import { TopTaggersSummary } from './TopTaggersSummary';
import { Leaderboard } from './Leaderboard';

// Landmark Zone interface and definitions for maps
export interface LandmarkZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  borderColor: string;
  bgFill: string;
}

export function getLandmarkZonesForMap(map: ReturnType<typeof getMapById>): LandmarkZone[] {
  const isSpooky = map.obstacles.some(o => o.id.startsWith('spooky'));
  const isToy = map.obstacles.some(o => o.id.startsWith('toy'));

  if (isSpooky) {
    return [
      { id: 'z1', name: 'DARK CRYPT', x: 0, y: 0, width: 800, height: 550, color: '#38bdf8', borderColor: '#38bdf888', bgFill: 'rgba(56, 189, 248, 0.15)' },
      { id: 'z2', name: 'PUMPKIN PATCH', x: 0, y: 550, width: 800, height: 600, color: '#f97316', borderColor: '#f9731688', bgFill: 'rgba(249, 115, 22, 0.15)' },
      { id: 'z3', name: 'HAUNTED GARDEN', x: 0, y: 1150, width: 800, height: 1650, color: '#a855f7', borderColor: '#a855f788', bgFill: 'rgba(168, 85, 247, 0.15)' },
      { id: 'z4', name: 'GRAND HALL', x: 800, y: 0, width: 800, height: 550, color: '#cbd5e1', borderColor: '#cbd5e188', bgFill: 'rgba(203, 213, 225, 0.15)' },
      { id: 'z5', name: 'DINING BALLROOM', x: 800, y: 550, width: 800, height: 2250, color: '#ec4899', borderColor: '#ec489988', bgFill: 'rgba(236, 72, 153, 0.15)' },
      { id: 'z6', name: 'LAB & DUNGEON', x: 1600, y: 0, width: 2000, height: 550, color: '#14b8a6', borderColor: '#14b8a688', bgFill: 'rgba(20, 184, 166, 0.15)' },
      { id: 'z7', name: 'STORAGE BASEMENT', x: 1600, y: 550, width: 2000, height: 600, color: '#b45309', borderColor: '#b4530988', bgFill: 'rgba(180, 83, 9, 0.15)' },
      { id: 'z8', name: 'BOILER CORE', x: 1600, y: 1150, width: 2000, height: 1650, color: '#ef4444', borderColor: '#ef444488', bgFill: 'rgba(239, 68, 68, 0.15)' },
    ];
  }

  if (isToy) {
    return [
      { id: 'z1', name: 'BALLPIT ROOM', x: 0, y: 0, width: 700, height: 650, color: '#f43f5e', borderColor: '#f43f5e88', bgFill: 'rgba(244, 63, 94, 0.15)' },
      { id: 'z2', name: 'SANDBOX & SLIDE', x: 0, y: 650, width: 700, height: 600, color: '#f59e0b', borderColor: '#f59e0b88', bgFill: 'rgba(245, 158, 11, 0.15)' },
      { id: 'z3', name: 'CRAYON ART ROOM', x: 0, y: 1250, width: 700, height: 1550, color: '#a855f7', borderColor: '#a855f788', bgFill: 'rgba(168, 85, 247, 0.15)' },
      { id: 'z4', name: 'ASSEMBLY LINE', x: 700, y: 0, width: 1000, height: 650, color: '#3b82f6', borderColor: '#3b82f688', bgFill: 'rgba(59, 130, 246, 0.15)' },
      { id: 'z5', name: 'LEGO BLOCK MAZE', x: 700, y: 650, width: 1000, height: 2150, color: '#10b981', borderColor: '#10b98188', bgFill: 'rgba(16, 185, 129, 0.15)' },
      { id: 'z6', name: 'QA TESTING LAB', x: 1700, y: 0, width: 1900, height: 650, color: '#06b6d4', borderColor: '#06b6d488', bgFill: 'rgba(6, 182, 212, 0.15)' },
      { id: 'z7', name: 'TOY SHELVES', x: 1700, y: 650, width: 1900, height: 600, color: '#d946ef', borderColor: '#d946ef88', bgFill: 'rgba(217, 70, 239, 0.15)' },
      { id: 'z8', name: 'SHIPPING DOCK', x: 1700, y: 1250, width: 1900, height: 1550, color: '#eab308', borderColor: '#eab30888', bgFill: 'rgba(234, 179, 8, 0.15)' },
    ];
  }

  // Default: Sunny Meadow
  return [
    { id: 'z1', name: 'DENSE FOREST', x: 0, y: 0, width: 1200, height: 933, color: '#22c55e', borderColor: '#22c55e88', bgFill: 'rgba(34, 197, 94, 0.15)' },
    { id: 'z2', name: 'CENTRAL MEADOW', x: 1200, y: 0, width: 1200, height: 1866, color: '#38bdf8', borderColor: '#38bdf888', bgFill: 'rgba(56, 189, 248, 0.15)' },
    { id: 'z3', name: 'STONE RUINS', x: 2400, y: 0, width: 1200, height: 933, color: '#cbd5e1', borderColor: '#cbd5e188', bgFill: 'rgba(203, 213, 225, 0.15)' },
    { id: 'z4', name: 'POND & REEDS', x: 0, y: 933, width: 1200, height: 933, color: '#0ea5e9', borderColor: '#0ea5e988', bgFill: 'rgba(14, 165, 233, 0.15)' },
    { id: 'z5', name: 'WOODEN CABINS', x: 2400, y: 933, width: 1200, height: 933, color: '#f97316', borderColor: '#f9731688', bgFill: 'rgba(249, 115, 22, 0.15)' },
    { id: 'z6', name: 'GRASS FIELDS', x: 0, y: 1866, width: 1200, height: 934, color: '#84cc16', borderColor: '#84cc1688', bgFill: 'rgba(132, 204, 22, 0.15)' },
    { id: 'z7', name: 'HEDGE MAZE', x: 1200, y: 1866, width: 1200, height: 934, color: '#10b981', borderColor: '#10b98188', bgFill: 'rgba(16, 185, 129, 0.15)' },
    { id: 'z8', name: 'ROCK CANYON', x: 2400, y: 1866, width: 1200, height: 934, color: '#d97706', borderColor: '#d9770688', bgFill: 'rgba(217, 119, 6, 0.15)' },
  ];
}

export function getLandmarkZoneAt(map: ReturnType<typeof getMapById>, x: number, y: number): LandmarkZone | null {
  const zones = getLandmarkZonesForMap(map);
  return zones.find(z => x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height) || null;
}

// Unified top-down map rendering function for both HUD minimap and full tactical map modal
function drawTopDownMap(
  mctx: CanvasRenderingContext2D,
  mw: number,
  mh: number,
  currentMap: ReturnType<typeof getMapById>,
  playersList: Player[],
  currentPlayerId: string,
  localMe: Player | undefined,
  meIsSeeker: boolean,
  timestamp: number,
  powerUps: Array<{ id: string; x: number; y: number; type: string; active: boolean }>,
  pings: Array<{ x: number; y: number; radius: number; life: number; color: string }>,
  cameraRef: React.MutableRefObject<{ x: number; y: number }>,
  viewportWidth: number,
  viewportHeight: number,
  zoomVal: number,
  roomGameState: string,
  isLargeView = false
) {
  mctx.clearRect(0, 0, mw, mh);

  // 1. Dark high-contrast tactical grid background
  mctx.fillStyle = '#090d16';
  mctx.fillRect(0, 0, mw, mh);

  const scaleX = mw / MAP_WIDTH;
  const scaleY = mh / MAP_HEIGHT;

  // 2. Draw Landmark Zone regions with shaded fills & borders
  const zones = getLandmarkZonesForMap(currentMap);
  mctx.textAlign = 'center';
  mctx.textBaseline = 'middle';

  zones.forEach(zone => {
    const zx = zone.x * scaleX;
    const zy = zone.y * scaleY;
    const zw = zone.width * scaleX;
    const zh = zone.height * scaleY;

    // Zone background fill
    mctx.fillStyle = zone.bgFill;
    mctx.fillRect(zx, zy, zw, zh);

    // Zone boundary outline
    mctx.strokeStyle = zone.borderColor;
    mctx.lineWidth = isLargeView ? 1.5 : 0.75;
    mctx.setLineDash([3, 3]);
    mctx.strokeRect(zx, zy, zw, zh);
    mctx.setLineDash([]);

    // Zone name label
    mctx.font = isLargeView ? '800 11px monospace' : '800 7.5px monospace';
    mctx.fillStyle = zone.color;
    mctx.globalAlpha = 0.85;
    mctx.fillText(zone.name, zx + zw / 2, zy + zh / 2);
    mctx.globalAlpha = 1.0;
  });

  // 3. Draw Map Obstacles & Terrain Features
  currentMap.obstacles.forEach(obs => {
    const ox = obs.x * scaleX;
    const oy = obs.y * scaleY;
    const ow = obs.width * scaleX;
    const oh = obs.height * scaleY;

    if (obs.type === 'water') {
      mctx.fillStyle = '#38bdf8';
      mctx.fillRect(ox, oy, ow, oh);
    } else if (obs.type === 'bridge') {
      mctx.fillStyle = '#d97706';
      mctx.fillRect(ox, oy, ow, oh);
    } else if (obs.type === 'wall' || obs.type === 'crate') {
      mctx.fillStyle = '#cbd5e1';
      mctx.fillRect(ox, oy, ow, oh);
    } else if (obs.type === 'tree' || obs.type === 'rock' || obs.type === 'barrel') {
      mctx.fillStyle = obs.type === 'tree' ? '#15803d' : '#64748b';
      mctx.beginPath();
      mctx.arc(ox + ow / 2, oy + oh / 2, Math.max(1.5, ow / 2), 0, Math.PI * 2);
      mctx.fill();
    } else if (obs.type === 'bush') {
      mctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
      mctx.fillRect(ox, oy, ow, oh);
      mctx.strokeStyle = '#22c55e';
      mctx.lineWidth = 0.5;
      mctx.strokeRect(ox, oy, ow, oh);
    }
  });

  // 4. Draw Special Hiding Spots (Golden/Amber markers)
  if (currentMap.specialHidingSpots) {
    currentMap.specialHidingSpots.forEach(spot => {
      const sx = (spot.x + spot.width / 2) * scaleX;
      const sy = (spot.y + spot.height / 2) * scaleY;
      mctx.fillStyle = '#f59e0b';
      mctx.beginPath();
      mctx.arc(sx, sy, isLargeView ? 4 : 2.5, 0, Math.PI * 2);
      mctx.fill();

      mctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      mctx.lineWidth = 1;
      mctx.beginPath();
      mctx.arc(sx, sy, isLargeView ? 8 : 5, 0, Math.PI * 2);
      mctx.stroke();
    });
  }

  // 5. Draw Powerups on map
  powerUps.forEach(pu => {
    if (!pu.active) return;
    const px = pu.x * scaleX;
    const py = pu.y * scaleY;
    mctx.fillStyle = pu.type === 'speed' ? '#eab308' : pu.type === 'jump' ? '#38bdf8' : '#a855f7';
    mctx.beginPath();
    mctx.arc(px, py, isLargeView ? 4 : 2.5, 0, Math.PI * 2);
    mctx.fill();
  });

  // 6. Draw Camera Viewport Rectangle (Cyan framed box showing active main viewport)
  if (viewportWidth > 0 && viewportHeight > 0) {
    const viewW = viewportWidth / zoomVal;
    const viewH = viewportHeight / zoomVal;
    const camX = cameraRef.current.x - viewW / 2;
    const camY = cameraRef.current.y - viewH / 2;

    mctx.strokeStyle = '#38bdf8';
    mctx.lineWidth = isLargeView ? 2 : 1.2;
    mctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    mctx.fillRect(camX * scaleX, camY * scaleY, viewW * scaleX, viewH * scaleY);
    mctx.strokeRect(camX * scaleX, camY * scaleY, viewW * scaleX, viewH * scaleY);
  }

  // 7. Draw Players on map
  playersList.forEach(pl => {
    let isVisibleOnMini = true;
    if (pl.role === 'hider' && pl.status === 'alive') {
      if (roomGameState === 'playing' || roomGameState === 'hiding') {
        if (pl.id !== currentPlayerId) {
          if (meIsSeeker) {
            isVisibleOnMini = false; // Seeker doesn't see alive hiders on tactical map
          } else if (localMe?.status === 'found') {
            isVisibleOnMini = true;
          } else {
            isVisibleOnMini = false;
          }
        }
      }
    }

    if (isVisibleOnMini) {
      const pulse = Math.sin(timestamp / 120) > 0;
      const px = pl.x * scaleX;
      const py = pl.y * scaleY;

      if (pl.id === currentPlayerId) {
        // SELF: Bright cyan pulsing ring with movement direction arrow
        mctx.fillStyle = '#38bdf8';
        mctx.beginPath();
        mctx.arc(px, py, isLargeView ? 6 : 4.5, 0, Math.PI * 2);
        mctx.fill();

        if (pulse) {
          mctx.strokeStyle = '#0284c7';
          mctx.lineWidth = isLargeView ? 2 : 1.5;
          mctx.beginPath();
          mctx.arc(px, py, isLargeView ? 11 : 8, 0, Math.PI * 2);
          mctx.stroke();
        }

        // Direction pointer if player has movement angle
        if (pl.angle !== undefined) {
          mctx.strokeStyle = '#38bdf8';
          mctx.lineWidth = isLargeView ? 2.5 : 1.8;
          mctx.beginPath();
          mctx.moveTo(px, py);
          mctx.lineTo(px + Math.cos(pl.angle) * (isLargeView ? 12 : 8), py + Math.sin(pl.angle) * (isLargeView ? 12 : 8));
          mctx.stroke();
        }

        if (isLargeView) {
          mctx.font = '900 10px sans-serif';
          mctx.fillStyle = '#ffffff';
          mctx.fillText('YOU', px, py - 12);
        }
      } else if (pl.role === 'seeker') {
        // SEEKER: Red pulsing dot with alert ring
        mctx.fillStyle = '#ef4444';
        mctx.beginPath();
        mctx.arc(px, py, isLargeView ? 5.5 : 4, 0, Math.PI * 2);
        mctx.fill();

        if (pulse) {
          mctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
          mctx.lineWidth = isLargeView ? 2 : 1.5;
          mctx.beginPath();
          mctx.arc(px, py, isLargeView ? 10 : 8, 0, Math.PI * 2);
          mctx.stroke();
        }

        if (isLargeView) {
          mctx.font = '900 9px sans-serif';
          mctx.fillStyle = '#f87171';
          mctx.fillText('SEEKER', px, py - 10);
        }
      } else {
        // OTHER PLAYERS
        mctx.fillStyle = pl.color || '#a855f7';
        mctx.beginPath();
        mctx.arc(px, py, isLargeView ? 4.5 : 3, 0, Math.PI * 2);
        mctx.fill();
      }
    }
  });

  // 8. Draw Active Tactical Pings
  pings.forEach(ping => {
    mctx.save();
    mctx.strokeStyle = ping.color;
    mctx.globalAlpha = Math.max(0, ping.life);
    mctx.lineWidth = isLargeView ? 3 : 2;
    mctx.beginPath();
    mctx.arc(ping.x * scaleX, ping.y * scaleY, ping.radius * scaleX * 1.8, 0, Math.PI * 2);
    mctx.stroke();
    mctx.restore();
  });

  // 9. Outer border frame
  mctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  mctx.lineWidth = 1.5;
  mctx.strokeRect(0, 0, mw, mh);
}

interface GameViewProps {
  room: Room;
  currentPlayerId: string;
  socket?: WebSocket | null;
  onSendMovement: (x: number, y: number) => void;
  onSendTag: (hiderId: string) => void;
  onReturnToLobby: () => void;
  onPlayAgain: () => void;
  announcements: string[];
  onSendEmote: (emote: string) => void;
  lastEmoteEvent: { playerId: string; emote: string; timestamp: number } | null;
  onLeave: () => void;
  ping?: number;
  packetRate?: number;
}

// Pooled particle shape interface
interface GameParticle {
  active?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  decay: number;
  type: 'dust' | 'leaf' | 'spark' | 'confetti' | 'trail';
  playerId?: string;
  originalSize?: number;
}

function GameView({
  room,
  currentPlayerId,
  socket,
  onSendMovement,
  onSendTag,
  onReturnToLobby,
  onPlayAgain,
  announcements,
  onSendEmote,
  lastEmoteEvent,
  onLeave,
  ping = 0,
  packetRate = 0,
}: GameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game loop controls
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Performance telemetry refs & overlay toggle
  const cpuUpdateTimeRef = useRef(0);
  const renderTimeRef = useRef(0);
  const frameTimeRef = useRef(0);
  const lastPerfUpdateTimeRef = useRef(0);
  const [perfStats, setPerfStats] = useState({ cpu: 0, render: 0, frame: 0 });
  const [showPerfOverlay, setShowPerfOverlay] = useState(() => {
    try {
      const saved = localStorage.getItem('hide_seek_perf_overlay');
      return saved === 'true'; // Defaults to hidden (false) unless saved as true
    } catch (e) {
      return false;
    }
  });

  const handleTogglePerfOverlay = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    soundManager.playClick();
    setShowPerfOverlay(prev => {
      const next = !prev;
      try {
        localStorage.setItem('hide_seek_perf_overlay', next.toString());
      } catch (err) {}
      return next;
    });
  };

  const handleClosePerfOverlay = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    soundManager.playClick();
    setShowPerfOverlay(false);
    try {
      localStorage.setItem('hide_seek_perf_overlay', 'false');
    } catch (err) {}
  };
  const renderedObstaclesCountRef = useRef(0);
  const viewportSizeRef = useRef({ width: window.innerWidth, height: window.innerHeight });
  const lastStaminaUiUpdateRef = useRef(0);

  // Real-time Prediction, Interpolation, and Extrapolation tracking
  const remoteTargetsRef = useRef<Record<string, { x: number; y: number; vx: number; vy: number; lastUpdate: number }>>({});
  const lastRoomPlayersRef = useRef<Record<string, Player>>({});
  const lastGameStateRef = useRef<string>('');
  const lastSentTimeRef = useRef<number>(0);
  const lastSentPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const localVelocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // FPS tracking for auto quality adjusting
  const fpsRef = useRef(60);
  const frameCountRef = useRef(0);
  const lastFpsCheckTimeRef = useRef(0);
  const [lowGraphicsMode, setLowGraphicsMode] = useState(false);

  // In-game Settings Panel state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Map asset verification & Scene state
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const canvasInitializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    try {
      const activeMapId = room.activeMapId || room.settings.mapId || 'meadow';
      const map = getMapById(activeMapId);
      
      if (!map || !map.obstacles) {
        throw new Error(`Map data not found for map ID: ${activeMapId}`);
      }

      console.log("Map loaded:", activeMapId, map);
      console.log("Scene created", {
        mapWidth: MAP_WIDTH,
        mapHeight: MAP_HEIGHT,
        obstaclesCount: map.obstacles.length
      });

      // Verify or adjust local player spawn point inside valid boundaries
      const p = room.players[currentPlayerId];
      if (p) {
        let px = p.x;
        let py = p.y;
        
        const isOutOfBounds = typeof px !== 'number' || typeof py !== 'number' ||
          px < 50 || px > MAP_WIDTH - 50 || py < 50 || py > MAP_HEIGHT - 50;
        const isColliding = checkCollision(px, py, PLAYER_RADIUS, map).collided;

        if (isOutOfBounds || isColliding) {
          console.warn(`Player spawn failed/collided at (${px}, ${py}), retrying automatic safe spawn positioning...`);
          let safeFound = false;
          let safeX = map.width / 2;
          let safeY = map.height / 2;

          for (let radius = 20; radius <= 800; radius += 40) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
              const tx = map.width / 2 + Math.cos(angle) * radius;
              const ty = map.height / 2 + Math.sin(angle) * radius;
              if (tx >= 80 && tx <= map.width - 80 && ty >= 80 && ty <= map.height - 80) {
                if (!checkCollision(tx, ty, PLAYER_RADIUS, map).collided) {
                  safeX = tx;
                  safeY = ty;
                  safeFound = true;
                  break;
                }
              }
            }
            if (safeFound) break;
          }

          px = safeX;
          py = safeY;
          if (localPlayersRef.current[p.id]) {
            localPlayersRef.current[p.id].x = px;
            localPlayersRef.current[p.id].y = py;
          }
        }

        console.log("Player spawned:", p.id, p.role, { x: px, y: py });

        // Attach camera immediately to local player
        cameraRef.current = { x: px, y: py };
        console.log("Camera attached:", p.id, cameraRef.current);
      }

      if (mounted) {
        setIsSceneReady(true);
        setAssetError(null);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to load map assets";
      console.error("Asset loading error:", msg);
      if (mounted) {
        setAssetError(msg);
      }
    }

    return () => {
      mounted = false;
    };
  }, [room.activeMapId, room.settings.mapId, currentPlayerId]);

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p += Math.floor(Math.random() * 20) + 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsLoadingAssets(false);
          setIsSceneReady(true);
        }, 200);
      }
      setLoadingProgress(p);
    }, 40);
    return () => clearInterval(interval);
  }, []);
  const [sfxVol, setSfxVol] = useState(soundManager.getSfxVolume());
  const [musicVol, setMusicVol] = useState(soundManager.getMusicVolume());

  // Fullscreen management states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [needsFullscreenClick, setNeedsFullscreenClick] = useState(false);

  // Mobile virtual joystick (360° Analog Multi-touch) & sprint state
  const [isMobile, setIsMobile] = useState(false);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const [joystickUI, setJoystickUI] = useState<{ active: boolean; startX: number; startY: number; currX: number; currY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    currX: 0,
    currY: 0
  });
  const mobileSprintActive = useRef(false);
  const [uiMobileSprintState, setUiMobileSprintState] = useState(false);

  // Stamina state for Hiders
  const staminaRef = useRef(100);
  const [stamina, setStamina] = useState(100);
  const [isExhausted, setIsExhausted] = useState(false);

  // Camera interpolation viewport variables (Dynamic Zoom baseline 0.85)
  const zoomRef = useRef(0.85);
  const [isCameraPanelMinimized, setIsCameraPanelMinimized] = useState(false);

  const userZoomTargetRef = useRef<number>(() => {
    try {
      const saved = localStorage.getItem('hide_seek_zoom_mult');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) return Math.max(0.5, Math.min(2.0, parsed));
      }
    } catch (e) {}
    return 1.0;
  });
  const userZoomCurrentRef = useRef<number>(userZoomTargetRef.current);
  const [zoomLevelDisplay, setZoomLevelDisplay] = useState<number>(Math.round(userZoomTargetRef.current * 100));
  const [zoomMode, setZoomMode] = useState<'normal' | 'wide' | 'custom'>(() => {
    const val = userZoomTargetRef.current;
    if (Math.abs(val - 1.0) < 0.05) return 'normal';
    if (Math.abs(val - 0.5) < 0.05) return 'wide';
    return 'custom';
  });

  const pinchInitialDistRef = useRef<number | null>(null);
  const pinchInitialTargetRef = useRef<number>(1.0);

  const applyUserZoom = (mult: number, modeName?: 'normal' | 'wide' | 'custom') => {
    soundManager.playClick();
    const clamped = Math.max(0.5, Math.min(2.0, mult));
    userZoomTargetRef.current = clamped;
    setZoomLevelDisplay(Math.round(clamped * 100));

    let determinedMode = modeName;
    if (!determinedMode) {
      if (Math.abs(clamped - 1.0) < 0.05) determinedMode = 'normal';
      else if (Math.abs(clamped - 0.5) < 0.05) determinedMode = 'wide';
      else determinedMode = 'custom';
    }
    setZoomMode(determinedMode);

    try {
      localStorage.setItem('hide_seek_zoom_mult', clamped.toString());
    } catch (e) {}
  };

  const zoomIn = () => applyUserZoom(userZoomTargetRef.current + 0.25);
  const zoomOut = () => applyUserZoom(userZoomTargetRef.current - 0.25);
  const resetZoom = () => applyUserZoom(1.0, 'normal');
  const setNormalView = () => applyUserZoom(1.0, 'normal');
  const setWideView = () => applyUserZoom(0.5, 'wide');
  const minimizePanel = () => {
    soundManager.playClick();
    setIsCameraPanelMinimized(true);
  };
  const restorePanel = () => {
    soundManager.playClick();
    setIsCameraPanelMinimized(false);
  };

  const handleZoomIn = zoomIn;
  const handleZoomOut = zoomOut;
  const handleZoomReset = resetZoom;
  const handleNormalView = setNormalView;
  const handleWideView = setWideView;

  const cameraRef = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const lastDiagTimeRef = useRef(0);

  // Sound Warning tracking states
  const lastTimerWarningRef = useRef<number | null>(null);
  const lastCountdownWarningRef = useRef<number | null>(null);

  // Footstep sound, sprint state, and camera shake refs
  const lastFootstepTimeRef = useRef<number>(0);
  const prevSprintingRef = useRef<boolean>(false);
  const shakeAmountRef = useRef<number>(0);
  const triggerCameraShake = (intensity = 10) => {
    shakeAmountRef.current = Math.max(shakeAmountRef.current, intensity);
  };

  // Active Map based on room settings
  const currentMap = getMapById(room.activeMapId || room.settings.mapId);

  // States for visual feedback overlays, progression rewards, and copy statistics
  const [justTaggedEffect, setJustTaggedEffect] = useState(false);
  const [copiedStats, setCopiedStats] = useState(false);
  const [matchRewards, setMatchRewards] = useState<MatchRewardCalculation | null>(null);

  // Performance stats tracking refs
  const playersStatsTrackerRef = useRef<Record<string, { distanceTraveled: number; timeSpentHiding: number }>>({});
  const lastFramePositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const lastPlayerStatusRef = useRef<'alive' | 'found' | 'disconnected' | undefined>(undefined);

  // Particle pool ref (250 pre-allocated objects to eliminate GC allocations during 60FPS loop)
  const POOL_SIZE = 250;
  const particlePoolRef = useRef<GameParticle[]>(
    Array.from({ length: 250 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      color: '#ffffff',
      size: 2,
      alpha: 1,
      life: 1,
      decay: 0.05,
      type: 'dust'
    }))
  );

  const lastInputVectorRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Minimap toggling, camera focus, and map pings
  const [isMinimapOpen, setIsMinimapOpen] = useState(true);
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [isTimerOverlayExpanded, setIsTimerOverlayExpanded] = useState(false);

  // Unified Input Manager Hook (Gates movement based on game state & handles input listening)
  const localMePlayer = room.players[currentPlayerId];
  const {
    keysPressedRef: keysPressed,
    joystickVectorRef,
    isMouseDownRef,
    mousePosRef,
    canMove: canLocalMove,
    getMovementInput
  } = useInputManager({
    gameState: room.gameState,
    role: localMePlayer?.role,
    status: localMePlayer?.status,
    isMobile,
    onToggleMap: () => setIsFullMapOpen(prev => !prev),
    onToggleTimer: () => setIsTimerOverlayExpanded(prev => !prev),
    onCloseOverlays: () => {
      setIsFullMapOpen(false);
      setIsTimerOverlayExpanded(false);
    }
  });
  const [isHidingBannerDismissed, setIsHidingBannerDismissed] = useState(false);
  const fullMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraFocusRef = useRef<'self' | string | { x: number; y: number }>('self');
  const [hasCustomCamera, setHasCustomCamera] = useState(false);
  const [followedPlayerId, setFollowedPlayerId] = useState<string | null>(null);
  const pingsRef = useRef<{ x: number; y: number; radius: number; maxRadius: number; color: string; life: number }[]>([]);

  // Reset hiding banner on phase start & ensure gameplay scene is active
  useEffect(() => {
    if (room.gameState === 'hiding') {
      console.log('[GAME STATE] Entered Hiding phase - movement enabled for hiders!');
      setIsLoadingAssets(false);
      setIsSceneReady(true);
      setIsHidingBannerDismissed(false);
    } else if (room.gameState === 'playing') {
      console.log('[GAME STATE] Transitioning to active Gameplay state - seekers released!');
      setIsLoadingAssets(false);
      setIsSceneReady(true);
      setIsHidingBannerDismissed(true);
    }
  }, [room.gameState]);

  // Sound Warning triggers for countdown
  useEffect(() => {
    if (room.gameState === 'hiding') {
      if (room.hideCountdown <= 5 && room.hideCountdown > 0) {
        if (lastCountdownWarningRef.current !== room.hideCountdown) {
          lastCountdownWarningRef.current = room.hideCountdown;
          soundManager.playClick();
        }
      }
    } else if (room.gameState === 'playing') {
      if (room.matchTimer <= 10 && room.matchTimer > 0) {
        if (lastTimerWarningRef.current !== room.matchTimer) {
          lastTimerWarningRef.current = room.matchTimer;
          soundManager.playClick();
        }
      } else if (room.matchTimer === 30) {
        if (lastTimerWarningRef.current !== 30) {
          lastTimerWarningRef.current = 30;
          soundManager.playClick();
        }
      }
    }
  }, [room.gameState, room.hideCountdown, room.matchTimer]);

  const handleMinimapInteraction = (clientX: number, clientY: number, targetCanvas?: HTMLCanvasElement | null) => {
    const canvas = targetCanvas || minimapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const relativeX = (clientX - rect.left) / rect.width;
    const relativeY = (clientY - rect.top) / rect.height;

    const targetX = Math.max(0, Math.min(relativeX * MAP_WIDTH, MAP_WIDTH));
    const targetY = Math.max(0, Math.min(relativeY * MAP_HEIGHT, MAP_HEIGHT));

    // Centering camera focus
    cameraFocusRef.current = { x: targetX, y: targetY };
    setHasCustomCamera(true);

    // Play a neat click sound
    soundManager.playClick();
    triggerCameraShake(4);

    // Create a local ping particle/radar ring
    const localPlayer = room.players[currentPlayerId];
    const pingColor = localPlayer?.color || '#38bdf8';
    
    pingsRef.current.push({
      x: targetX,
      y: targetY,
      radius: 5,
      maxRadius: 60,
      color: pingColor,
      life: 1.0
    });
  };

  // Keyboard shortcut listener for 'M' / 'm' key to toggle full map modal
  useEffect(() => {
    const handleMapToggleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'm' || e.key === 'M') {
        soundManager.playClick();
        setIsFullMapOpen(prev => !prev);
      } else if (e.key === 'Escape' && isFullMapOpen) {
        soundManager.playClick();
        setIsFullMapOpen(false);
      }
    };
    window.addEventListener('keydown', handleMapToggleKey);
    return () => window.removeEventListener('keydown', handleMapToggleKey);
  }, [isFullMapOpen]);

  // Local copy of players for instant client-side prediction
  const localPlayersRef = useRef<Record<string, Player>>({ ...room.players });

  // Real-time active player emotes tracking ref
  const activeEmotesRef = useRef<Record<string, { emote: string; expiry: number }>>({});

  // Emotes list to select from
  const EMOTES = [
    { label: '👋 Wave', emoji: '👋' },
    { label: '😂 Laugh', emoji: '😂' },
    { label: '❤️ Love', emoji: '❤️' },
    { label: '😅 Oof', emoji: '😅' },
    { label: '😭 Cry', emoji: '😭' },
    { label: '😡 Rage', emoji: '😡' },
    { label: '🏆 GG', emoji: '🏆' },
    { label: '😮 Wow', emoji: '😮' },
  ];

  // Map theme styles for cartoon canvas rendering
  const theme = (() => {
    const mId = room.activeMapId || room.settings.mapId || 'meadow';
    if (mId === 'graveyard') {
      return {
        ground: '#2a1b3d',
        grid: '#36234e',
        centerBg: '#1a1026',
        centerBorder: '#4c1d95',
        wallBg: '#475569',
        wallBorder: '#334155',
        crateBg: '#581c87',
        crateBorder: '#3b0764',
        rockBg: '#64748b',
        rockHighlight: '#94a3b8',
        barrelBg: '#f97316',
        barrelRing: '#ea580c',
        treeLeaf1: '#0f172a',
        treeLeaf2: '#1e1b4b',
        treeLeaf3: '#311042',
        bushBg: 'rgba(124, 58, 237, 0.72)',
        bushBorder: 'rgba(167, 139, 250, 0.9)',
        bushFlower: '#f43f5e',
      };
    }
    if (mId === 'toybox') {
      return {
        ground: '#fed7aa',
        grid: '#ffedd5',
        centerBg: '#bfdbfe',
        centerBorder: '#60a5fa',
        wallBg: '#38bdf8',
        wallBorder: '#0284c7',
        crateBg: '#fb7185',
        crateBorder: '#e11d48',
        rockBg: '#4ade80',
        rockHighlight: '#86efac',
        barrelBg: '#fbbf24',
        barrelRing: '#d97706',
        treeLeaf1: '#a78bfa',
        treeLeaf2: '#c084fc',
        treeLeaf3: '#e9d5ff',
        bushBg: 'rgba(34, 197, 94, 0.75)',
        bushBorder: 'rgba(134, 239, 172, 0.9)',
        bushFlower: '#38bdf8',
      };
    }
    // Sunny Meadow (Default)
    return {
      ground: '#a3e635',
      grid: '#bef264',
      centerBg: '#fef08a',
      centerBorder: '#facc15',
      wallBg: '#f97316',
      wallBorder: '#ea580c',
      crateBg: '#b45309',
      crateBorder: '#78350f',
      rockBg: '#cbd5e1',
      rockHighlight: '#f1f5f9',
      barrelBg: '#eab308',
      barrelRing: '#ca8a04',
      treeLeaf1: '#22c55e',
      treeLeaf2: '#16a34a',
      treeLeaf3: '#15803d',
      bushBg: 'rgba(16, 185, 129, 0.72)',
      bushBorder: 'rgba(52, 211, 153, 0.9)',
      bushFlower: '#f472b6',
    };
  })();

  // Fullscreen, prediction, interpolation, and extrapolation synchronization
  const userExitedFullscreenRef = useRef(false);

  const enterFullscreen = () => {
    if (userExitedFullscreenRef.current) return;
    const elem = document.documentElement;
    console.log("[FULLSCREEN EVENT] Requesting full screen display...");
    const req = elem.requestFullscreen || (elem as any).webkitRequestFullscreen || (elem as any).mozRequestFullScreen || (elem as any).msRequestFullscreen;
    if (req) {
      try {
        const promise = req.call(elem);
        if (promise && typeof promise.then === 'function') {
          promise.then(() => {
            console.log("[FULLSCREEN EVENT] Fullscreen active.");
            setIsFullscreen(true);
            setNeedsFullscreenClick(false);
          }).catch((err: any) => {
            console.warn("[FULLSCREEN EVENT] Fullscreen request blocked by browser:", err);
            setIsFullscreen(false);
            setNeedsFullscreenClick(true);
          });
        } else {
          setIsFullscreen(true);
          setNeedsFullscreenClick(false);
        }
      } catch (err) {
        console.warn("[FULLSCREEN EVENT] Error triggering fullscreen:", err);
        setNeedsFullscreenClick(true);
      }
    } else {
      console.warn("[FULLSCREEN EVENT] Fullscreen API unavailable on this device.");
      setNeedsFullscreenClick(true);
    }
  };

  const exitFullscreen = () => {
    userExitedFullscreenRef.current = true;
    console.log("[FULLSCREEN EVENT] Exiting fullscreen mode...");
    if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement) {
      const exit = document.exitFullscreen || (document as any).webkitExitFullscreen || (document as any).mozCancelFullScreen || (document as any).msExitFullscreen;
      if (exit) {
        try {
          const promise = exit.call(document);
          if (promise && typeof promise.then === 'function') {
            promise.then(() => setIsFullscreen(false)).catch(err => console.warn(err));
          } else {
            setIsFullscreen(false);
          }
        } catch (e) {}
      }
    } else {
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    if (room.gameState === 'hiding' || room.gameState === 'playing') {
      if (!userExitedFullscreenRef.current && !document.fullscreenElement) {
        enterFullscreen();
      }
    }
  }, [room.gameState]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement);
      console.log("[FULLSCREEN EVENT] Document fullscreen state changed:", isCurrentlyFullscreen);
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && !userExitedFullscreenRef.current) {
        setNeedsFullscreenClick(true);
      } else if (isCurrentlyFullscreen) {
        setNeedsFullscreenClick(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Sync and reconcile local players with server room players
  useEffect(() => {
    const now = Date.now();
    const prevPlayers = lastRoomPlayersRef.current;
    
    Object.values(room.players).forEach(p => {
      if (p.id === currentPlayerId) {
        // Local Player prediction reconciliation
        let localP = localPlayersRef.current[p.id];
        if (!localP) {
          localP = { ...p };
          localPlayersRef.current[p.id] = localP;
          console.log(`[PLAYER INIT] Local player created in localRef: id=${p.id}, role=${p.role}, status=${p.status}, x=${p.x}, y=${p.y}`);
        }

        // Unconditionally keep player role, status, color, and name in sync
        const roleChanged = localP.role !== p.role;
        const statusChanged = localP.status !== p.status;
        localP.role = p.role;
        localP.status = p.status;
        localP.color = p.color;
        localP.name = p.name;

        const dx = p.x - localP.x;
        const dy = p.y - localP.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Reconcile/snap if server state is significantly different (e.g. walk-back, tagged, or phase change)
        const forcedSync = roleChanged || statusChanged || room.gameState !== lastGameStateRef.current;
        if (dist > 30 || forcedSync) {
          console.log(`[STATE SYNC] Local player position/state reconciled. Role=${p.role}, Status=${p.status}, Pos=(${p.x}, ${p.y})`);
          localP.x = p.x;
          localP.y = p.y;
          if (cameraFocusRef.current === 'self') {
            cameraRef.current = { x: p.x, y: p.y };
          }
        } else if (dist > 2) {
          // Smoothly reconcile small position drifts (server reconciliation)
          localP.x += (p.x - localP.x) * 0.15;
          localP.y += (p.y - localP.y) * 0.15;
        }
      } else {
        // Remote Player: Keep track of target coordinates & speed for extrapolation LERP
        const prevP = prevPlayers[p.id];
        const prevTarget = remoteTargetsRef.current[p.id];
        
        // Skip overwriting remote target if high-frequency WebSocket updates were received recently (< 300ms)
        const isRecentlyUpdatedViaWS = prevTarget && (now - prevTarget.lastUpdate < 300);
        
        if (!isRecentlyUpdatedViaWS) {
          let vx = 0;
          let vy = 0;
          if (prevP) {
            const dt = (now - (prevTarget?.lastUpdate || (now - 100))) / 1000;
            if (dt > 0.01 && dt < 0.5) {
              const rawVx = (p.x - prevP.x) / dt;
              const rawVy = (p.y - prevP.y) / dt;
              const speed = Math.hypot(rawVx, rawVy);
              const maxSpeed = 500;
              const scale = speed > maxSpeed ? maxSpeed / speed : 1;
              vx = rawVx * scale;
              vy = rawVy * scale;
            }
          }
          
          remoteTargetsRef.current[p.id] = {
            x: p.x,
            y: p.y,
            vx,
            vy,
            lastUpdate: now
          };
        }
        
        if (!localPlayersRef.current[p.id]) {
          localPlayersRef.current[p.id] = { ...p };
        } else {
          // Instant sync of non-spatial metadata
          localPlayersRef.current[p.id].status = p.status;
          localPlayersRef.current[p.id].role = p.role;
          localPlayersRef.current[p.id].color = p.color;
          localPlayersRef.current[p.id].accessory = p.accessory;
          localPlayersRef.current[p.id].score = p.score;
        }
      }
    });
    
    // Clean up players that left
    Object.keys(localPlayersRef.current).forEach(id => {
      if (!room.players[id]) {
        delete localPlayersRef.current[id];
        delete remoteTargetsRef.current[id];
      }
    });

    // Detect if local player was tagged
    const prevMe = prevPlayers[currentPlayerId];
    const me = room.players[currentPlayerId];
    if (prevMe && prevMe.status === 'alive' && me && me.status === 'found') {
      triggerCameraShake(24);
      setJustTaggedEffect(true);
      setTimeout(() => setJustTaggedEffect(false), 1200);
    }

    // Detect if ANY player was tagged (found) to trigger a dynamic screen-shake!
    Object.values(room.players).forEach(p => {
      const prevP = prevPlayers[p.id];
      if (prevP && prevP.status === 'alive' && p.status === 'found') {
        if (p.id !== currentPlayerId) {
          triggerCameraShake(14);
        }
      }
    });

    lastRoomPlayersRef.current = { ...room.players };
    lastGameStateRef.current = room.gameState;
  }, [room.players, room.gameState, currentPlayerId]);

  // Trigger match start / end synthesized audio, camera shake, and progression calculation
  useEffect(() => {
    if (room.gameState === 'playing') {
      soundManager.playMatchStart();
      triggerCameraShake(16);
      setMatchRewards(null);
    } else if (room.gameState === 'hiding') {
      triggerCameraShake(8);
    } else if (room.gameState === 'ended') {
      soundManager.playMatchEnd();
      triggerCameraShake(12);

      if (!matchRewards) {
        const localMe = room.players[currentPlayerId];
        const isSeeker = localMe?.role === 'seeker';
        const isWin = (isSeeker && room.stats?.winner === 'seekers') || (!isSeeker && room.stats?.winner === 'hiders');
        const survivalTime = localMe?.survivalTime || room.stats?.duration || 0;
        const catches = isSeeker ? (room.stats?.seekerFoundCounts?.[currentPlayerId] || 0) : 0;
        const distanceMoved = Math.round((playersStatsTrackerRef.current[currentPlayerId]?.distanceTraveled || 250) / 24);

        const calculated = recordMatchEnd({
          isWin,
          isSeeker,
          survivalTime,
          catches,
          distanceMoved,
        });

        setMatchRewards(calculated);

        addMatchHistoryEntry({
          mapName: (room.activeMapId || room.settings.mapId) === 'graveyard' ? 'Warehouse Escape' : 'Forest Camp',
          role: isSeeker ? 'seeker' : 'hider',
          result: isWin ? 'win' : 'loss',
          survivalTime: Math.floor(survivalTime),
          catches,
          coinsEarned: calculated.coinsEarned,
          xpEarned: calculated.xpEarned,
        });
      }
    }
  }, [room.gameState, currentPlayerId]);

  // Sync incoming emotes
  useEffect(() => {
    if (lastEmoteEvent) {
      activeEmotesRef.current[lastEmoteEvent.playerId] = {
        emote: lastEmoteEvent.emote,
        expiry: lastEmoteEvent.timestamp + 3000, // active for 3 seconds
      };
    }
  }, [lastEmoteEvent]);

  // Handle direct WebSocket messages for ultra-high-frequency player movement (60FPS without React re-renders)
  useEffect(() => {
    if (!socket) return;
    const handleMessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'players-moved' || msg.type === 'player-moved') {
          const movements = msg.type === 'player-moved'
            ? { [msg.payload.playerId]: { x: msg.payload.x, y: msg.payload.y } }
            : (msg.payload as Record<string, { x: number; y: number }>);
          const now = Date.now();

          Object.entries(movements).forEach(([pId, pos]) => {
            if (pId === currentPlayerId) {
              const localMe = localPlayersRef.current[pId];
              if (localMe) {
                const dx = pos.x - localMe.x;
                const dy = pos.y - localMe.y;
                // Reconcile client position only on massive server desync (>80px teleport)
                if (dx * dx + dy * dy > 6400) {
                  localMe.x = pos.x;
                  localMe.y = pos.y;
                }
              }
              return;
            }

            const prevTarget = remoteTargetsRef.current[pId];
            let vx = 0;
            let vy = 0;
            if (prevTarget) {
              const dt = (now - prevTarget.lastUpdate) / 1000;
              if (dt > 0.005 && dt < 0.5) {
                const rawVx = (pos.x - prevTarget.x) / dt;
                const rawVy = (pos.y - prevTarget.y) / dt;
                const speed = Math.hypot(rawVx, rawVy);
                const maxSpeed = 500;
                const scale = speed > maxSpeed ? maxSpeed / speed : 1;
                const clampedVx = rawVx * scale;
                const clampedVy = rawVy * scale;

                // Exponential velocity smoothing to prevent sudden velocity spikes
                vx = prevTarget.vx * 0.35 + clampedVx * 0.65;
                vy = prevTarget.vy * 0.35 + clampedVy * 0.65;
              }
            }

            remoteTargetsRef.current[pId] = {
              x: pos.x,
              y: pos.y,
              vx,
              vy,
              lastUpdate: now
            };
          });
        }
      } catch (err) {}
    };

    socket.addEventListener('message', handleMessage);
    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, currentPlayerId]);

  // Track container viewport dimensions with ResizeObserver and orientationchange support
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      let w = window.innerWidth;
      let h = window.innerHeight;
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          w = rect.width;
          h = rect.height;
        }
      }
      w = Math.max(Math.floor(w), 320);
      h = Math.max(Math.floor(h), 240);

      if (viewportSizeRef.current.width !== w || viewportSizeRef.current.height !== h) {
        console.log("[RESIZE EVENT] Viewport resized:", `${w}x${h}`);
        viewportSizeRef.current = { width: w, height: h };
      }
    };

    updateSize();
    const container = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateSize());
      observer.observe(container);
    }

    const handleResize = () => updateSize();
    const handleOrientation = () => {
      updateSize();
      setTimeout(updateSize, 100);
      setTimeout(updateSize, 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // WebGL / Canvas 2D Graphics Context Recovery
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.error("[GRAPHICS CONTEXT ERROR] Graphics context was lost!");
      setAssetError("Graphics context was lost. Attempting recovery...");
      canvasInitializedRef.current = false;
    };

    const handleContextRestored = () => {
      console.log("[GRAPHICS CONTEXT RESTORED] Graphics context restored.");
      setAssetError(null);
      canvasInitializedRef.current = false;
    };

    canvas.addEventListener('contextlost', handleContextLost);
    canvas.addEventListener('contextrestored', handleContextRestored);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('contextlost', handleContextLost);
      canvas.removeEventListener('contextrestored', handleContextRestored);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

  // Lock screen orientation to landscape when supported
  useEffect(() => {
    const lockLandscape = async () => {
      try {
        if (window.screen?.orientation && 'lock' in window.screen.orientation) {
          await (window.screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (e) {}
    };
    lockLandscape();
  }, []);

  // Initialize and reset match analytics tracking when hiding or playing starts
  useEffect(() => {
    if (room.gameState === 'hiding' || room.gameState === 'playing') {
      const initialStats: Record<string, { distanceTraveled: number; timeSpentHiding: number }> = {};
      const initialPos: Record<string, { x: number; y: number }> = {};
      Object.keys(room.players).forEach(id => {
        initialStats[id] = { distanceTraveled: 0, timeSpentHiding: 0 };
        const p = room.players[id];
        if (p) {
          initialPos[id] = { x: p.x, y: p.y };
        }
      });
      playersStatsTrackerRef.current = initialStats;
      lastFramePositionsRef.current = initialPos;
    }
  }, [room.gameState, room.players]);

  const currentPlayer = room.players[currentPlayerId];
  const isHost = currentPlayer?.isHost;

  // Track announcements scroll
  const announcementEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    announcementEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [announcements]);



  // Helper: Acquire a particle slot from particlePoolRef without GC allocations
  const acquireParticleSlot = () => {
    const pool = particlePoolRef.current;
    let chosenIndex = -1;
    let minLife = 999;
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].active) {
        return pool[i];
      }
      if (pool[i].life < minLife) {
        minLife = pool[i].life;
        chosenIndex = i;
      }
    }
    return pool[chosenIndex >= 0 ? chosenIndex : 0];
  };

  // Spawn visual particles
  const spawnParticles = (x: number, y: number, type: GameParticle['type'], color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      let vx = (Math.random() - 0.5) * 2;
      let vy = (Math.random() - 0.5) * 2;
      let size = Math.random() * 3 + 1.5;
      let decay = Math.random() * 0.04 + 0.02;

      if (type === 'dust') {
        vx = (Math.random() - 0.5) * 0.6;
        vy = (Math.random() - 0.5) * 0.6;
        size = Math.random() * 2 + 1;
        decay = Math.random() * 0.05 + 0.05;
      } else if (type === 'spark') {
        vx = (Math.random() - 0.5) * 7;
        vy = (Math.random() - 0.5) * 7;
        size = Math.random() * 4 + 2;
        decay = Math.random() * 0.03 + 0.03;
      } else if (type === 'leaf') {
        vx = (Math.random() - 0.5) * 1.8;
        vy = (Math.random() - 0.5) * 1.8;
        size = Math.random() * 3.5 + 2;
        decay = Math.random() * 0.02 + 0.02;
      } else if (type === 'confetti') {
        vx = (Math.random() - 0.5) * 5;
        vy = -Math.random() * 4 - 1.5;
        size = Math.random() * 4 + 2.5;
        decay = Math.random() * 0.015 + 0.01;
      }

      const p = acquireParticleSlot();
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.color = color;
      p.size = size;
      p.alpha = 1;
      p.life = 1;
      p.decay = decay;
      p.type = type;
      p.playerId = undefined;
      p.originalSize = size;
    }
  };

  // Spawn visual trail particles with ultra-high-performance and aesthetic taper
  const spawnTrailParticle = (playerId: string, x: number, y: number, color: string, dx: number, dy: number) => {
    const angle = Math.atan2(dy, dx);
    const offsetDist = PLAYER_RADIUS * 0.5;
    const spawnX = x - Math.cos(angle) * offsetDist;
    const spawnY = y - Math.sin(angle) * offsetDist;

    const driftSpeed = 0.35;
    const vx = -Math.cos(angle) * driftSpeed + (Math.random() - 0.5) * 0.25;
    const vy = -Math.sin(angle) * driftSpeed + (Math.random() - 0.5) * 0.25;

    const size = Math.random() * 2 + 5.5;
    const decay = Math.random() * 0.05 + 0.09;

    const p = acquireParticleSlot();
    p.active = true;
    p.x = spawnX;
    p.y = spawnY;
    p.vx = vx;
    p.vy = vy;
    p.color = color;
    p.size = size;
    p.alpha = 0.55;
    p.life = 1.0;
    p.decay = decay;
    p.type = 'trail';
    p.playerId = playerId;
    p.originalSize = size;
  };

  // Synchronize dynamic props and callbacks using Refs to decouple game updates from React render cycles.
  // This completely eliminates game loop rebuilds during the 60FPS cycle, ensuring fluid performance.
  const roomRef = useRef(room);
  roomRef.current = room;

  const onSendMovementRef = useRef(onSendMovement);
  onSendMovementRef.current = onSendMovement;

  const onSendTagRef = useRef(onSendTag);
  onSendTagRef.current = onSendTag;

  const isExhaustedRef = useRef(isExhausted);
  isExhaustedRef.current = isExhausted;

  // Main client-side Physics and Draw Game loop
  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        requestRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        requestRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Use viewportSizeRef updated via ResizeObserver to eliminate layout thrashing inside 60FPS loop
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = viewportSizeRef.current.width;
      const cssH = viewportSizeRef.current.height;

      const bufferW = Math.floor(cssW * dpr);
      const bufferH = Math.floor(cssH * dpr);

      if (canvas.width !== bufferW || canvas.height !== bufferH) {
        canvas.width = bufferW;
        canvas.height = bufferH;
      }

      const frameStart = performance.now();
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1); // cap elapsed step
      lastTimeRef.current = timestamp;

      const cw = cssW;
      const ch = cssH;

      // Apply DPR transform matrix so all rendering operations use logical CSS pixel coordinates
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. DECOUPLED STATE BINDINGS (Reads directly from synchronized refs)
      const room = roomRef.current;
      const currentMap = getMapById(room.activeMapId || room.settings.mapId);
      const isExhausted = isExhaustedRef.current;

      // Compute camera frustum culling bounds upfront for remote player interpolation & particle physics
      const currentZoom = zoomRef.current || 0.85;
      const halfViewportW = (cw / currentZoom) / 2;
      const halfViewportH = (ch / currentZoom) / 2;
      const camX = cameraRef.current?.x ?? (MAP_WIDTH / 2);
      const camY = cameraRef.current?.y ?? (MAP_HEIGHT / 2);
      const cullMinX = camX - halfViewportW - 350;
      const cullMaxX = camX + halfViewportW + 350;
      const cullMinY = camY - halfViewportH - 350;
      const cullMaxY = camY + halfViewportH + 350;

      try {

      if (!canvasInitializedRef.current) {
        canvasInitializedRef.current = true;
        console.log("[RENDERER INIT] Game canvas and 2D graphics context initialized.", {
          bufferWidth: bufferW,
          bufferHeight: bufferH,
          cssWidth: cssW,
          cssHeight: cssH,
          devicePixelRatio: dpr,
          activeMap: room.activeMapId || room.settings.mapId
        });
        console.log("[SCENE LOAD] Game scene initialized with map:", room.activeMapId || room.settings.mapId, "Obstacles count:", currentMap.obstacles.length);
        console.log("[CAMERA CREATION] Camera initialized at position:", cameraRef.current, "Zoom:", zoomRef.current);
        console.log("[ASSET LOADING] Map assets verified and ready.");
      }

      // FPS tracking for dynamic device quality adjustment
      frameCountRef.current++;
      if (!lastFpsCheckTimeRef.current) lastFpsCheckTimeRef.current = timestamp;
      const elapsedFps = timestamp - lastFpsCheckTimeRef.current;
      
      if (elapsedFps >= 3000) { // every 3 seconds
        const currentFps = (frameCountRef.current * 1000) / elapsedFps;
        fpsRef.current = currentFps;
        frameCountRef.current = 0;
        lastFpsCheckTimeRef.current = timestamp;

        // Auto-optimize if FPS is consistently low
        if (currentFps < 45 && !lowGraphicsMode) {
          setLowGraphicsMode(true);
        }
      }

      // 1. DYNAMIC SOUND ALERTS CHECKS
      if (room.gameState === 'hiding' && room.hideCountdown <= 5 && room.hideCountdown > 0) {
        if (lastCountdownWarningRef.current !== room.hideCountdown) {
          soundManager.playCountdown();
          lastCountdownWarningRef.current = room.hideCountdown;
        }
      }
      if (room.gameState === 'playing' && room.matchTimer <= 10 && room.matchTimer > 0) {
        if (lastTimerWarningRef.current !== room.matchTimer) {
          soundManager.playTimerWarning();
          lastTimerWarningRef.current = room.matchTimer;
        }
      }

      // 2. SYNCHRONIZE ROOM PLAYERS & HANDLE GAME STATE TRANSITIONS
      const roomPlayers = room.players || {};
      (Object.values(roomPlayers) as Player[]).forEach((pServer: Player) => {
        let localEntry = localPlayersRef.current[pServer.id];
        if (!localEntry) {
          localEntry = { ...pServer };
          localPlayersRef.current[pServer.id] = localEntry;
        } else {
          localEntry.role = pServer.role;
          localEntry.status = pServer.status;
          localEntry.color = pServer.color;
          localEntry.name = pServer.name;
        }
      });

      // Snap positions & camera on state transitions (e.g., hiding -> playing, lobby -> hiding)
      if (lastGameStateRef.current !== room.gameState) {
        lastGameStateRef.current = room.gameState;
        (Object.values(roomPlayers) as Player[]).forEach((pServer: Player) => {
          if (localPlayersRef.current[pServer.id]) {
            localPlayersRef.current[pServer.id].x = pServer.x;
            localPlayersRef.current[pServer.id].y = pServer.y;
          }
        });
        if (roomPlayers[currentPlayerId]) {
          cameraRef.current = { x: roomPlayers[currentPlayerId].x, y: roomPlayers[currentPlayerId].y };
        }
      }

      // UPDATE CLIENT-SIDE LOCAL PLAYER PHYSICS
      let p = localPlayersRef.current[currentPlayerId];
      if (!p && roomPlayers[currentPlayerId]) {
        p = { ...roomPlayers[currentPlayerId] };
        localPlayersRef.current[currentPlayerId] = p;
      }

      if (p && p.status === 'alive') {
        const moveInput = getMovementInput();
        let dx = moveInput.dx;
        let dy = moveInput.dy;
        const canMove = moveInput.canMove;

        if (canMove) {
          // Mouse/Pointer dragging controls (for desktop) if keyboard/joystick is idle
          if (!isMobile && isMouseDownRef.current && canvasRef.current && dx === 0 && dy === 0) {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const clickX = mousePosRef.current.clientX - rect.left;
            const clickY = mousePosRef.current.clientY - rect.top;

            // Camera & Zoom world translation relative to player's screen position
            const worldX = cameraRef.current.x + (clickX - cw / 2) / zoomRef.current;
            const worldY = cameraRef.current.y + (clickY - ch / 2) / zoomRef.current;

            const mdx = worldX - p.x;
            const mdy = worldY - p.y;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

            if (mdist > 6) { // dead zone
              const maxPointerDist = 24;
              const speedMult = Math.min(mdist / maxPointerDist, 1);
              dx = (mdx / mdist) * speedMult;
              dy = (mdy / mdist) * speedMult;
            }
          }

          // Normalize vector to maintain consistent diagonal speed
          const length = Math.sqrt(dx * dx + dy * dy);
          const isMoving = length > 0;

          // STAMINA & SPRINT ENGINE
          const isHider = p.role === 'hider';
          const wantSprint = moveInput.isSprinting || mobileSprintActive.current;
          let isSprinting = false;

          if (isHider) {
            if (isExhausted) {
              if (staminaRef.current >= 20) {
                setIsExhausted(false);
              }
            }

            if (wantSprint && isMoving && staminaRef.current > 0 && !isExhausted) {
              isSprinting = true;
              staminaRef.current = Math.max(0, staminaRef.current - 20 * deltaTime);
              if (staminaRef.current <= 0) {
                setIsExhausted(true);
              }
            } else {
              // Recover stamina - faster in bushes
              const inBush = !!getHidingBushId(p.x, p.y, PLAYER_RADIUS, currentMap);
              const recoveryRate = inBush ? 18 : 11;
              staminaRef.current = Math.min(100, staminaRef.current + recoveryRate * deltaTime);
            }
            if (timestamp - lastStaminaUiUpdateRef.current >= 100) {
              const roundedStamina = Math.round(staminaRef.current);
              setStamina(prev => prev !== roundedStamina ? roundedStamina : prev);
              lastStaminaUiUpdateRef.current = timestamp;
            }
          }

          // Play sprint start sound
          if (isSprinting && !prevSprintingRef.current) {
            soundManager.playSprintStart();
          }
          prevSprintingRef.current = isSprinting;

          if (isMoving) {
            // Play footstep sounds at intervals
            const nowMs = timestamp;
            const stepInterval = isSprinting ? 180 : 325;
            if (nowMs - lastFootstepTimeRef.current >= stepInterval) {
              soundManager.playFootstep(isSprinting);
              lastFootstepTimeRef.current = nowMs;
            }

            // Cancel custom camera target on input movement so camera snaps back
            if (cameraFocusRef.current !== 'self') {
              cameraFocusRef.current = 'self';
              setHasCustomCamera(false);
            }

            // Determine actual target speed (Increased walking speeds by 15-20%)
            const baseSpeed = p.role === 'seeker' ? 5.6 : 4.7;
            const finalSpeed = isSprinting ? baseSpeed * 1.65 : baseSpeed;

            // Target velocity based on direction input
            const targetVX = (dx / length) * finalSpeed;
            const targetVY = (dy / length) * finalSpeed;

            // Ultra-snappy arcade response - INSTANT! Zero lag
            localVelocityRef.current.x = targetVX;
            localVelocityRef.current.y = targetVY;
          } else {
            // Instant stop
            localVelocityRef.current.x = 0;
            localVelocityRef.current.y = 0;
          }

          // Calculate visual frame movement using delta time normalized to 60fps
          const stepX = localVelocityRef.current.x * (deltaTime * 60);
          const stepY = localVelocityRef.current.y * (deltaTime * 60);

          const hasVelocity = localVelocityRef.current.x !== 0 || localVelocityRef.current.y !== 0;

          if (hasVelocity) {
            const bushBefore = getHidingBushId(p.x, p.y, PLAYER_RADIUS, currentMap);
            const prevX = p.x;
            const prevY = p.y;

            const nextPos = moveWithCollision(p.x, p.y, stepX, stepY, PLAYER_RADIUS, currentMap);
            
            p.x = nextPos.x;
            p.y = nextPos.y;

            // Compute turning angle
            const moveDX = p.x - prevX;
            const moveDY = p.y - prevY;
            const moveDist = Math.sqrt(moveDX * moveDX + moveDY * moveDY);
            if (moveDist > 0.1) {
              p.angle = Math.atan2(moveDY, moveDX);
              spawnTrailParticle(p.id, p.x, p.y, p.color || '#38bdf8', moveDX, moveDY);
            }

            // Send movement throttled or immediately on input changes
            const now = Date.now();
            const inputChanged = lastInputVectorRef.current.dx !== dx || lastInputVectorRef.current.dy !== dy;
            const distSq = Math.pow(p.x - lastSentPosRef.current.x, 2) + Math.pow(p.y - lastSentPosRef.current.y, 2);
            
            if ((now - lastSentTimeRef.current >= 30 && distSq > 0.01) || (inputChanged && distSq > 0.001)) {
              onSendMovementRef.current(p.x, p.y);
              lastSentTimeRef.current = now;
              lastSentPosRef.current = { x: p.x, y: p.y };
              lastInputVectorRef.current = { dx, dy };
            }

            // Bush rustling leaf particles
            const bushAfter = getHidingBushId(nextPos.x, nextPos.y, PLAYER_RADIUS, currentMap);
            if (bushAfter && Math.random() < 0.15) {
              spawnParticles(p.x, p.y, 'leaf', theme.bushBorder, 2);
            } else if (!bushBefore && bushAfter) {
              // Entered a bush
              spawnParticles(p.x, p.y, 'leaf', theme.bushBorder, 8);
            } else if (bushBefore && !bushAfter) {
              // Left a bush
              spawnParticles(p.x, p.y, 'leaf', theme.bushBorder, 8);
            }

            // Running dust / sprint particles
            if (Math.random() < (isSprinting ? 0.6 : 0.15)) {
              spawnParticles(p.x, p.y - PLAYER_RADIUS / 2, 'dust', isSprinting ? '#fb923c' : '#94a3b8', isSprinting ? 3 : 1);
            }
          } else {
            // Decelerated to absolute stop: Send final alignment coordinate to server
            if (lastSentPosRef.current.x !== p.x || lastSentPosRef.current.y !== p.y) {
              onSendMovementRef.current(p.x, p.y);
              lastSentPosRef.current = { x: p.x, y: p.y };
              lastInputVectorRef.current = { dx: 0, dy: 0 };
            }

            if (isHider && !wantSprint) {
              // Recover stamina even when completely still
              const inBush = !!getHidingBushId(p.x, p.y, PLAYER_RADIUS, currentMap);
              const recoveryRate = inBush ? 22 : 14;
              staminaRef.current = Math.min(100, staminaRef.current + recoveryRate * deltaTime);
              setStamina(Math.round(staminaRef.current));
            }
          }
        }
      }

      // 2.5 UPDATE REMOTE PLAYERS VISUAL POSITION USING LERP & EXTRAPOLATION (WITH CAMERA FRUSTUM CULLING)
      const now = Date.now();
      Object.keys(localPlayersRef.current).forEach(id => {
        if (id === currentPlayerId) return; // skip local player, handled by client prediction

        const localP = localPlayersRef.current[id];
        const target = remoteTargetsRef.current[id];

        if (localP && target) {
          // FRUSTUM CULLING FOR REMOTE ENTITY UPDATE: Bypass expensive math if far off-screen
          const isOffScreen = (localP.x < cullMinX || localP.x > cullMaxX || localP.y < cullMinY || localP.y > cullMaxY) &&
                              (target.x < cullMinX || target.x > cullMaxX || target.y < cullMinY || target.y > cullMaxY);

          if (isOffScreen) {
            // Instantly snap coordinates without running LERP, checkCollision, or spawning any visual trail bubbles
            localP.x = target.x;
            localP.y = target.y;
            return;
          }

          const elapsed = (now - target.lastUpdate) / 1000;

          if (localP.status === 'alive') {
            // Predict movement up to 150ms using calculated velocity vector
            const extrapolateTime = Math.min(Math.max(0, elapsed), 0.15);
            let targetX = target.x + target.vx * extrapolateTime;
            let targetY = target.y + target.vy * extrapolateTime;

            // Prevent extrapolation from walking through solid walls
            const col = checkCollision(targetX, targetY, PLAYER_RADIUS, currentMap);
            if (col.collided) {
              targetX = target.x;
              targetY = target.y;
            }

            const dx = targetX - localP.x;
            const dy = targetY - localP.y;
            const distSq = dx * dx + dy * dy;

            // Teleport snap if distance error is huge (>150px)
            if (distSq > 22500) {
              localP.x = targetX;
              localP.y = targetY;
            } else {
              // Smooth frame-rate independent LERP interpolation
              const dist = Math.sqrt(distSq);
              const lerpRate = dist > 40 ? 28 : 20;
              const lerpFactor = Math.min(1 - Math.exp(-lerpRate * deltaTime), 1);

              const prevX = localP.x;
              const prevY = localP.y;

              localP.x += dx * lerpFactor;
              localP.y += dy * lerpFactor;

              // Compute rotation angle based on movement direction
              const moveDX = localP.x - prevX;
              const moveDY = localP.y - prevY;
              const moveDist = Math.hypot(moveDX, moveDY);
              if (moveDist > 0.05) {
                localP.angle = Math.atan2(moveDY, moveDX);
                spawnTrailParticle(localP.id, localP.x, localP.y, localP.color || '#38bdf8', moveDX, moveDY);
              }
            }
          } else {
            // Spectating/Found ghosts snap immediately
            localP.x = target.x;
            localP.y = target.y;
          }
        }
      });

      // 2.8 UPDATE REAL-TIME PERFORMANCE TRACKING STATS (CLIENT-SIDE ANALYTICS)
      if (room.gameState === 'playing' || room.gameState === 'hiding') {
        Object.keys(localPlayersRef.current).forEach(id => {
          const lp = localPlayersRef.current[id];
          if (!lp) return;

          if (!playersStatsTrackerRef.current[id]) {
            playersStatsTrackerRef.current[id] = { distanceTraveled: 0, timeSpentHiding: 0 };
          }

          const tracker = playersStatsTrackerRef.current[id];

          // Calculate distance traveled since last frame
          const lastPos = lastFramePositionsRef.current[id];
          if (lastPos) {
            const dx = lp.x - lastPos.x;
            const dy = lp.y - lastPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Ignore spawns / teleports (e.g. > 150 pixels step)
            if (dist > 0.05 && dist < 150) {
              tracker.distanceTraveled += dist;
            }
          }
          lastFramePositionsRef.current[id] = { x: lp.x, y: lp.y };

          // Calculate time spent hiding in bushes (only for alive hiders during playing state)
          if (room.gameState === 'playing' && lp.role === 'hider' && lp.status === 'alive') {
            const inBush = !!getHidingBushId(lp.x, lp.y, PLAYER_RADIUS, currentMap);
            if (inBush) {
              tracker.timeSpentHiding += deltaTime;
            }
          }
        });
      }

      // 3. DETECT AUTOMATIC OVERLAP TAGGING (SEEKER LOCAL VALIDATION USING HIGH-PERFORMANCE UNIFORM SPATIAL GRID)
      if (p && p.role === 'seeker' && room.gameState === 'playing' && p.status === 'alive') {
        // Build uniform spatial grid for players inside active match (extremely fast O(N))
        const cellSize = 160;
        const grid: Record<string, Player[]> = {};
        const getCellKey = (x: number, y: number) => {
          const cx = Math.floor(x / cellSize);
          const cy = Math.floor(y / cellSize);
          return `${cx},${cy}`;
        };

        const playersList = Object.values(localPlayersRef.current) as Player[];
        playersList.forEach(other => {
          if (other.id !== p.id && other.role === 'hider' && other.status === 'alive') {
            const key = getCellKey(other.x, other.y);
            if (!grid[key]) grid[key] = [];
            grid[key].push(other);
          }
        });

        // Query only seeker's adjacent cells (9 cell lookups) to achieve true O(k) efficiency!
        const myCx = Math.floor(p.x / cellSize);
        const myCy = Math.floor(p.y / cellSize);
        const limitDist = PLAYER_RADIUS * 2 + 6;
        const limitDistSq = limitDist * limitDist; // Squared limit to completely skip expensive Math.sqrt calculation!

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = `${myCx + dx},${myCy + dy}`;
            const candidates = grid[key];
            if (candidates) {
              for (const other of candidates) {
                const tdx = other.x - p.x;
                const tdy = other.y - p.y;
                const distSq = tdx * tdx + tdy * tdy;
                
                if (distSq <= limitDistSq) {
                  onSendTagRef.current(other.id);
                  spawnParticles(other.x, other.y, 'spark', '#ef4444', 25);
                  triggerCameraShake(20);
                }
              }
            }
          }
        }
      }

      // 4. ANIMATION PARTICLES PHYSICS (WITH CAMERA FRUSTUM CULLING ON POOLED OBJECTS)
      const particlePool = particlePoolRef.current;
      for (let i = 0; i < particlePool.length; i++) {
        const pt = particlePool[i];
        if (!pt.active) continue;

        // Frustum culling check: immediately deactivate off-screen particles
        if (pt.x < cullMinX || pt.x > cullMaxX || pt.y < cullMinY || pt.y > cullMaxY) {
          pt.active = false;
          continue;
        }

        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;
        pt.life -= pt.decay;

        if (pt.type === 'trail' && pt.originalSize) {
          pt.size = pt.originalSize * Math.max(0, pt.life);
        }

        if (pt.life <= 0 || pt.size <= 0.1) {
          pt.active = false;
        }
      }

      // 5. RESPONSIVE CAMERA INTERPOLATION & BOUNDS CLAMPING
      const localMe = localPlayersRef.current[currentPlayerId] || room.players[currentPlayerId];
      const isHider = localMe?.role === 'hider';
      const wantSprint = Boolean(keysPressed.current['shift'] || keysPressed.current['shiftleft'] || keysPressed.current['shiftright'] || mobileSprintActive.current);
      const isSprinting = isHider && wantSprint && staminaRef.current > 0 && !isExhausted;

      // Dynamic camera FOV: Player sprite occupies ~7% of viewport height
      const targetPercent = 0.07; // 7.0% screen height target
      const playerDiameter = PLAYER_RADIUS * 2; // 32 units
      let baseZoom = (ch * targetPercent) / playerDiameter;
      
      // Clamp base zoom to a wide field-of-view range (0.42x to 1.10x)
      baseZoom = Math.max(0.42, Math.min(baseZoom, 1.10));

      // Smoothly interpolate user camera zoom multiplier (200-300ms transition)
      const userZoomLerp = Math.min(12 * deltaTime, 0.25);
      userZoomCurrentRef.current += (userZoomTargetRef.current - userZoomCurrentRef.current) * userZoomLerp;

      // Dynamic Tension & Match Phase Zoom Enhancements
      let tensionFactor = 1.0;
      if (localMe && room.gameState === 'playing') {
        let minDistanceToOpponent = Infinity;
        (Object.values(localPlayersRef.current) as Player[]).forEach((other: Player) => {
          if (other.id !== localMe.id && other.status === 'alive') {
            if ((localMe.role === 'hider' && other.role === 'seeker') || (localMe.role === 'seeker' && other.role === 'hider')) {
              const dist = Math.hypot(other.x - localMe.x, other.y - localMe.y);
              if (dist < minDistanceToOpponent) minDistanceToOpponent = dist;
            }
          }
        });
        if (minDistanceToOpponent < 220) {
          const tensionRatio = 1 - (minDistanceToOpponent / 220);
          tensionFactor += tensionRatio * 0.12; // Zoom in up to +12% when opponent is close for tension
        }
      }

      // Final 30 seconds zoom out for heightened awareness
      if (room.gameState === 'playing' && room.matchTimer <= 30 && room.matchTimer > 0) {
        tensionFactor *= 0.90;
      }

      const sprintFactor = isSprinting ? 0.92 : 1.0;
      const targetZoom = baseZoom * userZoomCurrentRef.current * tensionFactor * sprintFactor;
      
      zoomRef.current += (targetZoom - zoomRef.current) * Math.min(8 * deltaTime, 0.15);

      const lerpAmt = Math.min(1 - Math.exp(-18 * deltaTime), 0.35);

      // Smooth movement prediction forward lead for fluid camera tracking
      const leadX = (localVelocityRef.current?.x || 0) * 0.15;
      const leadY = (localVelocityRef.current?.y || 0) * 0.15;

      const activePlayer = localMe;
      let targetCamX = activePlayer ? activePlayer.x + leadX : MAP_WIDTH / 2;
      let targetCamY = activePlayer ? activePlayer.y + leadY : MAP_HEIGHT / 2;

      if ((activePlayer?.role === 'spectator' || activePlayer?.status === 'found') && cameraFocusRef.current === 'self') {
        const activePlayers = (Object.values(localPlayersRef.current) as Player[]).filter(pl => pl.role !== 'spectator' && pl.status === 'alive');
        if (activePlayers.length > 0) {
          targetCamX = activePlayers[0].x;
          targetCamY = activePlayers[0].y;
        }
      }

      if (typeof cameraFocusRef.current === 'string' && cameraFocusRef.current !== 'self') {
        const targetPlayer = localPlayersRef.current[cameraFocusRef.current] || room.players[cameraFocusRef.current];
        if (targetPlayer) {
          targetCamX = targetPlayer.x;
          targetCamY = targetPlayer.y;
        }
      } else if (typeof cameraFocusRef.current === 'object' && cameraFocusRef.current !== null) {
        targetCamX = cameraFocusRef.current.x;
        targetCamY = cameraFocusRef.current.y;
      }

      // If camera is uninitialized or far from target (e.g. spawn or teleport), snap instantly without lerp delay
      const distToCam = Math.hypot(targetCamX - cameraRef.current.x, targetCamY - cameraRef.current.y);
      if (distToCam > 250 || cameraRef.current.x === 0 || cameraRef.current.y === 0) {
        cameraRef.current.x = targetCamX;
        cameraRef.current.y = targetCamY;
      } else {
        cameraRef.current.x += (targetCamX - cameraRef.current.x) * lerpAmt;
        cameraRef.current.y += (targetCamY - cameraRef.current.y) * lerpAmt;
      }

      // Prevent camera clipping outside map boundaries
      const vwWorld = cw / zoomRef.current;
      const vhWorld = ch / zoomRef.current;
      const halfVW = vwWorld / 2;
      const halfVH = vhWorld / 2;

      if (MAP_WIDTH > vwWorld) {
        cameraRef.current.x = Math.max(halfVW, Math.min(cameraRef.current.x, MAP_WIDTH - halfVW));
      } else {
        cameraRef.current.x = MAP_WIDTH / 2;
      }

      if (MAP_HEIGHT > vhWorld) {
        cameraRef.current.y = Math.max(halfVH, Math.min(cameraRef.current.y, MAP_HEIGHT - halfVH));
      } else {
        cameraRef.current.y = MAP_HEIGHT / 2;
      }

      // Sanity check to prevent NaN/infinite camera coordinates from causing a black screen
      if (isNaN(cameraRef.current.x) || !isFinite(cameraRef.current.x)) {
        console.warn("[CAMERA RECOVERY] Camera X was invalid! Resetting to center.");
        cameraRef.current.x = MAP_WIDTH / 2;
      }
      if (isNaN(cameraRef.current.y) || !isFinite(cameraRef.current.y)) {
        console.warn("[CAMERA RECOVERY] Camera Y was invalid! Resetting to center.");
        cameraRef.current.y = MAP_HEIGHT / 2;
      }
      if (isNaN(zoomRef.current) || !isFinite(zoomRef.current) || zoomRef.current <= 0) {
        console.warn("[CAMERA RECOVERY] Camera Zoom was invalid! Resetting to 0.85.");
        zoomRef.current = 0.85;
      }

      // Print requested browser console telemetry every 2.5 seconds
      if (timestamp - lastDiagTimeRef.current >= 2500) {
        lastDiagTimeRef.current = timestamp;
        const playerSpritePx = playerDiameter * zoomRef.current;
        const playerPercent = (playerSpritePx / ch) * 100;
        console.log(`[GAMEPLAY CAMERA & VIEWPORT AUDIT]`, {
          currentCameraZoom: Number(zoomRef.current.toFixed(3)),
          cameraPosition: `X:${cameraRef.current.x.toFixed(1)}, Y:${cameraRef.current.y.toFixed(1)}`,
          canvasBufferSize: `${canvas.width}x${canvas.height}`,
          canvasCssSize: `${cw}x${ch}`,
          worldSize: `${currentMap.width}x${currentMap.height}`,
          devicePixelRatio: dpr,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          playerSpriteScale: `${playerPercent.toFixed(1)}% of screen height (${playerSpritePx.toFixed(1)}px / ${ch}px)`,
          networkPingMs: ping
        });
      }

      // Decay camera shake amount
      if (shakeAmountRef.current > 0.05) {
        shakeAmountRef.current -= deltaTime * 24;
        if (shakeAmountRef.current < 0) shakeAmountRef.current = 0;
      }

      // Record update phase timing
      const updateEnd = performance.now();
      cpuUpdateTimeRef.current = updateEnd - frameStart;

      // 6. DRAW GAME FIELD WITH CAMERA SCALING
      // Fill background void color
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, cw, ch);

      const zVal = zoomRef.current;
      ctx.save();

      // Translate origin to screen center and scale
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(zVal, zVal);

      const currentShake = shakeAmountRef.current;
      const shakeX = currentShake > 0 ? (Math.random() - 0.5) * currentShake : 0;
      const shakeY = currentShake > 0 ? (Math.random() - 0.5) * currentShake : 0;

      ctx.translate(-cameraRef.current.x + shakeX, -cameraRef.current.y + shakeY);

      // Draw Cartoon Ground Base
      ctx.fillStyle = theme.ground;
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      
      // Draw Grid Lines (bubbly mesh pattern)
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 4;
      const gridSize = 100;
      for (let x = 0; x < MAP_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, MAP_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < MAP_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(MAP_WIDTH, y);
        ctx.stroke();
      }

      // Draw Zone Floor Patterns
      ctx.fillStyle = theme.centerBg;
      ctx.fillRect(450, 320, 300, 260);
      ctx.strokeStyle = theme.centerBorder;
      ctx.lineWidth = 6;
      ctx.strokeRect(450, 320, 300, 260);

      // Draw Obstacles (Cartoon toy style with Frustum Culling)
      renderedObstaclesCountRef.current = 0;
      currentMap.obstacles.forEach(obs => {
        // Frustum culling check
        if (obs.x + obs.width < cullMinX || obs.x > cullMaxX || obs.y + obs.height < cullMinY || obs.y > cullMaxY) {
          return;
        }
        renderedObstaclesCountRef.current++;
        const shadowOffset = 6;

        if (obs.type === 'wall') {
          // Wall shadow
          if (!lowGraphicsMode) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
            ctx.beginPath();
            ctx.roundRect(obs.x + shadowOffset, obs.y + shadowOffset, obs.width, obs.height, 12);
            ctx.fill();
          }

          // Wall block
          ctx.fillStyle = theme.wallBg;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 12);
          ctx.fill();
          
          ctx.strokeStyle = theme.wallBorder;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Masonry details (toy line highlights)
          ctx.fillStyle = theme.wallBorder;
          if (obs.width > obs.height) {
            for (let wx = obs.x + 40; wx < obs.x + obs.width; wx += 40) {
              ctx.fillRect(wx, obs.y + 4, 3, obs.height - 8);
            }
          } else {
            for (let wy = obs.y + 40; wy < obs.y + obs.height; wy += 40) {
              ctx.fillRect(obs.x + 4, wy, obs.width - 8, 3);
            }
          }
        } else if (obs.type === 'crate') {
          // Block shadow
          if (!lowGraphicsMode) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
            ctx.beginPath();
            ctx.roundRect(obs.x + shadowOffset, obs.y + shadowOffset, obs.width, obs.height, 10);
            ctx.fill();
          }

          // Cartoon box/toy cube
          ctx.fillStyle = theme.crateBg;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 10);
          ctx.fill();

          ctx.strokeStyle = theme.crateBorder;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Draw Giant Character label for Toybox, else wooden beams
          ctx.fillStyle = theme.crateBorder;
          if (room.settings.mapId === 'toybox') {
            ctx.font = 'black 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const letters = ['A', 'B', 'C', 'D'];
            const chosen = letters[Math.floor((obs.x + obs.y) % 4)];
            ctx.fillText(chosen, obs.x + obs.width / 2, obs.y + obs.height / 2);
          } else {
            ctx.strokeStyle = theme.crateBorder;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(obs.x + 6, obs.y + 6);
            ctx.lineTo(obs.x + obs.width - 6, obs.y + obs.height - 6);
            ctx.moveTo(obs.x + obs.width - 6, obs.y + 6);
            ctx.lineTo(obs.x + 6, obs.y + obs.height - 6);
            ctx.stroke();
          }
        } else if (obs.type === 'rock') {
          // Rock shadow
          const cx = obs.x + obs.width / 2;
          const cy = obs.y + obs.height / 2;
          const r = obs.width / 2;

          if (!lowGraphicsMode) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
            ctx.beginPath();
            ctx.arc(cx + shadowOffset, cy + shadowOffset, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Toy ball or smooth boulder
          ctx.fillStyle = theme.rockBg;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 4;
          ctx.stroke();

          // Highlights
          ctx.fillStyle = theme.rockHighlight;
          ctx.beginPath();
          ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === 'barrel') {
          // Cylinder shadow
          const cx = obs.x + obs.width / 2;
          const cy = obs.y + obs.height / 2;
          const r = obs.width / 2;

          if (!lowGraphicsMode) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
            ctx.beginPath();
            ctx.arc(cx + shadowOffset - 2, cy + shadowOffset - 2, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Toy cylinder / Pumpkin / Crayon box
          ctx.fillStyle = theme.barrelBg;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = theme.barrelRing;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Internal stripes
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
          ctx.stroke();
        } else if (obs.type === 'tree') {
          // Lush dense trees
          const cx = obs.x + obs.width / 2;
          const cy = obs.y + obs.height / 2;
          const r = obs.width / 2;

          // Tree canopy shadow
          if (!lowGraphicsMode) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
            ctx.beginPath();
            ctx.arc(cx + shadowOffset + 4, cy + shadowOffset + 4, r + 8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Tree fluff levels
          ctx.fillStyle = theme.treeLeaf1;
          ctx.beginPath();
          ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = theme.treeLeaf2;
          ctx.beginPath();
          ctx.arc(cx - 3, cy - 3, r - 1, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = theme.treeLeaf3;
          ctx.beginPath();
          ctx.arc(cx - 6, cy - 6, r - 7, 0, Math.PI * 2);
          ctx.fill();

          // Core trunk dot
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === 'log') {
          if (!lowGraphicsMode) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
            ctx.beginPath();
            ctx.roundRect(obs.x + shadowOffset, obs.y + shadowOffset, obs.width, obs.height, 8);
            ctx.fill();
          }
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 8);
          ctx.fill();
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.ellipse(obs.x + 12, obs.y + obs.height / 2, 6, obs.height / 2 - 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(obs.x + obs.width - 12, obs.y + obs.height / 2, 6, obs.height / 2 - 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (obs.type === 'fence') {
          ctx.fillStyle = '#d97706';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y + obs.height / 3, obs.width, obs.height / 3, 4);
          ctx.fill();
          ctx.stroke();
          for (let px = obs.x + 10; px < obs.x + obs.width; px += 35) {
            ctx.fillStyle = '#b45309';
            ctx.fillRect(px - 5, obs.y, 10, obs.height);
            ctx.strokeRect(px - 5, obs.y, 10, obs.height);
          }
        } else if (obs.type === 'haystack') {
          const cx = obs.x + obs.width / 2;
          const cy = obs.y + obs.height / 2;
          const r = obs.width / 2;
          if (!lowGraphicsMode) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
            ctx.beginPath();
            ctx.arc(cx + 6, cy + 6, r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 3.5;
          ctx.stroke();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
            ctx.stroke();
          }
        } else if (obs.type === 'cart') {
          ctx.fillStyle = '#92400e';
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 8);
          ctx.fill();
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 3.5;
          ctx.stroke();
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(obs.x + 12, obs.y + obs.height, 10, 0, Math.PI * 2);
          ctx.arc(obs.x + obs.width - 12, obs.y + obs.height, 10, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === 'bridge') {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 3;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
          for (let py = obs.y + 15; py < obs.y + obs.height; py += 20) {
            ctx.beginPath();
            ctx.moveTo(obs.x, py);
            ctx.lineTo(obs.x + obs.width, py);
            ctx.stroke();
          }
        } else if (obs.type === 'tower') {
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 8);
          ctx.fill();
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.fillStyle = '#b91c1c';
          ctx.beginPath();
          ctx.moveTo(obs.x - 8, obs.y);
          ctx.lineTo(obs.x + obs.width / 2, obs.y - 24);
          ctx.lineTo(obs.x + obs.width + 8, obs.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (obs.type === 'water') {
          ctx.fillStyle = 'rgba(14, 165, 233, 0.75)';
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 20);
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, (timestamp / 20) % (obs.width / 3), 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Render Special One-Time Hiding Spots
      if (currentMap.specialHidingSpots) {
        currentMap.specialHidingSpots.forEach(spot => {
          if (spot.x + spot.width < cullMinX || spot.x > cullMaxX || spot.y + spot.height < cullMinY || spot.y > cullMaxY) {
            return;
          }
          const isOccupied = !!spot.occupiedBy;
          const isCooldown = spot.cooldownUntil && spot.cooldownUntil > Date.now();
          const remainingSeconds = isCooldown ? Math.ceil((spot.cooldownUntil! - Date.now()) / 1000) : 0;

          ctx.save();
          ctx.fillStyle = isOccupied ? '#b91c1c' : isCooldown ? '#eab308' : '#16a34a';
          ctx.beginPath();
          ctx.roundRect(spot.x, spot.y, spot.width, spot.height, 12);
          ctx.fill();
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(spot.name, spot.x + spot.width / 2, spot.y + spot.height / 2 - 8);

          if (isOccupied) {
            ctx.fillStyle = '#f87171';
            ctx.fillText('OCCUPIED', spot.x + spot.width / 2, spot.y + spot.height / 2 + 10);
          } else if (isCooldown) {
            ctx.fillStyle = '#fef08a';
            ctx.fillText(`LOCKED ${remainingSeconds}s`, spot.x + spot.width / 2, spot.y + spot.height / 2 + 10);
          } else {
            ctx.fillStyle = '#4ade80';
            ctx.fillText('1-PERSON HIDE', spot.x + spot.width / 2, spot.y + spot.height / 2 + 10);
          }
          ctx.restore();
        });
      }

      // Gather current roles
      const activeLocalMe = localPlayersRef.current[currentPlayerId] || localMe;
      const meIsSeeker = activeLocalMe?.role === 'seeker';
      const meIsSpectator = activeLocalMe?.role === 'spectator' || activeLocalMe?.status === 'found';

      // Draw Players under Bushes (so bushes render on top, making players hidden!)
      const playersList = Object.values(localPlayersRef.current) as Player[];
      playersList.forEach(player => {
        // Frustum culling check (exempt local player from culling)
        if (player.id !== currentPlayerId) {
          if (player.x + PLAYER_RADIUS < cullMinX || player.x - PLAYER_RADIUS > cullMaxX || player.y + PLAYER_RADIUS < cullMinY || player.y - PLAYER_RADIUS > cullMaxY) {
            return;
          }
        }
        const playerBushId = getHidingBushId(player.x, player.y, PLAYER_RADIUS, currentMap);
        const myBushId = activeLocalMe ? getHidingBushId(activeLocalMe.x, activeLocalMe.y, PLAYER_RADIUS, currentMap) : null;

        // VISIBILITY LOGIC
        // Hiders & Spectators always see all players.
        // Seekers DO NOT see hiders who are inside a bush, UNLESS the seeker is inside the exact same bush!
        let isVisible = true;
        
        if (player.role === 'hider' && player.status === 'alive') {
          if (player.id !== currentPlayerId) {
            if (meIsSeeker) {
              const distToMe = localMe ? Math.hypot(player.x - localMe.x, player.y - localMe.y) : 9999;
              const inVisibleArea = distToMe < 260;
              const bushCheck = !playerBushId || (playerBushId === myBushId);
              isVisible = inVisibleArea && bushCheck;
            } else if (meIsSpectator) {
              isVisible = true;
            }
          }
        }

        if (!isVisible) return;

        ctx.save();
        
        // Draw Shadow
        ctx.beginPath();
        ctx.arc(player.x, player.y + 3, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.fill();

        // Spectator/Ghost translucent draw
        if (player.role === 'spectator' || player.status === 'found') {
          ctx.globalAlpha = 0.45;
        } else if (playerBushId) {
          ctx.globalAlpha = 0.65;
        }

        // Draw player core circle with thick borders (original cartoon styling)
        ctx.beginPath();
        ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = player.color || '#38bdf8';
        ctx.fill();

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Draw EXPRESSIVE EYES (White circles with black pupils)
        ctx.fillStyle = '#ffffff';
        let eyeOffsetY = -2;
        let eyeOffsetX = 3.5;

        // If found, draw dead cross eyes
        if (player.status === 'found') {
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2.5;
          // Left X eye
          ctx.beginPath();
          ctx.moveTo(player.x - 6, player.y - 5);
          ctx.lineTo(player.x - 2, player.y - 1);
          ctx.moveTo(player.x - 2, player.y - 5);
          ctx.lineTo(player.x - 6, player.y - 1);
          ctx.stroke();
          // Right X eye
          ctx.beginPath();
          ctx.moveTo(player.x + 2, player.y - 5);
          ctx.lineTo(player.x + 6, player.y - 1);
          ctx.moveTo(player.x + 6, player.y - 5);
          ctx.lineTo(player.x + 2, player.y - 1);
          ctx.stroke();
        } else {
          let lookX = 0;
          let lookY = 0;
          if (player.angle !== undefined) {
            lookX = Math.cos(player.angle) * 2.5;
            lookY = Math.sin(player.angle) * 2.5;
          } else {
            // Default looking down/forward
            lookY = 1.0;
          }

          // Adjust eye positions and shift them with look
          const leftEyeX = player.x - 3.5 + lookX * 0.7;
          const leftEyeY = player.y + eyeOffsetY + lookY * 0.7;
          const rightEyeX = player.x + 3.5 + lookX * 0.7;
          const rightEyeY = player.y + eyeOffsetY + lookY * 0.7;

          // Left Eye circle
          ctx.beginPath();
          ctx.arc(leftEyeX, leftEyeY, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Right Eye circle
          ctx.beginPath();
          ctx.arc(rightEyeX, rightEyeY, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Pupils looking slightly in direction of lookX / lookY
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(leftEyeX + lookX * 0.4, leftEyeY + lookY * 0.4, 1.2, 0, Math.PI * 2);
          ctx.arc(rightEyeX + lookX * 0.4, rightEyeY + lookY * 0.4, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Mouth (bubbly line)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (player.status === 'found') {
          // Flat mouth
          ctx.moveTo(player.x - 3, player.y + 4);
          ctx.lineTo(player.x + 3, player.y + 4);
        } else {
          // Smiley mouth
          ctx.arc(player.x, player.y + 2, 3, 0, Math.PI);
        }
        ctx.stroke();

        // Seeker pulsing crown/halo highlight
        if (player.role === 'seeker') {
          const pulsate = Math.sin(timestamp / 150) * 3 + 8;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(player.x, player.y, pulsate, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
          ctx.fill();
        }

        const ax = player.x;
        const ay = player.y;

        // RENDER OUTFIT (Bottom torso/pattern on player sphere)
        if (player.outfit && player.outfit !== 'none') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(ax, ay, PLAYER_RADIUS, Math.PI * 0.15, Math.PI * 0.85);
          ctx.lineTo(ax, ay + PLAYER_RADIUS);
          ctx.closePath();
          if (player.outfit === 'stripes') {
            ctx.fillStyle = '#3b82f6';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (player.outfit === 'star') {
            ctx.fillStyle = '#eab308';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ax, ay + 6, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (player.outfit === 'hoodie') {
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (player.outfit === 'suit') {
            ctx.fillStyle = '#0f172a';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ax - 2, ay + 3, 4, 8);
          } else if (player.outfit === 'overalls') {
            ctx.fillStyle = '#0284c7';
            ctx.fill();
            ctx.fillStyle = '#facc15';
            ctx.fillRect(ax - 4, ay + 4, 2, 2);
            ctx.fillRect(ax + 2, ay + 4, 2, 2);
          } else if (player.outfit === 'camo') {
            ctx.fillStyle = '#15803d';
            ctx.fill();
            ctx.fillStyle = '#166534';
            ctx.beginPath();
            ctx.arc(ax - 3, ay + 6, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // RENDER HAIRSTYLE (Behind or on top of head)
        if (player.hair && player.hair !== 'none') {
          ctx.save();
          if (player.hair === 'afro') {
            ctx.fillStyle = '#451a03';
            ctx.beginPath();
            ctx.arc(ax, ay - 6, PLAYER_RADIUS + 4, Math.PI * 0.8, Math.PI * 2.2);
            ctx.fill();
          } else if (player.hair === 'spiky') {
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.moveTo(ax - 12, ay - 10);
            ctx.lineTo(ax - 8, ay - 20);
            ctx.lineTo(ax - 4, ay - 12);
            ctx.lineTo(ax, ay - 22);
            ctx.lineTo(ax + 4, ay - 12);
            ctx.lineTo(ax + 8, ay - 20);
            ctx.lineTo(ax + 12, ay - 10);
            ctx.closePath();
            ctx.fill();
          } else if (player.hair === 'long') {
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(ax, ay, PLAYER_RADIUS + 2, Math.PI * 0.6, Math.PI * 2.4);
            ctx.fill();
          } else if (player.hair === 'bob') {
            ctx.fillStyle = '#9a3412';
            ctx.beginPath();
            ctx.arc(ax, ay - 2, PLAYER_RADIUS + 2, Math.PI * 0.75, Math.PI * 2.25);
            ctx.fill();
          } else if (player.hair === 'curly') {
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.arc(ax - 6, ay - 12, 5, 0, Math.PI * 2);
            ctx.arc(ax, ay - 15, 6, 0, Math.PI * 2);
            ctx.arc(ax + 6, ay - 12, 5, 0, Math.PI * 2);
            ctx.fill();
          } else if (player.hair === 'pony') {
            ctx.fillStyle = '#ca8a04';
            ctx.beginPath();
            ctx.arc(ax, ay - 8, PLAYER_RADIUS, Math.PI * 0.8, Math.PI * 2.2);
            ctx.fill();
            // Tail
            ctx.beginPath();
            ctx.arc(ax + 12, ay - 6, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // RENDER GLASSES / EYEWEAR (Over eyes)
        if (player.glasses && player.glasses !== 'none' && player.status !== 'found') {
          ctx.save();
          if (player.glasses === 'sunglasses') {
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.fillRect(ax - 8, ay - 5, 6, 4);
            ctx.strokeRect(ax - 8, ay - 5, 6, 4);
            ctx.fillRect(ax + 2, ay - 5, 6, 4);
            ctx.strokeRect(ax + 2, ay - 5, 6, 4);
            ctx.fillRect(ax - 2, ay - 4, 4, 1.5);
          } else if (player.glasses === 'nerd_glasses') {
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(ax - 5, ay - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(ax + 5, ay - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ax - 1, ay - 3);
            ctx.lineTo(ax + 1, ay - 3);
            ctx.stroke();
          } else if (player.glasses === 'eyepatch') {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(ax - 4, ay - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ax - 10, ay - 8);
            ctx.lineTo(ax + 10, ay + 2);
            ctx.stroke();
          } else if (player.glasses === 'vr_headset') {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(ax - 9, ay - 6, 18, 6);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(ax - 6, ay - 4, 12, 2);
          }
          ctx.restore();
        }

        // RENDER ACCESSORY (Hats on top of circle)
        if (player.accessory && player.accessory !== 'none') {
          if (player.accessory === 'cat_ears') {
            ctx.fillStyle = '#1e293b';
            // Left Ear
            ctx.beginPath();
            ctx.moveTo(ax - 12, ay - 11);
            ctx.lineTo(ax - 13, ay - 3);
            ctx.lineTo(ax - 3, ay - 11);
            ctx.closePath();
            ctx.fill();
            // Right Ear
            ctx.beginPath();
            ctx.moveTo(ax + 12, ay - 11);
            ctx.lineTo(ax + 13, ay - 3);
            ctx.lineTo(ax + 3, ay - 11);
            ctx.closePath();
            ctx.fill();

            // Pink inner ears
            ctx.fillStyle = '#fda4af';
            ctx.beginPath();
            ctx.moveTo(ax - 10, ay - 10);
            ctx.lineTo(ax - 11, ay - 4);
            ctx.lineTo(ax - 4, ay - 10);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(ax + 10, ay - 10);
            ctx.lineTo(ax + 11, ay - 4);
            ctx.lineTo(ax + 4, ay - 10);
            ctx.closePath();
            ctx.fill();
          } else if (player.accessory === 'crown') {
            ctx.fillStyle = '#facc15';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(ax - 10, ay - 14);
            ctx.lineTo(ax - 10, ay - 21);
            ctx.lineTo(ax - 5, ay - 17);
            ctx.lineTo(ax, ay - 23);
            ctx.lineTo(ax + 5, ay - 17);
            ctx.lineTo(ax + 10, ay - 21);
            ctx.lineTo(ax + 10, ay - 14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Red central jewel dot
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(ax, ay - 17, 1.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (player.accessory === 'cowboy_hat') {
            ctx.fillStyle = '#b45309';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;

            // Hat top block
            ctx.beginPath();
            ctx.roundRect(ax - 8, ay - 22, 16, 9, [4, 4, 0, 0]);
            ctx.fill();
            ctx.stroke();

            // Hat brim line
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.roundRect(ax - 14, ay - 15, 28, 4, 2);
            ctx.fill();
            ctx.stroke();
          } else if (player.accessory === 'ninja') {
            // Bandana strap wrapping forehead
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.rect(ax - 14, ay - 8, 28, 5);
            ctx.fill();
            ctx.stroke();

            // Medal in center
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(ax - 3, ay - 8, 6, 5);
            ctx.strokeRect(ax - 3, ay - 8, 6, 5);
          } else if (player.accessory === 'space') {
            // Glass bubble helmet
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.fillStyle = 'rgba(224, 242, 254, 0.22)';
            ctx.beginPath();
            ctx.arc(ax, ay, PLAYER_RADIUS + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // White spark flare
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ax + 7, ay - 7, 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (player.accessory === 'chef') {
            ctx.fillStyle = '#fafaf9';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;

            // Puff ball
            ctx.beginPath();
            ctx.arc(ax, ay - 20, 8, 0, Math.PI * 2);
            ctx.arc(ax - 5, ay - 17, 6, 0, Math.PI * 2);
            ctx.arc(ax + 5, ay - 17, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Chef brim cylinder
            ctx.beginPath();
            ctx.rect(ax - 6, ay - 15, 12, 5);
            ctx.fill();
            ctx.stroke();
          } else if (player.accessory === 'pirate') {
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2.5;

            // Tri-corner hat body
            ctx.beginPath();
            ctx.moveTo(ax - 13, ay - 13);
            ctx.lineTo(ax, ay - 22);
            ctx.lineTo(ax + 13, ay - 13);
            ctx.lineTo(ax + 8, ay - 15);
            ctx.lineTo(ax - 8, ay - 15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // White mini-skull dot inside
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ax, ay - 16, 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (player.accessory === 'party_hat') {
            ctx.fillStyle = '#ec4899';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ax - 8, ay - 14);
            ctx.lineTo(ax, ay - 25);
            ctx.lineTo(ax + 8, ay - 14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Pom pom
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(ax, ay - 25, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (player.accessory === 'halo') {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.5;
            ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
            ctx.beginPath();
            ctx.ellipse(ax, ay - 20, 10, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        ctx.restore();

        // Draw Player Name Overlay with elegant Outfit style styling
        ctx.fillStyle = player.status === 'found' ? '#94a3b8' : '#1e293b';
        ctx.font = 'black 10px sans-serif';
        ctx.textAlign = 'center';
        
        let label = player.name;
        if (player.role === 'seeker') {
          label += ' (Seeker)';
        } else if (player.status === 'found') {
          label += ' (Found)';
        }
        ctx.fillText(label, player.x, player.y - PLAYER_RADIUS - 8);

        // REAL-TIME EMOTE DRAWING OVER HEADS (Bubble popup)
        const emoteObj = activeEmotesRef.current[player.id];
        if (emoteObj && timestamp < emoteObj.expiry) {
          ctx.save();
          
          // Draw speech bubble background
          const bx = player.x;
          const by = player.y - PLAYER_RADIUS - 36;
          const bw = 32;
          const bh = 22;

          // 3D Shadow
          ctx.fillStyle = 'rgba(30, 41, 59, 0.2)';
          ctx.beginPath();
          ctx.roundRect(bx - bw / 2 + 2, by + 2, bw, bh, 8);
          ctx.fill();

          // Bubble body
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(bx - bw / 2, by, bw, bh, 8);
          ctx.fill();
          ctx.stroke();

          // Pointer tail arrow pointing down
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(bx - 4, by + bh);
          ctx.lineTo(bx + 4, by + bh);
          ctx.lineTo(bx, by + bh + 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Redraw tail pointer fill overlap
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(bx - 3.5, by + bh - 1);
          ctx.lineTo(bx + 3.5, by + bh - 1);
          ctx.lineTo(bx, by + bh + 2.5);
          ctx.closePath();
          ctx.fill();

          // Render Emote text/emoji
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(emoteObj.emote, bx, by + bh / 2 + 1);

          ctx.restore();
        }
      });

      // Draw Bushes OVER players
      currentMap.obstacles.forEach(obs => {
        if (obs.type === 'bush') {
          ctx.save();
          // Bush shadow
          if (!lowGraphicsMode) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.2)';
            ctx.beginPath();
            ctx.roundRect(obs.x + 3, obs.y + 4, obs.width, obs.height, 14);
            ctx.fill();
          }

          // Translucent cartoon foliage green
          ctx.fillStyle = theme.bushBg;
          ctx.strokeStyle = theme.bushBorder;
          ctx.lineWidth = 3.5;
          
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 14);
          ctx.fill();
          ctx.stroke();

          // Flower spots inside bushes
          ctx.fillStyle = theme.bushFlower;
          ctx.beginPath();
          ctx.arc(obs.x + obs.width * 0.25, obs.y + obs.height * 0.35, 3.5, 0, Math.PI * 2);
          ctx.arc(obs.x + obs.width * 0.75, obs.y + obs.height * 0.25, 3.0, 0, Math.PI * 2);
          ctx.arc(obs.x + obs.width * 0.55, obs.y + obs.height * 0.72, 3.5, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        }
      });

      // Draw Active Particles list inside camera context
      const renderPool = particlePoolRef.current;
      for (let i = 0; i < renderPool.length; i++) {
        const pt = renderPool[i];
        if (!pt.active) continue;

        // Frustum culling check
        if (pt.x + pt.size < cullMinX || pt.x - pt.size > cullMaxX || pt.y + pt.size < cullMinY || pt.y - pt.size > cullMaxY) {
          continue;
        }
        // Visibility check for trail particles
        if (pt.type === 'trail' && pt.playerId) {
          const player = localPlayersRef.current[pt.playerId];
          if (!player) continue;

          const playerBushId = getHidingBushId(pt.x, pt.y, PLAYER_RADIUS, currentMap);
          const myBushId = localMe ? getHidingBushId(localMe.x, localMe.y, PLAYER_RADIUS, currentMap) : null;

          let isVisible = true;
          if (player.role === 'hider' && player.status === 'alive') {
            if (playerBushId && meIsSeeker) {
              isVisible = (playerBushId === myBushId);
            }
          }
          if (!isVisible) continue;
        }

        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        if (pt.type === 'confetti') {
          ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        } else if (pt.type === 'trail') {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.globalAlpha = pt.alpha * 0.45;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw Active Pings inside camera context
      pingsRef.current.forEach(ping => {
        ping.radius += 2.5;
        ping.life -= deltaTime * 1.5;

        ctx.save();
        ctx.strokeStyle = ping.color;
        ctx.globalAlpha = Math.max(0, ping.life);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(ping.x, ping.y, ping.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = ping.color;
        ctx.beginPath();
        ctx.arc(ping.x, ping.y, Math.min(ping.radius * 0.3, 8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      pingsRef.current = pingsRef.current.filter(p => p.life > 0);

      ctx.restore();

      // 7. DRAW MINIMAP OVERLAY ON SEPARATE FLOATING CANVAS & FULL TACTICAL MAP MODAL
      const miniCanvas = minimapCanvasRef.current;
      if (miniCanvas && isMinimapOpen) {
        const mctx = miniCanvas.getContext('2d');
        if (mctx) {
          drawTopDownMap(
            mctx,
            miniCanvas.width,
            miniCanvas.height,
            currentMap,
            playersList,
            currentPlayerId,
            localMe,
            meIsSeeker,
            timestamp,
            [],
            pingsRef.current,
            cameraRef,
            cw,
            ch,
            zoomRef.current,
            room.gameState,
            false
          );
        }
      }

      const fullCanvas = fullMapCanvasRef.current;
      if (fullCanvas && isFullMapOpen) {
        const fctx = fullCanvas.getContext('2d');
        if (fctx) {
          drawTopDownMap(
            fctx,
            fullCanvas.width,
            fullCanvas.height,
            currentMap,
            playersList,
            currentPlayerId,
            localMe,
            meIsSeeker,
            timestamp,
            [],
            pingsRef.current,
            cameraRef,
            cw,
            ch,
            zoomRef.current,
            room.gameState,
            true
          );
        }
      }

      // 8. WINNING CELEBRATION EFFECTS
      if (room.gameState === 'ended' && Math.random() < 0.12) {
        const randX = Math.random() * MAP_WIDTH;
        const colors = ['#facc15', '#f97316', '#38bdf8', '#f472b6', '#4ade80'];
        spawnParticles(randX, 10, 'confetti', colors[Math.floor(Math.random() * colors.length)], 8);
      }

      // Record drawing / render phase timing and total frame duration
      const renderEnd = performance.now();
      renderTimeRef.current = renderEnd - updateEnd;
      frameTimeRef.current = renderEnd - frameStart;

      // Throttle performance overlay React updates to once every 500ms to maintain peak rendering efficiency
      if (!lastPerfUpdateTimeRef.current) lastPerfUpdateTimeRef.current = timestamp;
      if (timestamp - lastPerfUpdateTimeRef.current >= 500) {
        setPerfStats({
          cpu: cpuUpdateTimeRef.current,
          render: renderTimeRef.current,
          frame: frameTimeRef.current,
        });
        lastPerfUpdateTimeRef.current = timestamp;
      }
      } catch (loopErr) {
        console.error("[GAME LOOP ERROR RECOVERED]", loopErr);
      } finally {
        requestRef.current = requestAnimationFrame(gameLoop);
      }
    };

    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [currentPlayerId]);

  // Touch handlers for mobile Joystick (Multi-Touch Resilient 360° Analog Joystick) & Pinch-to-Zoom
  const lastTapTimeRef = useRef<number>(0);

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300 && e.touches.length === 1) {
      resetZoom();
      lastTapTimeRef.current = 0;
      return;
    }
    lastTapTimeRef.current = now;
    handleTouchStart(e);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Two-finger pinch gesture initialization
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const isJoystickArea = (t1.clientX < window.innerWidth * 0.45 && t1.clientY > window.innerHeight * 0.5) ||
                            (t2.clientX < window.innerWidth * 0.45 && t2.clientY > window.innerHeight * 0.5);
      if (!isJoystickArea) {
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        pinchInitialDistRef.current = dist;
        pinchInitialTargetRef.current = userZoomTargetRef.current;
        return;
      }
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < window.innerWidth * 0.55 && joystickTouchIdRef.current === null) {
        joystickTouchIdRef.current = touch.identifier;
        joystickCenterRef.current = { x: touch.clientX, y: touch.clientY };
        joystickVectorRef.current = { dx: 0, dy: 0, length: 0 };
        setJoystickUI({
          active: true,
          startX: touch.clientX,
          startY: touch.clientY,
          currX: touch.clientX,
          currY: touch.clientY
        });
        break;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Two-finger pinch gesture scaling
    if (e.touches.length === 2 && pinchInitialDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleRatio = dist / pinchInitialDistRef.current;
      const newTarget = Math.max(0.5, Math.min(2.0, pinchInitialTargetRef.current * scaleRatio));
      
      userZoomTargetRef.current = newTarget;
      setZoomLevelDisplay(Math.round(newTarget * 100));
      let determinedMode: 'normal' | 'wide' | 'custom' = 'custom';
      if (Math.abs(newTarget - 1.0) < 0.05) determinedMode = 'normal';
      else if (Math.abs(newTarget - 0.5) < 0.05) determinedMode = 'wide';
      setZoomMode(determinedMode);

      try {
        localStorage.setItem('hide_seek_zoom_mult', newTarget.toString());
      } catch (err) {}
      return;
    }

    if (joystickTouchIdRef.current === null || !joystickCenterRef.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const rawDx = touch.clientX - joystickCenterRef.current.x;
        const rawDy = touch.clientY - joystickCenterRef.current.y;
        const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
        const deadZone = 6.0; // 6px deadzone
        const maxRadius = 48.0; // 48px max radius

        if (dist < deadZone) {
          joystickVectorRef.current = { dx: 0, dy: 0, length: 0 };
          setJoystickUI(prev => ({ ...prev, currX: joystickCenterRef.current!.x, currY: joystickCenterRef.current!.y }));
        } else {
          const clampedDist = Math.min(dist, maxRadius);
          const speedMult = Math.min((dist - deadZone) / (maxRadius - deadZone), 1.0);
          const normDx = (rawDx / dist) * speedMult;
          const normDy = (rawDy / dist) * speedMult;
          joystickVectorRef.current = { dx: normDx, dy: normDy, length: speedMult };

          const knobX = joystickCenterRef.current.x + (rawDx / dist) * clampedDist;
          const knobY = joystickCenterRef.current.y + (rawDy / dist) * clampedDist;
          setJoystickUI(prev => ({ ...prev, currX: knobX, currY: knobY }));
        }
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchInitialDistRef.current = null;
    }

    if (joystickTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        joystickCenterRef.current = null;
        joystickVectorRef.current = { dx: 0, dy: 0, length: 0 };
        setJoystickUI({ active: false, startX: 0, startY: 0, currX: 0, currY: 0 });
        break;
      }
    }
  };

  // Mouse wheel zoom support for desktop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
      applyUserZoom(userZoomTargetRef.current + zoomDelta);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [isSceneReady]);

  // Compute stats details
  const alivePlayers = Object.values(room.players).filter(p => p.role === 'hider' && p.status === 'alive');
  const allHiders = Object.values(room.players).filter(p => p.role === 'hider');

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerEmote = (emoji: string) => {
    soundManager.playClick();
    onSendEmote(emoji);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleEnterGame = () => {
    soundManager.playClick();
    setIsLoadingAssets(false);
    
    // Attempt fullscreen mode
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  const currentMapObj = getMapById(room.activeMapId || room.settings.mapId || 'meadow');
  const localPlayerObj = room.players[currentPlayerId];
  const activeZoneObj = localPlayerObj ? getLandmarkZoneAt(currentMapObj, localPlayerObj.x, localPlayerObj.y) : null;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-950 text-white overflow-hidden select-none z-40 flex flex-col items-stretch font-sans" id="game-root-fullscreen">
      
      {/* MAIN CAMERA VIEW WRAPPER */}
      <div ref={containerRef} className="relative flex-grow min-h-0 w-full h-full flex items-center justify-center" id="game-viewport-frame">
        {/* 1. GAME CANVAS (ALWAYS MOUNTED IMMEDIATELY) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block touch-none cursor-crosshair bg-slate-950"
          style={{ transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}
          id="game-canvas"
          onTouchStart={handleCanvasTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onDoubleClick={() => resetZoom()}
          onPointerDown={(e) => {
            if (isMobile) return;
            if (e.button !== 0) return; // Left click only
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch (err) {}
            isMouseDownRef.current = true;
            mousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
          }}
          onPointerMove={(e) => {
            if (isMouseDownRef.current) {
              mousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
            }
          }}
          onPointerUp={(e) => {
            isMouseDownRef.current = false;
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch (err) {}
          }}
          onPointerCancel={() => {
            isMouseDownRef.current = false;
          }}
        />

        {/* 2. ASSET ERROR DISPLAY OVERLAY */}
        {assetError && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center" id="asset-error-overlay">
            <div className="max-w-md p-6 bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl space-y-4">
              <div className="text-4xl">⚠️</div>
              <h2 className="text-xl font-black uppercase text-rose-400 tracking-wide">Map Asset Error</h2>
              <p className="text-xs text-slate-300 font-medium">{assetError}</p>
              <button
                onClick={() => {
                  setAssetError(null);
                  setIsLoadingAssets(true);
                  setLoadingProgress(0);
                }}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Retry Loading
              </button>
            </div>
          </div>
        )}

        {/* 3. ASSET CACHING & LOADING OVERLAY */}
        {isLoadingAssets && !assetError && (
          <div className="absolute inset-0 w-full h-full bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 select-none z-45 font-sans" id="assets-loading-screen">
            <div className="text-center max-w-md w-full space-y-8 p-8 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl">
              <div className="space-y-3">
                <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-toy-blue via-sky-400 to-teal-400 bg-clip-text text-transparent uppercase font-display">
                  LULU SEEK!
                </h1>
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
                  CACHING ARENA & CONNECTING...
                </p>
              </div>

              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5 relative p-0.5">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-toy-blue to-teal-400 rounded-full"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 font-bold">
                  <span>{loadingProgress === 100 ? 'ASSETS SYNCHRONIZED' : 'LOADING SHADERS & MODELS...'}</span>
                  <span>{loadingProgress}%</span>
                </div>
              </div>

              <div className="text-center text-xs text-slate-400 font-bold italic animate-pulse min-h-[32px] flex items-center justify-center">
                {loadingProgress < 25 ? '"Polishing running shoes..."' :
                 loadingProgress < 50 ? '"Drawing trees and scattering bushes..."' :
                 loadingProgress < 75 ? '"Calibrating radar signals..."' :
                 loadingProgress < 100 ? '"Hiding dust bunnies under carpets..."' :
                 '"Checking cupboards for snacks..."'}
              </div>

              {loadingProgress === 100 && (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={handleEnterGame}
                  className="w-full py-4 bg-gradient-to-r from-toy-blue to-teal-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black rounded-2xl shadow-xl hover:shadow-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer text-sm uppercase tracking-wider animate-bounce"
                  id="enter-arena-btn"
                >
                  🎮 Enter Match Area
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* 4. PREVENT HUD FROM RENDERING WITHOUT ACTUAL GAME SCENE */}
        {isSceneReady && !assetError && (
          <>
        {/* FULLSCREEN RE-ENTRY PROMPT BANNER */}
        {needsFullscreenClick && !isFullscreen && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-auto" id="fullscreen-prompt-banner">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                userExitedFullscreenRef.current = false;
                enterFullscreen();
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-1.5 rounded-full text-xs uppercase tracking-wider shadow-2xl flex items-center gap-1.5 animate-bounce cursor-pointer border-2 border-slate-900"
            >
              <span>⛶ Tap to Enter Fullscreen</span>
            </button>
          </div>
        )}
        {/* FLOATING HUD TOP BAR (Sleek, Compact & Low Profile for Mobile) */}
        <div className="absolute top-1.5 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 z-30 flex items-center justify-between pointer-events-none" id="floating-top-bar">
          
          {/* Top Left: Phase Badge & Sidebar Toggle */}
          <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
            <button
              onClick={() => {
                soundManager.playClick();
                setIsSidebarOpen(!isSidebarOpen);
              }}
              className="bg-slate-900/85 hover:bg-slate-800 border border-white/10 rounded-lg p-1.5 sm:p-2 text-white shadow-xl transition active:scale-95 flex items-center justify-center cursor-pointer"
              title="Toggle Scoreboard"
              id="sidebar-toggle-btn"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-toy-blue" />
            </button>

            <div className="bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 flex items-center gap-1.5 shadow-xl">
              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${room.gameState === 'hiding' ? 'bg-toy-orange animate-pulse' : 'bg-toy-green animate-ping'}`} />
              <div>
                <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {room.gameState === 'hiding' ? 'HIDING PHASE' : 'ACTIVE HUNT'}
                </p>
                <p className="text-[9.5px] sm:text-[11px] font-black text-white uppercase tracking-tight mt-0.5 leading-none">
                  {currentMap === getMapById('graveyard') ? 'Graveyard 🪦' : currentMap === getMapById('toybox') ? 'Sandbox 🧸' : 'Meadow ☀️'}
                </p>
              </div>
            </div>
          </div>

          {/* Top Center: Interactive Prominent Sports Timer with Live Progress Bar */}
          <button
            onClick={() => {
              soundManager.playClick();
              setIsTimerOverlayExpanded(!isTimerOverlayExpanded);
            }}
            className={`bg-slate-900/90 backdrop-blur-md border rounded-xl px-3 py-1 sm:px-4 sm:py-1.5 flex flex-col items-center justify-center shadow-2xl pointer-events-auto min-w-[100px] sm:min-w-[130px] transition cursor-pointer hover:scale-105 active:scale-95 group relative overflow-hidden ${
              room.gameState === 'hiding'
                ? 'border-amber-500/80 bg-amber-950/40 text-amber-300 shadow-amber-500/20'
                : room.matchTimer <= 30
                ? 'border-rose-500 bg-rose-950/80 text-rose-300 animate-pulse shadow-rose-500/30'
                : 'border-toy-orange/60 hover:border-toy-orange text-white'
            }`}
            id="prominent-timer"
            title="Click to toggle full round timer overlay [T]"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                room.gameState === 'hiding'
                  ? 'text-amber-400 animate-pulse'
                  : room.matchTimer <= 30
                  ? 'text-rose-400 animate-bounce'
                  : 'text-toy-orange animate-pulse'
              }`} />
              <div className="text-center">
                <p className="text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-widest text-slate-400 leading-none flex items-center gap-1 justify-center">
                  <span>{room.gameState === 'hiding' ? 'HIDING' : room.matchTimer <= 30 ? 'SUDDEN DEATH' : 'TIME LEFT'}</span>
                  <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity text-sky-400 font-mono">[T]</span>
                </p>
                <p className="font-mono font-black text-xs sm:text-base tracking-tight mt-0.5 leading-none">
                  {room.gameState === 'hiding' ? `${room.hideCountdown}s` : formatTime(room.matchTimer)}
                </p>
              </div>
            </div>

            {/* Live Progress Bar at bottom edge of timer badge */}
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1 border border-white/5">
              <div 
                className={`h-full transition-all duration-300 ${
                  room.gameState === 'hiding'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                    : room.matchTimer <= 30
                    ? 'bg-gradient-to-r from-rose-500 to-red-400'
                    : 'bg-gradient-to-r from-teal-400 to-sky-400'
                }`}
                style={{
                  width: `${
                    room.gameState === 'hiding'
                      ? Math.max(0, Math.min(100, (room.hideCountdown / (room.settings.hideTime || 30)) * 100))
                      : Math.max(0, Math.min(100, (room.matchTimer / ((room.settings.matchDuration || 3) * 60)) * 100))
                  }%`
                }}
              />
            </div>
          </button>

          {/* Top Right: Stats / Performance & Settings button */}
          <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto relative">
            <button
              type="button"
              onClick={handleTogglePerfOverlay}
              className={`bg-slate-900/85 backdrop-blur-md border rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 flex items-center gap-1.5 sm:gap-2.5 text-[9px] sm:text-[10px] font-bold shadow-xl transition cursor-pointer ${
                showPerfOverlay ? 'border-cyan-400 text-cyan-300 bg-slate-900' : 'border-white/10 text-slate-300 hover:bg-slate-800'
              }`}
              title="Toggle Performance Diagnostics Overlay"
              id="perf-toggle-btn"
            >
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${ping < 50 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{ping}ms</span>
              </div>
              <div className="border-r border-white/10 h-3" />
              <div>
                {Math.round(fpsRef.current)} FPS
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsSettingsOpen(true);
              }}
              className="bg-slate-900/85 hover:bg-slate-800 border border-white/10 rounded-lg p-1.5 sm:p-2 text-white shadow-xl transition active:scale-95 flex items-center justify-center cursor-pointer"
              title="Settings Menu"
              id="settings-trigger-btn"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 hover:rotate-45 transition-transform" />
            </button>

            {/* IN-GAME PERFORMANCE OVERLAY PANEL */}
            {showPerfOverlay && (
              <div
                className="absolute top-10 right-0 z-50 bg-slate-950/95 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 text-[9.5px] sm:text-[10.5px] font-mono text-cyan-200 shadow-2xl pointer-events-auto w-72 sm:w-80 space-y-2 animate-in fade-in duration-150 select-text"
                id="perf-overlay-panel"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 font-bold text-white uppercase text-[9px] sm:text-[10px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"/>
                    PERFORMANCE & NETWORK DIAGNOSTICS
                  </span>
                  <button
                    type="button"
                    onClick={handleClosePerfOverlay}
                    onTouchEnd={handleClosePerfOverlay}
                    className="text-slate-400 hover:text-white text-sm cursor-pointer p-1.5 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center shrink-0 min-w-[28px] min-h-[28px]"
                    title="Close Diagnostics"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                  <div>FPS: <span className="font-bold text-emerald-400">{Math.round(fpsRef.current)}</span></div>
                  <div>Latency: <span className={`font-bold ${ping > 100 ? 'text-rose-400' : ping > 50 ? 'text-amber-300' : 'text-emerald-400'}`}>{ping}ms</span></div>
                  <div>Frame Time: <span className="text-white">{perfStats.frame.toFixed(1)}ms</span></div>
                  <div>Packet Rate: <span className="text-white">{packetRate} p/s</span></div>
                  <div>Update CPU: <span className="text-white">{perfStats.cpu.toFixed(1)}ms</span></div>
                  <div>Render GPU: <span className="text-white">{perfStats.render.toFixed(1)}ms</span></div>
                </div>

                {/* Real-time D3 Ping Chart Component */}
                <div className="pt-2 border-t border-cyan-500/20">
                  <PingLatencyChart currentPing={ping} packetRate={packetRate} height={120} compact={false} />
                </div>

                <div className="border-t border-cyan-500/20 pt-1.5 flex justify-between text-[9px] text-slate-400">
                  <span>Active Game Objects:</span>
                  <span className="font-bold text-white">
                    {particlePoolRef.current.filter(p => p.active).length + Object.keys(localPlayersRef.current).length + renderedObstaclesCountRef.current}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FLOATING CAMERA & VIEWPORT CONTROLS PANEL */}
        {isCameraPanelMinimized ? (
          <button
            type="button"
            onClick={restorePanel}
            className="absolute top-12 right-2 sm:top-14 sm:right-3 z-30 pointer-events-auto bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-cyan-400/50 p-2 sm:p-2.5 rounded-xl text-cyan-300 shadow-2xl active:scale-90 transition cursor-pointer flex items-center gap-1.5 font-black text-xs animate-fade-in"
            title="Expand Camera Panel (+)"
            id="expand-camera-panel-btn"
          >
            <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono text-white font-bold">{zoomLevelDisplay}%</span>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          <div className="absolute top-12 right-2 sm:top-14 sm:right-3 z-30 pointer-events-auto flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-xl p-1.5 shadow-2xl animate-fade-in" id="camera-control-panel">
            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                if (isFullscreen) exitFullscreen();
                else enterFullscreen();
              }}
              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                isFullscreen ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-200'
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              id="fullscreen-toggle-btn"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <div className="w-px h-4 bg-white/15 mx-0.5" />

            {/* Mode Presets: Normal (100% / 1.0x) vs Wide (50% / 0.5x) */}
            <button
              type="button"
              onClick={setNormalView}
              className={`px-2 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 ${
                zoomMode === 'normal' ? 'bg-toy-blue text-slate-950 font-extrabold shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Normal View (1.0x)"
              id="zoom-normal-mode-btn"
            >
              Normal
            </button>
            <button
              type="button"
              onClick={setWideView}
              className={`px-2 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 ${
                zoomMode === 'wide' ? 'bg-teal-400 text-slate-950 font-extrabold shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Wide View (0.5x)"
              id="zoom-wide-mode-btn"
            >
              Wide
            </button>

            <div className="w-px h-4 bg-white/15 mx-0.5" />

            {/* Manual Zoom Out (-) */}
            <button
              type="button"
              onClick={zoomOut}
              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-black text-xs flex items-center justify-center active:scale-90 transition cursor-pointer"
              title="Zoom Out (−)"
              id="zoom-out-btn"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Current Zoom Percentage Indicator / Reset Button */}
            <button
              type="button"
              onClick={resetZoom}
              className="px-1.5 py-0.5 rounded bg-slate-950 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300 hover:text-white hover:border-cyan-400 active:scale-95 transition cursor-pointer min-w-[38px] text-center"
              title="Reset Zoom to Default (100%)"
              id="zoom-reset-badge-btn"
            >
              {zoomLevelDisplay}%
            </button>

            {/* Manual Zoom In (+) */}
            <button
              type="button"
              onClick={zoomIn}
              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-black text-xs flex items-center justify-center active:scale-90 transition cursor-pointer"
              title="Zoom In (+)"
              id="zoom-in-btn"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-white/15 mx-0.5" />

            {/* Collapse Camera Panel (−) */}
            <button
              type="button"
              onClick={minimizePanel}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer active:scale-90 flex items-center justify-center"
              title="Minimize Camera Panel (−)"
              id="minimize-camera-panel-btn"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {isSidebarOpen && (
          <div className="absolute top-16 sm:top-20 left-2.5 sm:left-4 z-30 pointer-events-auto w-56 sm:w-64 bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col gap-3 sm:gap-4 max-h-[70vh]" id="immersive-hud-sidebar">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-toy-blue" />
                PLAYERS ({Object.keys(room.players).length})
              </h3>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-400 hover:text-white transition p-0.5 rounded hover:bg-white/5 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Players List */}
            <div className="space-y-1.5 overflow-y-auto max-h-[25vh] sm:max-h-[30vh] pr-1" id="sidebar-players-list">
              {Object.values(room.players).map((p) => {
                const bushId = getHidingBushId(p.x, p.y, PLAYER_RADIUS, currentMap);
                const isHiding = p.role === 'hider' && bushId && p.status === 'alive';

                const isFollowed = followedPlayerId === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      soundManager.playClick();
                      if (p.id !== currentPlayerId) {
                        if (followedPlayerId === p.id) {
                          cameraFocusRef.current = 'self';
                          setHasCustomCamera(false);
                          setFollowedPlayerId(null);
                        } else {
                          cameraFocusRef.current = p.id;
                          setHasCustomCamera(true);
                          setFollowedPlayerId(p.id);
                          trackEvent('spectator_follow_player', { target_player_id: p.id, room_code: room.code });
                        }
                      } else {
                        cameraFocusRef.current = 'self';
                        setHasCustomCamera(false);
                        setFollowedPlayerId(null);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition active:scale-98 ${
                      isFollowed
                        ? 'bg-amber-500/20 border-amber-400/80 shadow-lg shadow-amber-500/10'
                        : 'bg-white/5 border-white/5 hover:bg-white/15'
                    }`}
                    id={`sidebar-player-${p.id}`}
                    title="Click to track player camera"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full border border-black/30 shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate flex items-center gap-1 leading-none text-white">
                          {p.name}
                          {p.id === currentPlayerId && (
                            <span className="text-[7px] bg-toy-blue/20 text-toy-blue border border-toy-blue/30 px-1 py-0.2 rounded-full font-black">YOU</span>
                          )}
                          {isFollowed && (
                            <span className="text-[7px] bg-amber-400 text-slate-950 px-1 py-0.2 rounded-full font-black animate-pulse">FOLLOWING</span>
                          )}
                        </p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          {p.role === 'seeker' ? 'Seeker 🔍' : p.role === 'spectator' ? 'Spectator 👁️' : 'Hider 🟢'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 scale-90">
                      {p.role === 'spectator' && (
                        <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5">
                          SPECTATING
                        </span>
                      )}

                      {p.role === 'seeker' && (
                        <span className="text-[8px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded px-1.5 py-0.5">
                          TAGS: {p.score || 0}
                        </span>
                      )}

                      {p.role === 'hider' && (
                        p.status === 'found' ? (
                          <span className="text-[8px] font-black bg-slate-800 text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">
                            FOUND
                          </span>
                        ) : (
                          <span className={`text-[8px] font-black rounded px-1.5 py-0.5 border ${
                            isHiding 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {isHiding ? 'HIDDEN' : 'ALIVE'}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Logs activity feed */}
            <div className="border-t border-white/10 pt-2 flex flex-col gap-1.5 min-h-0 flex-grow" id="logs-deck">
              <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">📢 LIVE BROADCASTS</h4>
              <div className="overflow-y-auto space-y-1 text-[10px] sm:text-[11px] font-bold pr-1 text-slate-300 flex-grow" id="game-logs-container">
                {announcements.slice(-15).map((log, index) => (
                  <div key={index} className="leading-snug bg-white/5 border border-white/5 rounded-lg p-1.5 px-2 text-white" id={`log-item-${index}`}>
                    <span className="text-toy-orange mr-1">»</span>
                    {log}
                  </div>
                ))}
                <div ref={announcementEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* FLOATING ENLARGED RADAR MINIMAP (Bottom Right) */}
        {isMinimapOpen ? (
          <div 
            className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl p-2.5 w-[240px] sm:w-[270px] select-none z-30 rounded-2xl flex flex-col gap-1.5 pointer-events-auto"
            id="floating-radar-panel"
          >
            <div className="text-[9px] font-black uppercase tracking-wider pb-1 border-b border-white/10 flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="shrink-0">🗺️ Map</span>
                {activeZoneObj && (
                  <span 
                    className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-tight truncate border"
                    style={{ color: activeZoneObj.color, borderColor: activeZoneObj.borderColor, backgroundColor: activeZoneObj.bgFill }}
                  >
                    📍 {activeZoneObj.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => {
                    soundManager.playClick();
                    setIsFullMapOpen(true);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-sky-400 hover:text-sky-300 transition cursor-pointer"
                  title="Expand Tactical Map [M]"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => {
                    soundManager.playClick();
                    setIsMinimapOpen(false);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition cursor-pointer"
                  title="Collapse Minimap"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <canvas
              ref={minimapCanvasRef}
              width={240}
              height={150}
              onClick={(e) => handleMinimapInteraction(e.clientX, e.clientY, minimapCanvasRef.current)}
              className="w-full h-[140px] block rounded-xl cursor-crosshair hover:opacity-95 active:scale-[0.98] bg-slate-950/80 border border-white/10 transition-all duration-100 animate-fade-in shadow-inner"
              id="minimap-radar-canvas"
              title="Click to ping map"
            />
            <div className="text-[8px] text-center text-slate-400 font-bold uppercase tracking-tight flex items-center justify-between px-0.5">
              <span>Click: Ping</span>
              <span className="text-sky-400 font-mono">[M] Full Map</span>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => {
              soundManager.playClick();
              setIsMinimapOpen(true);
            }}
            className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-slate-900/85 hover:bg-slate-800 text-white border border-white/10 shadow-2xl p-3 sm:p-3.5 rounded-xl select-none z-30 hover:scale-105 active:scale-95 transition flex items-center justify-center cursor-pointer pointer-events-auto"
            id="minimap-collapsed-toggle"
            title="Expand Radar"
          >
            <Map className="w-5 h-5 text-toy-blue" />
          </button>
        )}

        {/* EXPANDED FULL MAP TACTICAL MODAL OVERLAY */}
        {isFullMapOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in pointer-events-auto" id="full-map-modal-overlay">
            <div className="max-w-5xl w-full bg-slate-900 border border-sky-500/30 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 flex flex-col max-h-[92vh] overflow-hidden">
              
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-500/20 border border-sky-400/30 rounded-xl text-sky-400">
                    <Map className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <span>{(currentMapObj as any).name || (room.activeMapId === 'graveyard' ? 'Spooky Graveyard' : room.activeMapId === 'toybox' ? 'Toybox Playground' : 'Sunny Meadow')}</span>
                      <span className="text-xs font-mono font-normal text-sky-400 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded-full">
                        TACTICAL OVERLAY
                      </span>
                    </h2>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
                      <span>📍 Location:</span>
                      {activeZoneObj ? (
                        <span className="font-mono font-bold text-sky-300" style={{ color: activeZoneObj.color }}>
                          {activeZoneObj.name}
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">Open Map</span>
                      )}
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-slate-400">
                        X: {Math.round(localPlayerObj?.x || 0)}, Y: {Math.round(localPlayerObj?.y || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setIsFullMapOpen(false);
                  }}
                  className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="Close Map [Esc / M]"
                >
                  <span className="hidden sm:inline font-mono text-[10px] text-slate-400">[M]</span>
                  <span className="text-base font-black">✕</span>
                </button>
              </div>

              {/* MAIN BODY: CANVAS + SIDEBAR */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow min-h-0 overflow-y-auto pr-1">
                
                {/* LEFT / CENTER: CANVAS */}
                <div className="md:col-span-2 flex flex-col items-center justify-center bg-slate-950/80 border border-white/10 rounded-2xl p-3 relative group">
                  <canvas
                    ref={fullMapCanvasRef}
                    width={720}
                    height={520}
                    onClick={(e) => handleMinimapInteraction(e.clientX, e.clientY, fullMapCanvasRef.current)}
                    className="w-full h-auto max-h-[50vh] sm:max-h-[55vh] object-contain rounded-xl cursor-crosshair bg-slate-950 border border-white/5 shadow-2xl"
                    title="Click to drop tactical ping on map"
                  />
                  <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between w-full mt-2.5 px-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block" />
                      Click anywhere on map to drop tactical ping for teammates
                    </span>
                    <span className="font-mono text-xs text-sky-400 font-semibold hidden sm:inline-block">
                      Zoom Box: Cyan Camera Frame
                    </span>
                  </div>
                </div>

                {/* RIGHT SIDEBAR: LANDMARK ZONES INTELLIGENCE */}
                <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3 flex flex-col space-y-3 min-h-0 overflow-y-auto">
                  <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center justify-between border-b border-white/10 pb-2">
                    <span>Landmark Zones</span>
                    <span className="text-[10px] font-mono text-sky-400">8 Regions</span>
                  </h3>

                  <div className="space-y-1.5 flex-grow overflow-y-auto pr-1 no-scrollbar">
                    {getLandmarkZonesForMap(currentMapObj).map((zone) => {
                      const isCurrent = activeZoneObj?.id === zone.id;
                      return (
                        <button
                          key={zone.id}
                          onClick={() => {
                            soundManager.playClick();
                            cameraFocusRef.current = { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
                            setHasCustomCamera(true);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                            isCurrent
                              ? 'bg-sky-500/15 border-sky-400/60 shadow-lg ring-1 ring-sky-400/40'
                              : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 border border-white/20 shadow-sm"
                              style={{ backgroundColor: zone.color }}
                            />
                            <div className="truncate">
                              <div className="text-xs font-bold tracking-wide text-white group-hover:text-sky-300 transition">
                                {zone.name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {Math.round(zone.x)}–{Math.round(zone.x + zone.width)}, {Math.round(zone.y)}–{Math.round(zone.y + zone.height)}
                              </div>
                            </div>
                          </div>

                          {isCurrent ? (
                            <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-sky-400 text-slate-950 shrink-0 animate-pulse">
                              YOU ARE HERE
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 group-hover:text-sky-400 opacity-0 group-hover:opacity-100 transition shrink-0">
                              Focus Camera
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* QUICK SYMBOL LEGEND */}
                  <div className="border-t border-white/10 pt-2.5 space-y-1 text-[10px] text-slate-400">
                    <div className="font-bold text-slate-300 uppercase tracking-wider text-[9px] mb-1">
                      Tactical Legend
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0" />
                        <span>Hiding Bush</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-slate-300 shrink-0" />
                        <span>Structure Wall</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-amber-500 shrink-0" />
                        <span>Special Spot</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-sky-400 shrink-0" />
                        <span>Water Body</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-sky-400 ring-2 ring-sky-300 shrink-0" />
                        <span>You (Self)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-rose-500 shrink-0" />
                        <span>Seeker</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* CENTER CAMERA RESET UI OVERLAY */}
        {hasCustomCamera && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-white/10 shadow-2xl px-4 py-2 rounded-xl z-30 flex items-center gap-3 animate-bounce pointer-events-auto">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Panned Camera</span>
            <button
              onClick={() => {
                soundManager.playClick();
                cameraFocusRef.current = 'self';
                setHasCustomCamera(false);
              }}
              className="px-2.5 py-1 bg-toy-blue hover:bg-sky-400 text-slate-950 text-[9px] font-black uppercase rounded-lg transition active:scale-95 cursor-pointer"
            >
              Reset Camera
            </button>
          </div>
        )}

        {/* CENTER STAGE HIDING PHASE COUNTDOWN OVERLAY BANNER */}
        {room.gameState === 'hiding' && !isHidingBannerDismissed && (
          <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-35 pointer-events-auto max-w-md w-[92%] sm:w-full animate-in fade-in slide-in-from-top-4 duration-200" id="hiding-phase-overlay-banner">
            <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-amber-500/70 rounded-2xl shadow-2xl p-3 sm:p-4 text-white flex flex-col gap-2.5 relative overflow-hidden ring-4 ring-amber-500/10">
              
              {/* Glow highlight background */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-2 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center font-mono font-black text-amber-400 text-sm animate-pulse">
                    ⏱️
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <span>HIDING PHASE COUNTDOWN</span>
                    </h3>
                    <p className="text-[10px] text-slate-300 font-medium">
                      {localPlayerObj?.role === 'seeker'
                        ? '🙈 Seekers are currently blinded!'
                        : '🏃 Seekers are blinded! Sprint to a bush or hiding spot!'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400 animate-pulse tracking-tight drop-shadow-md">
                    {room.hideCountdown}s
                  </span>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setIsHidingBannerDismissed(true);
                    }}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                    title="Dismiss Banner"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1 relative z-10">
                <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, (room.hideCountdown / (room.settings.hideTime || 30)) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400 px-0.5">
                  <span>0s</span>
                  <span>{room.settings.hideTime || 30}s Total Hide Time</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* EXPANDED ROUND TIMER TACTICAL MODAL OVERLAY */}
        {isTimerOverlayExpanded && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in pointer-events-auto" id="round-timer-overlay-modal">
            <div className="max-w-md w-full bg-slate-900 border-2 border-toy-orange/50 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 flex flex-col relative overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-toy-orange/20 border border-toy-orange/40 rounded-2xl text-toy-orange">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wider flex items-center gap-2">
                      Round Timer
                    </h2>
                    <div className="text-xs text-slate-400 font-medium">
                      Synced with room match state
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setIsTimerOverlayExpanded(false);
                  }}
                  className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition cursor-pointer font-bold text-xs"
                  title="Close Timer Overlay [Esc / T]"
                >
                  ✕
                </button>
              </div>

              {/* Main Countdown Display */}
              <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-5 text-center space-y-3 relative overflow-hidden">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider border shadow-md"
                  style={{
                    backgroundColor: room.gameState === 'hiding' ? 'rgba(245, 158, 11, 0.15)' : room.matchTimer <= 30 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                    borderColor: room.gameState === 'hiding' ? 'rgba(245, 158, 11, 0.4)' : room.matchTimer <= 30 ? 'rgba(244, 63, 94, 0.6)' : 'rgba(56, 189, 248, 0.4)',
                    color: room.gameState === 'hiding' ? '#f59e0b' : room.matchTimer <= 30 ? '#f43f5e' : '#38bdf8'
                  }}>
                  {room.gameState === 'hiding' ? '⏳ HIDING PHASE' : room.matchTimer <= 30 ? '⚠️ SUDDEN DEATH MODE' : '🔍 ACTIVE HUNT'}
                </div>

                <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight drop-shadow-lg">
                  {room.gameState === 'hiding' ? `${room.hideCountdown}s` : formatTime(room.matchTimer)}
                </div>

                {/* Dynamic Progress Bar */}
                <div className="space-y-1 pt-1">
                  <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        room.gameState === 'hiding'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                          : room.matchTimer <= 30
                          ? 'bg-gradient-to-r from-rose-500 to-red-400'
                          : 'bg-gradient-to-r from-teal-400 via-sky-400 to-emerald-400'
                      }`}
                      style={{
                        width: `${
                          room.gameState === 'hiding'
                            ? Math.max(0, Math.min(100, (room.hideCountdown / (room.settings.hideTime || 30)) * 100))
                            : Math.max(0, Math.min(100, (room.matchTimer / ((room.settings.matchDuration || 3) * 60)) * 100))
                        }%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
                    <span>Remaining Time</span>
                    <span>
                      {room.gameState === 'hiding'
                        ? `${Math.round((room.hideCountdown / (room.settings.hideTime || 30)) * 100)}%`
                        : `${Math.round((room.matchTimer / ((room.settings.matchDuration || 3) * 60)) * 100)}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Statistics & Settings Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Alive Hiders</div>
                  <div className="text-sm font-black text-emerald-400 font-mono">
                    {alivePlayers.length} / {allHiders.length}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Seekers</div>
                  <div className="text-sm font-black text-rose-400 font-mono">
                    {Object.values(room.players).filter(p => p.role === 'seeker').length}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hide Duration</div>
                  <div className="text-xs font-bold text-slate-200 font-mono">
                    {room.settings.hideTime || 30} seconds
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Match Time</div>
                  <div className="text-xs font-bold text-slate-200 font-mono">
                    {room.settings.matchDuration || 3} minutes
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <button
                onClick={() => {
                  soundManager.playClick();
                  setIsTimerOverlayExpanded(false);
                }}
                className="w-full py-3 bg-gradient-to-r from-toy-blue to-teal-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg transition cursor-pointer text-xs uppercase tracking-wider"
              >
                Return to Gameplay
              </button>

            </div>
          </div>
        )}

        {/* SPECTATOR HUD & PLAYER FOLLOW TOGGLE BAR */}
        {(currentPlayer?.role === 'spectator' || currentPlayer?.status === 'found') && !isSidebarOpen && (
          <div className="absolute top-16 sm:top-20 left-2.5 sm:left-4 z-30 flex flex-col gap-2 pointer-events-auto max-w-[280px] sm:max-w-xs" id="spectator-hud-panel">
            {/* Spectator Status Badge */}
            <div className="bg-slate-900/90 border border-amber-500/30 backdrop-blur-md rounded-xl px-3 py-1.5 text-[10px] font-black text-amber-400 flex items-center justify-between gap-2 shadow-2xl">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>{currentPlayer?.role === 'spectator' ? '👁️ SPECTATOR MODE' : '👻 SPECTATING GHOST'}</span>
              </div>
              {followedPlayerId && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    cameraFocusRef.current = 'self';
                    setHasCustomCamera(false);
                    setFollowedPlayerId(null);
                  }}
                  className="text-[9px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded px-1.5 py-0.5 cursor-pointer font-bold transition active:scale-95"
                  id="spectator-reset-cam-btn"
                >
                  Reset Camera ↺
                </button>
              )}
            </div>

            {/* Player Camera Follow Selectors */}
            <div className="bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1.5">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Follow Player:</span>
                {followedPlayerId ? (
                  <span className="text-amber-400 font-bold truncate max-w-[110px]">
                    🎥 {room.players[followedPlayerId]?.name || 'Player'}
                  </span>
                ) : (
                  <span className="text-slate-500 font-medium">Click icon to follow</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar" id="spectator-players-bar">
                {Object.values(room.players)
                  .filter(p => p.id !== currentPlayerId && p.role !== 'spectator')
                  .map(p => {
                    const isTarget = followedPlayerId === p.id;
                    const isSeeker = p.role === 'seeker';
                    const isAlive = p.status === 'alive';

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          if (isTarget) {
                            cameraFocusRef.current = 'self';
                            setHasCustomCamera(false);
                            setFollowedPlayerId(null);
                          } else {
                            cameraFocusRef.current = p.id;
                            setHasCustomCamera(true);
                            setFollowedPlayerId(p.id);
                            trackEvent('spectator_follow_player', { target_player_id: p.id, room_code: room.code });
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition cursor-pointer shrink-0 active:scale-95 ${
                          isTarget
                            ? 'bg-amber-500/25 border-amber-400 text-white shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                        }`}
                        title={`Click to follow ${p.name}'s camera view`}
                        id={`spectator-follow-btn-${p.id}`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full border border-black/30 shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="truncate max-w-[70px]">{p.name}</span>
                        <span className="text-[8px] opacity-80">
                          {isSeeker ? '🔍' : isAlive ? '🟢' : '💀'}
                        </span>
                        {isTarget && (
                          <span className="text-[8px] bg-amber-400 text-slate-950 px-1 rounded-full font-black animate-pulse">
                            LIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* SEEKER LOCKED OVERLAY (COUNTDOWN TO RELEASE) */}
        {room.gameState === 'hiding' && currentPlayer?.role === 'seeker' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 border-4 border-toy-orange z-35" id="seeker-overlay">
            <AlertTriangle className="w-16 h-16 text-toy-orange mb-4 animate-bounce" />
            <h3 className="text-2xl font-black text-white tracking-tight uppercase">YOU ARE THE SEEKER</h3>
            <p className="text-slate-400 max-w-sm mt-2 text-xs leading-relaxed font-semibold">
              The hiders are scattering to hide! Get ready. You will be released in:
            </p>
            <div className="font-mono font-black text-8xl text-toy-yellow mt-6 animate-pulse">
              {room.hideCountdown}s
            </div>
          </div>
        )}

        {/* MOBILE 360° ANALOG JOYSTICK HUD (Static Base + Dynamic Active Touch) */}
        {isMobile && (
          <>
            {/* Static resting joystick base guide on bottom-left */}
            {!joystickUI.active && (
              <div
                className="absolute bottom-6 left-6 z-30 w-28 h-28 rounded-full border-2 border-white/15 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center pointer-events-none"
                id="static-joystick-guide"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20" />
              </div>
            )}

            {/* Active touch-dragged joystick ring and knob */}
            {joystickUI.active && (
              <div 
                className="absolute z-30 pointer-events-none rounded-full border-2 border-sky-400/60 flex items-center justify-center shadow-2xl animate-fade-in"
                style={{
                  left: joystickUI.startX - 60,
                  top: joystickUI.startY - 60,
                  width: 120,
                  height: 120,
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(8px)',
                }}
                id="active-joystick-ring"
              >
                {/* Joystick Knob */}
                <div 
                  className="absolute w-12 h-12 rounded-full border-2 border-white/40 shadow-xl bg-gradient-to-tr from-sky-500 via-teal-400 to-emerald-300"
                  style={{
                    left: joystickUI.currX - joystickUI.startX + 36,
                    top: joystickUI.currY - joystickUI.startY + 36,
                  }}
                  id="active-joystick-knob"
                />
              </div>
            )}
          </>
        )}

        {/* LANDSCAPE ORIENTATION ADVICE OVERLAY FOR MOBILE PORTRAIT */}
        {isMobile && window.innerHeight > window.innerWidth && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-auto" id="landscape-prompt-overlay">
            <div className="max-w-xs p-6 bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl space-y-4">
              <RotateCw className="w-12 h-12 text-amber-400 mx-auto animate-spin" />
              <h3 className="text-lg font-black uppercase text-white tracking-wide">Rotate Device</h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Lulu Seek is optimized for landscape mode. Please turn your phone sideways for the expanded camera view and 360° joystick controls!
              </p>
              <button
                onClick={async () => {
                  try {
                    if (window.screen?.orientation && 'lock' in window.screen.orientation) {
                      await (window.screen.orientation as any).lock('landscape').catch(() => {});
                    }
                  } catch (e) {}
                }}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Lock Landscape
              </button>
            </div>
          </div>
        )}

        {/* MOBILE SPRINT TRIGGER BUTTON (Safely Separated from Radar & Joystick) */}
        {isMobile && currentPlayer?.role === 'hider' && currentPlayer?.status === 'alive' && (
          <button
            onTouchStart={() => {
              mobileSprintActive.current = true;
              setUiMobileSprintState(true);
            }}
            onTouchEnd={() => {
              mobileSprintActive.current = false;
              setUiMobileSprintState(false);
            }}
            className={`absolute z-30 w-16 h-16 rounded-full border-2 border-white/20 flex flex-col items-center justify-center font-black text-[10px] select-none cursor-pointer active:scale-90 transition-all shadow-2xl pointer-events-auto ${
              isMinimapOpen ? 'bottom-5 right-[236px]' : 'bottom-5 right-16'
            } ${
              uiMobileSprintState || isExhausted
                ? 'bg-toy-orange text-white animate-pulse'
                : 'bg-slate-900/85 backdrop-blur-md text-white'
            }`}
            id="mobile-sprint-btn"
          >
            <span>SPRINT</span>
            <span className="text-[8px] opacity-80 font-mono">{stamina}%</span>
          </button>
        )}

        {/* MOBILE TAG TRIGGER BUTTON FOR SEEKERS */}
        {isMobile && currentPlayer?.role === 'seeker' && currentPlayer?.status === 'alive' && room.gameState === 'playing' && (
          <button
            onClick={() => {
              const p = localPlayersRef.current[currentPlayerId];
              if (!p) return;
              (Object.values(localPlayersRef.current) as Player[]).forEach(other => {
                if (other.id !== p.id && other.role === 'hider' && other.status === 'alive') {
                  const dx = other.x - p.x;
                  const dy = other.y - p.y;
                  if (Math.sqrt(dx * dx + dy * dy) <= PLAYER_RADIUS * 2.5 + 10) {
                    onSendTagRef.current(other.id);
                    spawnParticles(other.x, other.y, 'spark', '#ef4444', 25);
                    triggerCameraShake(20);
                  }
                }
              });
            }}
            className={`absolute z-30 w-16 h-16 rounded-full border-2 border-white/20 flex flex-col items-center justify-center font-black text-[10px] select-none cursor-pointer active:scale-90 transition-all shadow-2xl pointer-events-auto bg-rose-600 hover:bg-rose-500 text-white animate-pulse ${
              isMinimapOpen ? 'bottom-5 right-[236px]' : 'bottom-5 right-16'
            }`}
            id="mobile-tag-btn"
          >
            <span>TAG!</span>
            <span className="text-[8px] opacity-90 font-mono">CATCH</span>
          </button>
        )}

        {/* FLOATING DYNAMIC EMOTE QUICK TRIGGER DECK */}
        {currentPlayer?.status === 'alive' && (
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-white/10 p-1.5 sm:p-2.5 rounded-2xl flex items-center gap-1.5 sm:gap-2 shadow-2xl max-w-[60vw] sm:max-w-[85%]" id="quick-emote-deck">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 hidden sm:inline-block flex items-center gap-1">
              <Smile className="w-4.5 h-4.5 text-toy-yellow shrink-0" /> EMOTE:
            </span>
            <div className="flex gap-1.5 overflow-x-auto pr-0.5 no-scrollbar">
              {EMOTES.map((em) => (
                <button
                  key={em.emoji}
                  onClick={() => triggerEmote(em.emoji)}
                  className="bg-white/5 hover:bg-white/15 border border-white/10 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition active:scale-90 cursor-pointer shrink-0"
                >
                  {em.emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SPRINT STAMINA GAUGE FOR DESKTOP HIDERS */}
        {!isMobile && currentPlayer?.role === 'hider' && currentPlayer?.status === 'alive' && (
          <div className="absolute bottom-4 left-4 z-30 bg-slate-900/85 backdrop-blur-md border border-white/10 p-3 shadow-2xl rounded-2xl w-48 flex flex-col gap-1.5 pointer-events-auto" id="stamina-panel">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-bold flex items-center gap-1">⚡ SPRINT ENERGY</span>
              <span className={`font-black ${isExhausted ? 'text-rose-400 animate-pulse' : 'text-toy-orange'}`}>
                {isExhausted ? 'RESTING' : `${stamina}%`}
              </span>
            </div>
            
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
              <div 
                className={`h-full transition-all duration-75 rounded-full ${
                  isExhausted 
                    ? 'bg-rose-500' 
                    : stamina < 30 
                    ? 'bg-toy-orange' 
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${stamina}%` }}
              />
            </div>
            <p className="text-[8px] text-slate-500 font-semibold leading-none">
              * Hold <kbd className="px-1 bg-white/10 rounded text-[7px] font-bold">SHIFT</kbd> to run fast
            </p>
          </div>
        )}
          </>
        )}
      </div>

      {/* GAME OVER RESULTS MODAL OVERLAY */}
      {room.gameState === 'ended' && room.stats && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" id="game-over-modal-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl relative my-8 text-white"
            id="game-over-content-card"
          >
            <div className="text-center mb-6" id="victory-header">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-tr from-toy-yellow to-yellow-500 text-slate-950 rounded-2xl mb-4 shadow-xl" id="trophy-badge">
                <Trophy className="w-8 h-8 animate-bounce" />
              </div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-toy-yellow via-yellow-300 to-amber-300 bg-clip-text text-transparent uppercase tracking-tight">
                {room.stats.winner === 'seekers' ? '🔍 Seekers Won!' : '🎉 Hiders Won!'}
              </h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">
                Match lasted {formatTime(room.stats.duration)}.
              </p>
            </div>

            {/* Statistics summary grids */}
            <div className="grid grid-cols-3 gap-3 text-center mb-5" id="stats-summary-grid">
              <div className="bg-white/5 border border-white/5 rounded-xl p-2.5">
                <p className="text-[9px] text-slate-400 font-black uppercase">Players</p>
                <p className="text-lg font-black text-white mt-0.5">{room.stats.totalPlayers}</p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-2.5">
                <p className="text-[9px] text-slate-400 font-black uppercase">Tagged</p>
                <p className="text-lg font-black text-rose-400 mt-0.5">{room.stats.foundCount}</p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-2.5">
                <p className="text-[9px] text-slate-400 font-black uppercase">Escaped</p>
                <p className="text-lg font-black text-emerald-400 mt-0.5">{room.stats.escapedCount}</p>
              </div>
            </div>

            {/* MVP award section */}
            {room.stats.mvp && (
              <div className="bg-yellow-500/10 border border-yellow-500/25 p-3.5 rounded-2xl mb-4 text-center shadow-sm" id="mvp-award-card">
                <span className="inline-block px-2.5 py-0.5 bg-yellow-500 text-slate-950 text-[9px] uppercase font-black tracking-wider rounded-full mb-1">
                  🏅 Overall MVP Award
                </span>
                <h4 className="text-sm font-black text-yellow-300">{room.stats.mvp}</h4>
              </div>
            )}

            {/* PHASE 3 REWARDS & XP PROGRESSION SUMMARY */}
            {matchRewards && (
              <div className="bg-amber-500/20 border border-amber-500/40 p-4 rounded-2xl mb-4 space-y-3" id="match-rewards-card">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Match Rewards & Progression
                  </span>
                  {matchRewards.leveledUp && (
                    <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-lg font-black text-[10px] animate-bounce">
                      🎉 LEVEL UP!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/10 flex items-center justify-center gap-2">
                    <span className="text-xl">💰</span>
                    <div className="text-left">
                      <div className="text-amber-400 font-black text-sm">+{matchRewards.coinsEarned} Coins</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">Earned</div>
                    </div>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/10 flex items-center justify-center gap-2">
                    <span className="text-xl">⭐</span>
                    <div className="text-left">
                      <div className="text-emerald-400 font-black text-sm">+{matchRewards.xpEarned} XP</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">Earned</div>
                    </div>
                  </div>
                </div>

                {/* Level progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-300">
                    <span>Level {matchRewards.newLevel}</span>
                    <span>{matchRewards.currentLevelXp} / {matchRewards.xpToNextLevel} XP</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full border border-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.round((matchRewards.currentLevelXp / matchRewards.xpToNextLevel) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* END-OF-GAME MATCH LEADERBOARD */}
            <div className="mb-5">
              <Leaderboard
                roomPlayers={room.players}
                roomStats={room.stats}
                currentPlayerId={currentPlayerId}
                playersStatsTracker={playersStatsTrackerRef.current}
              />
            </div>

            {/* PERSISTENT TOP TAGGERS STATS SUMMARY */}
            <div className="mb-5">
              <TopTaggersSummary
                roomPlayers={room.players}
                roomStats={room.stats}
                currentPlayerId={currentPlayerId}
              />
            </div>

            {/* Detailed Player Performance List */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left mb-5" id="detailed-performances">
              <h3 className="text-xs font-black uppercase text-slate-300 mb-3 border-b border-white/10 pb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">📊 Player Analytics</span>
                <button
                  id="copy-stats-btn"
                  onClick={() => {
                    soundManager.playClick();
                    const durationText = formatTime(room.stats?.duration || 0);
                    const mapName = currentMap === getMapById('graveyard') ? 'Spooky Graveyard' : currentMap === getMapById('toybox') ? 'Toy Sandbox' : 'Sunny Meadow';
                    
                    let text = `🎮 LULU SEEK! - MATCH RESULTS 🎮\n`;
                    text += `=================================\n`;
                    text += `🏆 Winner: ${room.stats?.winner === 'seekers' ? 'SEEKERS 🔍' : 'HIDERS 🎉'}\n`;
                    text += `⏱️ Duration: ${durationText}\n`;
                    text += `🗺️ Map: ${mapName}\n`;
                    text += `👤 MVP: ${room.stats?.mvp || 'None'}\n`;
                    text += `=================================\n\n`;
                    
                    Object.values(room.players).forEach(p => {
                      const tracker = playersStatsTrackerRef.current[p.id] || { distanceTraveled: 0, timeSpentHiding: 0 };
                      const distM = (tracker.distanceTraveled / 24).toFixed(0);
                      const hideS = Math.round(tracker.timeSpentHiding);
                      
                      text += `👤 ${p.name} [${p.role.toUpperCase()}]\n`;
                      if (p.role === 'seeker') {
                        text += `   🔍 Tags: ${p.score || 0}\n`;
                      } else {
                        const st = room.stats?.hiderSurvivalTimes?.[p.name] ?? room.stats?.duration ?? 0;
                        text += `   💀 Status: ${p.status === 'found' ? `FOUND at ${st}s` : 'SURVIVED'}\n`;
                        text += `   🍃 Hiding Time: ${hideS}s\n`;
                      }
                      text += `   🏃 Distance: ${distM}m\n\n`;
                    });
                    
                    text += `=================================`;
                    navigator.clipboard.writeText(text);
                    setCopiedStats(true);
                    setTimeout(() => setCopiedStats(false), 2000);
                  }}
                  className="bg-white/5 hover:bg-white/15 text-white border border-white/10 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedStats ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 text-toy-blue shrink-0" />}
                  {copiedStats ? 'Copied!' : 'Copy Stats'}
                </button>
              </h3>
              
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1" id="performance-rows-container">
                {Object.values(room.players).map(p => {
                  const tracker = playersStatsTrackerRef.current[p.id] || { distanceTraveled: 0, timeSpentHiding: 0 };
                  const distM = (tracker.distanceTraveled / 24).toFixed(0);
                  const hideS = Math.round(tracker.timeSpentHiding);
                  
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 p-2 bg-white/5 border border-white/5 rounded-xl" id={`performance-row-${p.id}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-black/30 shrink-0" style={{ backgroundColor: p.color }} />
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1">
                            {p.name}
                            {p.id === currentPlayerId && <span className="text-[7px] bg-toy-blue/20 text-toy-blue px-1 py-0.2 rounded-full font-black">YOU</span>}
                          </div>
                          <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                            {p.role === 'seeker' ? 'Seeker 🔍' : 'Hider 🟢'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-[9px] scale-90">
                        {p.role === 'seeker' ? (
                          <span className="font-black bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded px-1.5 py-0.5">
                            🔍 {p.score || 0} TAGS
                          </span>
                        ) : (
                          <>
                            <span className={`font-black rounded px-1.5 py-0.5 border ${
                              p.status === 'found' 
                                ? 'bg-white/5 text-slate-500 border-white/5' 
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}>
                              {p.status === 'found' ? `FOUND (${room.stats?.hiderSurvivalTimes?.[p.name] ?? room.stats?.duration}s)` : 'SURVIVED'}
                            </span>
                            <span className="font-black bg-emerald-50/10 text-emerald-400 border border-emerald-500/10 rounded px-1.5 py-0.5">
                              🍃 {hideS}s HIDE
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3" id="game-over-actions">
              {isHost ? (
                <>
                  <button
                    id="play-again-btn"
                    onClick={() => {
                      soundManager.playClick();
                      onPlayAgain();
                    }}
                    className="flex-1 bg-gradient-to-r from-toy-blue to-teal-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 border-0 font-black py-3 px-6 rounded-2xl shadow-xl transition-all cursor-pointer text-xs uppercase tracking-wide text-center flex items-center justify-center gap-1.5 font-bold"
                  >
                    ⚡ Play Again
                  </button>
                  <button
                    id="return-to-lobby-btn"
                    onClick={() => {
                      soundManager.playClick();
                      onReturnToLobby();
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black py-3 px-6 rounded-2xl shadow-xl transition-all cursor-pointer text-xs uppercase tracking-wide text-center flex items-center justify-center gap-1.5 font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Lobby
                  </button>
                </>
              ) : (
                <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl text-center p-3.5 text-xs text-slate-400 font-bold uppercase flex items-center justify-center gap-1.5 animate-pulse" id="client-lobby-wait-indicator">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-toy-yellow animate-ping mr-1" />
                  Waiting for Host...
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* IN-GAME SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="settings-modal-overlay">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl text-white relative"
            id="settings-modal"
          >
            {/* Close Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                setIsSettingsOpen(false);
              }}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 active:scale-90 transition rounded-xl border border-white/15 bg-white/5 cursor-pointer text-slate-400 hover:text-white"
              id="settings-close-btn"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
            </button>

            <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2 mb-6" id="settings-title">
              <Settings className="w-5 h-5 text-toy-orange" />
              Game Settings
            </h2>

            {/* Volume Controls */}
            <div className="space-y-6" id="settings-sliders-section">
              {/* SFX Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
                    <Volume2 className="w-4 h-4 text-toy-green" />
                    Sound Effects
                  </span>
                  <span className="font-bold text-xs font-mono">{Math.round(sfxVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVol}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSfxVol(val);
                    soundManager.setSfxVolume(val);
                  }}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-toy-green"
                />
              </div>

              {/* Music Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
                    <Music className="w-4 h-4 text-toy-orange" />
                    Background Music
                  </span>
                  <span className="font-bold text-xs font-mono">{Math.round(musicVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVol}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setMusicVol(val);
                    soundManager.setMusicVolume(val);
                  }}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-toy-orange"
                />
              </div>

              {/* Quick Game Guide */}
              <div className="pt-4 border-t border-white/10 space-y-2" id="settings-guide-section">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-sans">Controls Cheat-sheet</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div>⌨️ Move: <span className="font-mono text-[10px] bg-white/10 px-1 py-0.5 rounded text-white">WASD / Keys</span></div>
                  <div>⚡ Sprint: <span className="font-mono text-[10px] bg-white/10 px-1 py-0.5 rounded text-white">Shift</span></div>
                  <div>🌿 Hide: <span className="font-mono text-[10px] text-emerald-400">In Bushes</span></div>
                  <div>🎯 Tag: <span className="font-mono text-[10px] text-toy-orange">Near Hiders</span></div>
                </div>
              </div>

              {/* Close Button Footer */}
              <button
                onClick={() => {
                  soundManager.playClick();
                  setIsSettingsOpen(false);
                }}
                className="w-full py-2.5 bg-toy-green hover:bg-emerald-400 active:translate-y-0.5 transition-all border-3 border-toy-dark font-black uppercase rounded-xl text-xs tracking-wider shadow-[3px_3px_0px_#1e293b] cursor-pointer"
              >
                Back to Match
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}

const MemoizedGameView = React.memo(GameView);

export default function SafeGameView(props: React.ComponentProps<typeof GameView>) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.error && (event.error.message?.includes('cull') || event.error.message?.includes('Canvas') || event.error.stack?.includes('GameView'))) {
        console.error("[GAMEVIEW ERROR RECOVERED]", event.error);
        setHasError(true);
        setErrorMessage(event.error.message || "Render exception");
      }
    };
    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);

  if (hasError) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white font-sans" id="gameview-error-boundary-screen">
        <div className="max-w-md w-full p-8 bg-slate-900 border-2 border-rose-500/60 rounded-3xl shadow-2xl space-y-5">
          <div className="w-16 h-16 mx-auto bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center text-3xl font-black">
            ⚠️
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black uppercase tracking-wider text-rose-400">Game Failed to Render</h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              An unexpected rendering error occurred. You can retry rendering or return to the lobby safely.
            </p>
            {errorMessage && (
              <div className="p-2.5 bg-slate-950 rounded-xl font-mono text-[10px] text-rose-300/80 overflow-x-auto text-left mt-2">
                {errorMessage}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setHasError(false)}
              className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-lg"
            >
              🔄 Retry Render
            </button>
            {props.onLeaveRoom && (
              <button
                type="button"
                onClick={props.onLeaveRoom}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer active:scale-95 border border-white/10"
              >
                🚪 Return to Lobby
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <MemoizedGameView {...props} />;
}
