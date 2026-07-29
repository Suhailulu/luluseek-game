import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomSettings, WSMessage } from './types';
import JoinView from './components/JoinView';
import LobbyView from './components/LobbyView';
import GameView from './components/GameView';
import { Wifi, WifiOff, RefreshCw, Volume2, VolumeX, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from './lib/sound';
import { getSavedCustomization, saveCustomization } from './lib/customization';

export default function App() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [lastEmote, setLastEmote] = useState<{ playerId: string; emote: string; timestamp: number } | null>(null);

  const [ping, setPing] = useState<number>(0);
  const [packetRate, setPacketRate] = useState<number>(0);
  const pingTimestampRef = useRef<number | null>(null);
  const packetsInLastSecondRef = useRef<number>(0);

  // Measure Ping and Packet Rate
  useEffect(() => {
    if (!socket || socketStatus !== 'connected') return;

    // Send ping every 2 seconds
    const pingInterval = setInterval(() => {
      pingTimestampRef.current = Date.now();
      try {
        socket.send(JSON.stringify({ type: 'ping', payload: pingTimestampRef.current }));
      } catch (err) {
        console.error('Failed to send ping:', err);
      }
    }, 2000);

    // Measure packets per second
    const packetInterval = setInterval(() => {
      setPacketRate(packetsInLastSecondRef.current);
      packetsInLastSecondRef.current = 0;
    }, 1000);

    return () => {
      clearInterval(pingInterval);
      clearInterval(packetInterval);
    };
  }, [socket, socketStatus]);

  // Keep track of credentials and current active socket reference
  const savedName = useRef<string | null>(null);
  const savedCode = useRef<string | null>(null);
  const savedPlayerId = useRef<string | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  useEffect(() => {
    currentPlayerIdRef.current = currentPlayerId;
  }, [currentPlayerId]);

  // Initialize and maintain WebSocket connection stably
  const connectSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setSocketStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    console.log('Connecting to WebSocket server:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket successfully connected!');
      setSocketStatus('connected');
      setSocket(ws);
      setError(null);
      reconnectAttemptsRef.current = 0;

      // If we had a session stored, automatically reconnect to the room
      if (savedName.current && savedCode.current && ws.readyState === WebSocket.OPEN) {
        const savedCustomization = getSavedCustomization();
        ws.send(JSON.stringify({
          type: 'join-room',
          payload: {
            name: savedName.current,
            code: savedCode.current,
            playerId: savedPlayerId.current,
            customization: savedCustomization
          }
        }));
      }
    };

    ws.onmessage = (event) => {
      packetsInLastSecondRef.current++;
      try {
        const msg: WSMessage = JSON.parse(event.data);
        const { type, payload } = msg;

        switch (type) {
          case 'pong': {
            if (pingTimestampRef.current !== null) {
              const latency = Date.now() - pingTimestampRef.current;
              setPing(latency);
            }
            break;
          }
          case 'create-success': {
            const { code, playerId, room: updatedRoom } = payload;
            console.log(`[DEBUG] Room created: ${code}`);
            setRoom(updatedRoom);
            setCurrentPlayerId(playerId);
            savedCode.current = code;
            savedPlayerId.current = playerId;
            setError(null);
            setAnnouncements([`Room ${code} created. You are the Host.`]);
            soundManager.playJoin();
            break;
          }

          case 'join-success': {
            const { code, playerId, room: updatedRoom } = payload;
            console.log(`[DEBUG] Player joined: ${code}`);
            setRoom(updatedRoom);
            setCurrentPlayerId(playerId);
            savedCode.current = code;
            savedPlayerId.current = playerId;
            setError(null);
            const localPlayer = updatedRoom.players[playerId];
            const isSpectator = updatedRoom.gameState !== 'lobby' && localPlayer?.role === 'spectator';
            const msg = isSpectator
              ? `Joined room ${code} as a Spectator! Viewing match in progress.`
              : `Joined room ${code} successfully!`;
            setAnnouncements([msg]);
            soundManager.playJoin();
            break;
          }

          case 'room-state': {
            console.log(`[DEBUG] Ready state synchronized:`, payload.players);
            if (payload.gameState === 'hiding' || payload.gameState === 'playing') {
              console.log(`[DEBUG] Game state changed to playing`);
            }
            setRoom(payload);
            break;
          }

          case 'game-start': {
            console.log(`[DEBUG] Game state changed to playing`);
            setRoom(payload);
            setAnnouncements((prev) => [...prev, 'The match has started! Run and hide!']);
            soundManager.playJoin();
            break;
          }

          case 'player-moved': {
            // High frequency movement is handled directly inside GameView via socket listener for 60FPS performance
            break;
          }

          case 'players-moved': {
            // High frequency movement is handled directly inside GameView via socket listener for 60FPS performance
            break;
          }

          case 'player-found': {
            const { hiderName, seekerName } = payload;
            setAnnouncements((prev) => [...prev, `🔍 ${hiderName} was found by ${seekerName}!`]);
            soundManager.playFound();
            break;
          }

          case 'player-emote': {
            const { playerId, emote } = payload;
            setLastEmote({ playerId, emote, timestamp: Date.now() });
            break;
          }

          case 'chat-message': {
            setRoom((prev) => {
              if (!prev) return prev;
              const history = prev.chatHistory || [];
              return { ...prev, chatHistory: [...history, payload] };
            });
            break;
          }

          case 'announcement': {
            setAnnouncements((prev) => [...prev, payload]);
            if (payload.includes('LAST HIDER ALERT')) {
              soundManager.playLastHiderAlert();
            } else if (payload.includes('SUDDEN DEATH')) {
              soundManager.playLastHiderAlert();
            } else if (payload.includes('joined') || payload.includes('started')) {
              soundManager.playJoin();
            }
            break;
          }

          case 'game-over': {
            setRoom(payload);
            const winnerLabel = payload.stats.winner === 'seekers' ? 'Seekers won!' : 'Hiders won!';
            setAnnouncements((prev) => [...prev, `🏆 Game Over! ${winnerLabel}`]);
            
            // Play victory or defeat
            const localPlayer = payload.players[currentPlayerIdRef.current || ''];
            if (localPlayer) {
              const isSeeker = localPlayer.role === 'seeker';
              const winner = payload.stats.winner;
              if ((isSeeker && winner === 'seekers') || (!isSeeker && winner === 'hiders')) {
                soundManager.playVictory();
              } else {
                soundManager.playDefeat();
              }
            } else {
              soundManager.playVictory();
            }
            break;
          }

          case 'error': {
            const errorMsg = typeof payload === 'string' ? payload : (payload?.message || 'An unexpected error occurred');
            console.error('[DEBUG] Any network or synchronization error:', errorMsg);
            setError(errorMsg);
            if (typeof errorMsg === 'string' && (errorMsg.includes('Room not found') || errorMsg.includes('full') || errorMsg.includes('started'))) {
              savedCode.current = null;
              savedPlayerId.current = null;
              setRoom(null);
            }
            break;
          }
        }
      } catch (err) {
        console.error('[DEBUG] Any network or synchronization error:', err instanceof Error ? err.message : String(err));
      }
    };

    ws.onclose = () => {
      console.log('[DEBUG] Player disconnected');
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      setSocketStatus('disconnected');
      setSocket(null);
      
      // Auto-reconnect up to 10 times
      if (reconnectAttemptsRef.current < 10) {
        const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 10000);
        reconnectAttemptsRef.current += 1;
        setTimeout(() => {
          connectSocket();
        }, timeout);
      }
    };

    ws.onerror = (_evt) => {
      // Clean handling for transient socket level events during reconnect
      console.warn('WebSocket connection event occurred, waiting for reconnect...');
    };
  }, []);

  // Connect WebSocket on mount and cleanup on unmount
  useEffect(() => {
    connectSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectSocket]);

  // Safe WebSocket message dispatcher
  const sendWS = useCallback((message: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (err) {
        console.warn('Failed to send WebSocket message:', err);
      }
    }
  }, []);

  // Send ping periodically to maintain connection
  useEffect(() => {
    if (!socket || socketStatus !== 'connected') return;
    const interval = setInterval(() => {
      sendWS({ type: 'ping', payload: {} });
    }, 10000);
    return () => clearInterval(interval);
  }, [socket, socketStatus, sendWS]);

  // Actions trigger functions
  const handleCreateRoom = (name: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Connection offline. Waiting to connect to server...');
      return;
    }
    savedName.current = name;
    const savedCustomization = getSavedCustomization();
    sendWS({
      type: 'create-room',
      payload: { name, customization: savedCustomization }
    });
  };

  const handleJoinRoom = (name: string, code: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Connection offline. Waiting to connect to server...');
      return;
    }
    savedName.current = name;
    savedCode.current = code;
    const savedCustomization = getSavedCustomization();
    sendWS({
      type: 'join-room',
      payload: { name, code, customization: savedCustomization }
    });
  };

  const handleUpdateSettings = (settings: RoomSettings) => {
    sendWS({
      type: 'update-settings',
      payload: settings
    });
  };

  const handleToggleReady = () => {
    console.log('[DEBUG] Ready button clicked');
    sendWS({
      type: 'toggle-ready',
      payload: {}
    });
  };

  const handleStartGame = () => {
    console.log('[DEBUG] Start Game requested');
    sendWS({
      type: 'start-game',
      payload: {}
    });
  };

  const handleSendMovement = useCallback((x: number, y: number) => {
    if (room?.players[currentPlayerId || '']?.role === 'spectator') return;
    sendWS({
      type: 'move',
      payload: { x, y }
    });
  }, [sendWS, room, currentPlayerId]);

  const handleSendTag = useCallback((hiderId: string) => {
    if (room?.players[currentPlayerId || '']?.role === 'spectator') return;
    sendWS({
      type: 'tag',
      payload: { hiderId }
    });
  }, [sendWS, room, currentPlayerId]);

  const handleUpdateCustomization = useCallback((color: string, accessory: string, hair?: string, outfit?: string, glasses?: string) => {
    const updated = saveCustomization({ color, accessory, hair, outfit, glasses });
    sendWS({
      type: 'update-customization',
      payload: updated
    });
  }, [sendWS]);

  const handleSendEmote = useCallback((emote: string) => {
    sendWS({
      type: 'emote',
      payload: { emote }
    });
  }, [sendWS]);

  const handleKickPlayer = useCallback((targetPlayerId: string) => {
    sendWS({
      type: 'kick-player',
      payload: { targetPlayerId }
    });
  }, [sendWS]);

  const handleSendChat = useCallback((text: string) => {
    sendWS({
      type: 'chat-message',
      payload: { text }
    });
  }, [sendWS]);

  const handleReturnToLobby = useCallback(() => {
    sendWS({
      type: 'return-to-lobby',
      payload: {}
    });
  }, [sendWS]);

  const handlePlayAgain = useCallback(() => {
    sendWS({
      type: 'play-again',
      payload: {}
    });
  }, [sendWS]);

  const handleLeaveRoom = useCallback(() => {
    sendWS({
      type: 'leave-room',
      payload: {}
    });
    setRoom(null);
    setCurrentPlayerId(null);
    savedName.current = null;
    savedCode.current = null;
    savedPlayerId.current = null;
    setError(null);
    setAnnouncements([]);
  }, [sendWS]);

  const isPlaying = room && room.gameState !== 'lobby';

  return (
    <div className={`min-h-screen bg-sky-50 text-toy-dark font-sans flex flex-col justify-between select-none ${isPlaying ? 'p-0 w-screen h-screen overflow-hidden' : 'p-2 sm:p-4 md:p-6'}`} id="app-main-layout">
      
      {/* Outer Bouncy Soft 3D Container frame */}
      <div className={`w-full bg-white flex flex-col flex-grow relative overflow-hidden ${isPlaying ? 'border-0 rounded-none max-w-none w-full h-full' : 'max-w-7xl mx-auto border-4 border-toy-dark rounded-3xl shadow-[8px_8px_0px_#1e293b]'}`} id="app-toy-container">
        
        {/* Header */}
        {!isPlaying && (
          <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-6 border-b-4 border-toy-dark bg-toy-sky gap-4" id="app-navigation-header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-toy-yellow text-toy-dark border-3 border-toy-dark rounded-xl shadow-[2px_2px_0px_#1e293b]">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-toy-dark select-none leading-none">
                Lulu Seek!
              </h1>
              <p className="text-[10px] uppercase tracking-wider font-bold text-sky-800/60 mt-1">
                Cute Casual Hide & Seek Playground
              </p>
            </div>
          </div>

          {/* Connection Status & Details */}
          <div className="flex items-center gap-4 justify-between md:justify-end" id="connection-status-panel">
            {/* Audio Toggle button */}
            <button
              onClick={() => {
                const updated = !isMuted;
                setIsMuted(updated);
                soundManager.setSfxVolume(updated ? 0 : 0.5);
                soundManager.setMusicVolume(updated ? 0 : 0.3);
                soundManager.playClick();
              }}
              className={`p-2.5 border-3 border-toy-dark rounded-xl shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
                isMuted ? 'bg-rose-100 text-rose-600' : 'bg-white text-toy-dark hover:bg-slate-50'
              }`}
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
              id="audio-mute-toggle"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {room && (
              <div className="bg-toy-yellow text-toy-dark px-4 py-2 border-3 border-toy-dark rounded-xl shadow-[2px_2px_0px_#1e293b] font-bold text-sm flex items-center gap-1">
                <span className="text-[10px] text-toy-dark/60 font-black uppercase">Room:</span>
                <span className="font-mono tracking-widest text-base">{room.code}</span>
              </div>
            )}

            <div className="text-right flex flex-col justify-center">
              {room ? (
                <div className="text-sm font-black text-toy-dark">
                  Connected: <span className="bg-white border-2 border-toy-dark px-2 py-0.5 rounded-lg ml-1 font-mono text-xs">{Object.keys(room.players).length}/{room.settings.maxPlayers}</span>
                </div>
              ) : (
                <div className="text-right">
                  {socketStatus === 'connected' ? (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-toy-green/20 border-2 border-toy-dark text-emerald-700 text-[10px] font-black rounded-full" id="conn-online-badge">
                      <Wifi className="w-3 h-3 animate-pulse" />
                      <span>ONLINE</span>
                    </div>
                  ) : socketStatus === 'connecting' ? (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 border-2 border-toy-dark text-toy-dark text-[10px] font-black rounded-full animate-pulse" id="conn-connecting-badge">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>CONNECTING</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 border-2 border-toy-dark text-rose-600 text-[10px] font-black rounded-full" id="conn-offline-badge">
                      <WifiOff className="w-3 h-3" />
                      <span>OFFLINE</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
      )}

        {/* Main Container Views Router */}
        <main className="flex-grow flex flex-col min-h-0 bg-white relative" id="main-view-router">
          <AnimatePresence mode="wait">
            {!room ? (
              <motion.div
                key="join-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col flex-grow"
              >
                <JoinView
                  onJoin={handleJoinRoom}
                  onCreate={handleCreateRoom}
                  loading={socketStatus === 'connecting'}
                  error={error}
                />
              </motion.div>
            ) : room.gameState === 'lobby' ? (
              <motion.div
                key="lobby-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full h-full flex flex-col flex-grow"
              >
                <LobbyView
                  room={room}
                  currentPlayerId={currentPlayerId!}
                  onUpdateSettings={handleUpdateSettings}
                  onToggleReady={handleToggleReady}
                  onStartGame={handleStartGame}
                  onLeave={handleLeaveRoom}
                  onUpdateCustomization={handleUpdateCustomization}
                  onSendChat={handleSendChat}
                  onSendEmote={handleSendEmote}
                  onKickPlayer={handleKickPlayer}
                  lastEmoteEvent={lastEmote}
                />
              </motion.div>
            ) : (
              <motion.div
                key="game-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col flex-grow"
              >
                <GameView
                  room={room}
                  currentPlayerId={currentPlayerId!}
                  socket={socket}
                  onSendMovement={handleSendMovement}
                  onSendTag={handleSendTag}
                  onReturnToLobby={handleReturnToLobby}
                  onPlayAgain={handlePlayAgain}
                  announcements={announcements}
                  onSendEmote={handleSendEmote}
                  lastEmoteEvent={lastEmote}
                  onLeave={handleLeaveRoom}
                  ping={ping}
                  packetRate={packetRate}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        {!isPlaying && (
          <footer className="border-t-4 border-toy-dark bg-slate-50 p-4 text-center text-xs text-slate-400 font-bold flex flex-col sm:flex-row items-center justify-between gap-2" id="app-footer">
            <div>Lulu Seek! &copy; {new Date().getFullYear()}</div>
            <div className="flex items-center gap-4">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-toy-green animate-bounce"></span>
              <span className="uppercase tracking-wider text-[10px]">Secure Play Connection</span>
            </div>
          </footer>
        )}

      </div>
    </div>
  );
}
