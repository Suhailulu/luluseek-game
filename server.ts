import express from 'express';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { Room, Player, GameState, RoomSettings, WSMessage, GameStats } from './src/types';
import { checkCollision, defaultMap, getMapById, MAP_WIDTH, MAP_HEIGHT } from './src/map';

const app = express();
const PORT = 3000;
const server = http.createServer(app);

// In-memory database of active rooms
const rooms: Record<string, Room> = {};

// Track disconnect grace periods and room cleanup timers
const disconnectTimers = new Map<string, NodeJS.Timeout>(); // key: `${roomCode}:${playerId}`
const roomDeleteTimers = new Map<string, NodeJS.Timeout>(); // key: roomCode

// Active WebSocket connections mapped to their player details
interface ClientSession {
  ws: WebSocket;
  playerId: string;
  roomCode: string;
}
const sessions = new Map<WebSocket, ClientSession>();

// Track room interval timers for game loops
const roomTimers: Record<string, NodeJS.Timeout> = {};
const roomHighFreqLoops: Record<string, NodeJS.Timeout> = {};

function startRoomHighFreqLoop(roomCode: string) {
  if (roomHighFreqLoops[roomCode]) {
    clearInterval(roomHighFreqLoops[roomCode]);
  }

  // 60 updates per second (every 16ms) for ultra-fluid movement
  roomHighFreqLoops[roomCode] = setInterval(() => {
    const room = rooms[roomCode];
    if (!room || (room.gameState !== 'hiding' && room.gameState !== 'playing')) {
      clearInterval(roomHighFreqLoops[roomCode]);
      delete roomHighFreqLoops[roomCode];
      return;
    }

    const dirtyList = (room as any).dirtyPlayers as Set<string> | undefined;
    if (dirtyList && dirtyList.size > 0) {
      const movedPayload: Record<string, { x: number; y: number }> = {};
      dirtyList.forEach(pId => {
        const p = room.players[pId];
        if (p) {
          movedPayload[pId] = { x: p.x, y: p.y };
        }
      });
      dirtyList.clear();

      broadcastToRoom(roomCode, {
        type: 'players-moved',
        payload: movedPayload
      });
    }
  }, 16);
}

function stopRoomHighFreqLoop(roomCode: string) {
  if (roomHighFreqLoops[roomCode]) {
    clearInterval(roomHighFreqLoops[roomCode]);
    delete roomHighFreqLoops[roomCode];
  }
}

// Helper: Generate random unique room code (4 uppercase letters)
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms[code]);
  return code;
}

// Helper: Generate a soft random color for players
function getRandomPlayerColor(room?: Room): string {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', 
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', 
    '#EC4899', '#14B8A6'
  ];
  if (!room) {
    return colors[Math.floor(Math.random() * colors.length)];
  }
  const takenColors = Object.values(room.players).map(p => p.color.toUpperCase());
  const availableColors = colors.filter(c => !takenColors.includes(c.toUpperCase()));
  if (availableColors.length > 0) {
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  }
  // If all default colors are taken, generate a random custom vibrant pastel color
  let randColor = '';
  let tries = 0;
  while (tries < 20) {
    const h = Math.floor(Math.random() * 360);
    const s = 70 + Math.floor(Math.random() * 20); // 70-90%
    const l = 50 + Math.floor(Math.random() * 15); // 50-65%
    // Convert HSL to Hex
    const hDecimal = h / 360;
    const sDecimal = s / 100;
    const lDecimal = l / 100;
    let r = lDecimal, g = lDecimal, b = lDecimal;
    if (sDecimal !== 0) {
      const q = lDecimal < 0.5 ? lDecimal * (1 + sDecimal) : lDecimal + sDecimal - lDecimal * sDecimal;
      const p = 2 * lDecimal - q;
      const hue2rgb = (pt: number, qt: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return pt + (qt - pt) * 6 * t;
        if (t < 1/2) return qt;
        if (t < 2/3) return pt + (qt - pt) * (2/3 - t) * 6;
        return pt;
      };
      r = hue2rgb(p, q, hDecimal + 1/3);
      g = hue2rgb(p, q, hDecimal);
      b = hue2rgb(p, q, hDecimal - 1/3);
    }
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    randColor = '#' + toHex(r) + toHex(g) + toHex(b);
    if (!takenColors.includes(randColor.toUpperCase())) {
      break;
    }
    tries++;
  }
  return randColor || colors[Math.floor(Math.random() * colors.length)];
}

// Seeker validation logic
function getMinSeekers(playerCount: number): number {
  if (playerCount <= 1) return 1;
  if (playerCount <= 6) return 1;
  if (playerCount <= 12) return 2;
  if (playerCount <= 18) return 3;
  return Math.floor((playerCount - 1) / 6) + 1;
}

function validateSettings(playerCount: number, settings: RoomSettings): { valid: boolean; error?: string } {
  const minSeekers = getMinSeekers(playerCount);
  if (settings.numSeekers < minSeekers) {
    return { valid: false, error: `${playerCount} players require at least ${minSeekers} seeker${minSeekers > 1 ? 's' : ''}.` };
  }
  if (settings.numSeekers >= playerCount) {
    return { valid: false, error: 'Cannot have more seekers than players.' };
  }
  const hidersCount = playerCount - settings.numSeekers;
  if (hidersCount <= 0) {
    return { valid: false, error: 'Must have at least one hider.' };
  }
  if (settings.maxPlayers < 2 || settings.maxPlayers > 50) {
    return { valid: false, error: 'Max players must be between 2 and 50.' };
  }
  if (settings.hideTime < 10 || settings.hideTime > 120) {
    return { valid: false, error: 'Hide time must be between 10 and 120 seconds.' };
  }
  if (settings.matchDuration < 1 || settings.matchDuration > 30) {
    return { valid: false, error: 'Match duration must be between 1 and 30 minutes.' };
  }
  return { valid: true };
}

// Broadcast a message to all clients in a room
function broadcastToRoom(roomCode: string, message: WSMessage) {
  const room = rooms[roomCode];
  if (!room) return;

  const rawMessage = JSON.stringify(message);
  sessions.forEach((session) => {
    if (session.roomCode === roomCode && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(rawMessage);
    }
  });
}

// Broadcast a complete updated room state
function broadcastRoomState(roomCode: string) {
  const room = rooms[roomCode];
  if (!room) return;

  console.log(`[DEBUG] Ready state synchronized for room: ${roomCode}`);
  broadcastToRoom(roomCode, {
    type: 'room-state',
    payload: room
  });
}

// Safely generate spawn position that does not collide with solid obstacles
function getRandomSpawnPoint(isSeeker: boolean, mapId?: string): { x: number; y: number } {
  const map = getMapById(mapId);
  if (isSeeker) {
    // Seekers spawn near center of map
    const centerX = map.width / 2;
    const centerY = map.height / 2;
    if (!checkCollision(centerX, centerY, 20, map).collided) {
      return { x: centerX, y: centerY };
    }
    // Spiral search outwards from center for a clear spot
    for (let radius = 30; radius <= 600; radius += 30) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        const tx = centerX + Math.cos(angle) * radius;
        const ty = centerY + Math.sin(angle) * radius;
        if (tx >= 80 && tx <= map.width - 80 && ty >= 80 && ty <= map.height - 80) {
          if (!checkCollision(tx, ty, 20, map).collided) {
            return { x: tx, y: ty };
          }
        }
      }
    }
    return { x: centerX, y: centerY };
  }

  // Hiders spawn spread out across valid open areas of the map
  let tries = 0;
  while (tries < 200) {
    const rx = 100 + Math.random() * (map.width - 200);
    const ry = 100 + Math.random() * (map.height - 200);
    if (!checkCollision(rx, ry, 20, map).collided) {
      return { x: rx, y: ry };
    }
    tries++;
  }
  return { x: map.width / 2, y: map.height / 2 };
}

// Handle Game Tick Loop
function startGameTimer(roomCode: string) {
  if (roomTimers[roomCode]) {
    clearInterval(roomTimers[roomCode]);
  }

  roomTimers[roomCode] = setInterval(() => {
    const room = rooms[roomCode];
    if (!room) {
      clearInterval(roomTimers[roomCode]);
      delete roomTimers[roomCode];
      return;
    }

    if (room.gameState === 'hiding') {
      room.hideCountdown--;
      if (room.hideCountdown <= 0) {
        room.gameState = 'playing';
        room.matchTimer = room.settings.matchDuration * 60;
        broadcastToRoom(roomCode, { type: 'announcement', payload: 'Countdown ended! Seekers are released!' });
      }
      broadcastRoomState(roomCode);
    } else if (room.gameState === 'playing') {
      room.matchTimer--;
      
      // Calculate active players and alive hiders
      const players = Object.values(room.players);
      const aliveHiders = players.filter(p => p.role === 'hider' && p.status === 'alive');
      
      if (aliveHiders.length === 0) {
        // Seekers win!
        endGame(roomCode, 'seekers');
      } else if (room.matchTimer <= 0) {
        // Hiders win!
        endGame(roomCode, 'hiders');
      } else {
        // Last Hider Alert
        if (aliveHiders.length === 1 && !(room as any).lastHiderAnnounced) {
          (room as any).lastHiderAnnounced = true;
          broadcastToRoom(roomCode, {
            type: 'announcement',
            payload: `⚠️ LAST HIDER ALERT: ${aliveHiders[0].name} is the last survivor!`
          });
        }

        // Sudden Death Mode (at 30 seconds left)
        if (room.matchTimer === 30) {
          broadcastToRoom(roomCode, {
            type: 'announcement',
            payload: '⚠️ SUDDEN DEATH! 30 seconds remaining! Seekers gain SPEED BOOST!'
          });
          // Boost seeker speed on server
          players.forEach(p => {
            if (p.role === 'seeker') {
              p.speed = 6.4; // seekers speed goes up
            }
          });
        }

        // Periodically broadcast timer state
        broadcastRoomState(roomCode);
      }
    } else {
      clearInterval(roomTimers[roomCode]);
      delete roomTimers[roomCode];
    }
  }, 1000);
}

// End the game and compute statistics
function endGame(roomCode: string, winner: 'hiders' | 'seekers') {
  const room = rooms[roomCode];
  if (!room) return;

  clearInterval(roomTimers[roomCode]);
  delete roomTimers[roomCode];
  stopRoomHighFreqLoop(roomCode);

  room.gameState = 'ended';

  const players = Object.values(room.players);
  const totalPlayers = players.length;
  const seekers = players.filter(p => p.role === 'seeker');
  const hiders = players.filter(p => p.role === 'hider');
  const foundCount = hiders.filter(p => p.status === 'found').length;
  const escapedCount = hiders.filter(p => p.status === 'alive').length;

  // Find seeker with the most tags
  let mvpSeeker = '';
  let maxScore = -1;
  seekers.forEach(s => {
    if (s.score > maxScore) {
      maxScore = s.score;
      mvpSeeker = s.name;
    }
  });

  const seekerFoundCounts: Record<string, number> = {};
  seekers.forEach(s => {
    seekerFoundCounts[s.name] = s.score;
  });

  const duration = (winner === 'seekers') 
    ? (room.settings.matchDuration * 60 - room.matchTimer)
    : (room.settings.matchDuration * 60);

  // Record survival times for hiders and identify the longest-surviving hider
  const hiderSurvivalTimes: Record<string, number> = {};
  let longestSurvival = -1;
  let mvpHider = '';

  hiders.forEach(h => {
    if (h.status === 'alive') {
      h.survivalTime = duration;
    }
    const st = h.survivalTime ?? duration;
    hiderSurvivalTimes[h.name] = st;

    if (st > longestSurvival) {
      longestSurvival = st;
      mvpHider = h.name;
    }
  });

  // Calculate overall MVP
  let mvp = 'No one';
  if (winner === 'hiders' && mvpHider) {
    mvp = `${mvpHider} (Survived ${longestSurvival}s)`;
  } else if (winner === 'seekers' && maxScore > 0) {
    mvp = `${mvpSeeker} (${maxScore} tag${maxScore > 1 ? 's' : ''})`;
  } else if (mvpHider) {
    mvp = `${mvpHider} (Survived ${longestSurvival}s)`;
  }

  room.stats = {
    winner,
    duration,
    totalPlayers,
    foundCount,
    escapedCount,
    mvpSeeker: maxScore > 0 ? mvpSeeker : undefined,
    seekerFoundCounts,
    mvp,
    hiderSurvivalTimes
  };

  // Reset players to unready and role lobby for next round
  players.forEach(p => {
    p.ready = false;
  });

  broadcastToRoom(roomCode, {
    type: 'game-over',
    payload: room
  });
}

// Initialize WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Attach WS Server upgrade
server.on('upgrade', (request, socket, head) => {
  const isViteHmr = request.headers['sec-websocket-protocol'] === 'vite-hmr' || request.url?.includes('vite');
  if (isViteHmr) {
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  // Setup heartbeat ping intervals to prevent idle disconnects
  let isAlive = true;
  ws.on('pong', () => { isAlive = true; });
  
  const pingInterval = setInterval(() => {
    if (!isAlive) {
      ws.terminate();
      return;
    }
    isAlive = false;
    ws.ping();
  }, 15000);

  ws.on('message', (messageRaw) => {
    try {
      const message: WSMessage = JSON.parse(messageRaw.toString());
      const { type, payload } = message;

      switch (type) {
        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', payload }));
          break;
        }

        case 'create-room': {
          const { name, customization } = payload;
          const code = generateRoomCode();
          const playerId = 'p-' + Math.random().toString(36).substring(2, 9);
          
          const hostPlayer: Player = {
            id: playerId,
            name: name.trim().substring(0, 15) || 'Host',
            role: 'spectator', // start neutral, role set in lobby/match
            x: 0,
            y: 0,
            status: 'alive',
            ready: true, // host is always ready
            isHost: true,
            color: customization?.color || getRandomPlayerColor(),
            accessory: customization?.accessory || 'none',
            hair: customization?.hair || 'none',
            outfit: customization?.outfit || 'none',
            glasses: customization?.glasses || 'none',
            score: 0,
            lastActive: Date.now(),
            speed: 4
          };

          const newRoom: Room = {
            code,
            players: { [playerId]: hostPlayer },
            gameState: 'lobby',
            hideCountdown: 0,
            matchTimer: 0,
            chatHistory: [],
            settings: {
              maxPlayers: 10,
              numSeekers: 1,
              hideTime: 20,
              matchDuration: 3, // 3 minutes standard
              mapId: 'meadow'
            }
          };

          rooms[code] = newRoom;
          sessions.set(ws, { ws, playerId, roomCode: code });

          console.log(`[DEBUG] Room created: ${code} by ${hostPlayer.name}`);

          ws.send(JSON.stringify({
            type: 'create-success',
            payload: { code, playerId, room: newRoom }
          }));
          break;
        }

        case 'join-room': {
          const { code, name, customization, playerId: clientPlayerId } = payload;
          const targetCode = String(code || '').trim().toUpperCase();

          if (!targetCode) {
            console.error('[DEBUG] Any network or synchronization error: Invalid room code provided');
            ws.send(JSON.stringify({ type: 'error', payload: 'Please enter a valid room code.' }));
            return;
          }

          const room = rooms[targetCode];

          if (!room) {
            console.error(`[DEBUG] Any network or synchronization error: Room ${targetCode} not found`);
            ws.send(JSON.stringify({ type: 'error', payload: 'Room not found. Check the room code and try again.' }));
            return;
          }

          // Cancel any pending room deletion timer if someone is joining/reconnecting
          if (roomDeleteTimers.has(targetCode)) {
            clearTimeout(roomDeleteTimers.get(targetCode)!);
            roomDeleteTimers.delete(targetCode);
          }

          const nameClean = String(name || '').trim().substring(0, 15) || 'Player';
          const playersList = Object.values(room.players);

          // Check if player is rejoining (matching clientPlayerId or exact name match)
          const existingPlayer = playersList.find(
            p => (clientPlayerId && p.id === clientPlayerId) || p.name.toLowerCase() === nameClean.toLowerCase()
          );

          if (existingPlayer) {
            // Check if existing player has an active WebSocket session
            const activeSession = Array.from(sessions.values()).find(
              s => s.roomCode === targetCode && s.playerId === existingPlayer.id && s.ws.readyState === WebSocket.OPEN
            );

            if (activeSession && activeSession.ws !== ws) {
              console.error(`[DEBUG] Any network or synchronization error: Player name ${nameClean} already active in room ${targetCode}`);
              ws.send(JSON.stringify({ type: 'error', payload: `A player named "${nameClean}" is already active in this room.` }));
              return;
            }

            // Re-claim existing player slot (clear disconnect timer)
            const disconnectKey = `${targetCode}:${existingPlayer.id}`;
            if (disconnectTimers.has(disconnectKey)) {
              clearTimeout(disconnectTimers.get(disconnectKey)!);
              disconnectTimers.delete(disconnectKey);
            }

            if (customization) {
              if (customization.color) existingPlayer.color = customization.color;
              if (customization.accessory) existingPlayer.accessory = customization.accessory;
              if (customization.hair) existingPlayer.hair = customization.hair;
              if (customization.outfit) existingPlayer.outfit = customization.outfit;
              if (customization.glasses) existingPlayer.glasses = customization.glasses;
            }

            sessions.set(ws, { ws, playerId: existingPlayer.id, roomCode: targetCode });

            console.log(`[DEBUG] Player joined (reconnected): ${existingPlayer.name} (${existingPlayer.id}) in room ${targetCode}`);

            ws.send(JSON.stringify({
              type: 'join-success',
              payload: { code: targetCode, playerId: existingPlayer.id, room }
            }));

            broadcastRoomState(targetCode);
            broadcastToRoom(targetCode, { type: 'announcement', payload: `${existingPlayer.name} reconnected!` });
            break;
          }

          // Check for new joiner limits
          if (room.gameState !== 'lobby') {
            console.error(`[DEBUG] Any network or synchronization error: Cannot join room ${targetCode} because game is already in state ${room.gameState}`);
            ws.send(JSON.stringify({ type: 'error', payload: 'Game already started. Please wait for the match to end.' }));
            return;
          }

          if (playersList.length >= room.settings.maxPlayers) {
            console.error(`[DEBUG] Any network or synchronization error: Room ${targetCode} is full (${playersList.length}/${room.settings.maxPlayers})`);
            ws.send(JSON.stringify({ type: 'error', payload: `This room is full (Max ${room.settings.maxPlayers} players).` }));
            return;
          }

          const playerId = clientPlayerId || ('p-' + Math.random().toString(36).substring(2, 9));
          const newPlayer: Player = {
            id: playerId,
            name: nameClean,
            role: 'spectator',
            x: 0,
            y: 0,
            status: 'alive',
            ready: false,
            isHost: false,
            color: customization?.color || getRandomPlayerColor(room),
            accessory: customization?.accessory || 'none',
            hair: customization?.hair || 'none',
            outfit: customization?.outfit || 'none',
            glasses: customization?.glasses || 'none',
            score: 0,
            lastActive: Date.now(),
            speed: 4
          };

          room.players[playerId] = newPlayer;
          sessions.set(ws, { ws, playerId, roomCode: targetCode });

          console.log(`[DEBUG] Player joined: ${newPlayer.name} (${playerId}) in room ${targetCode}`);

          ws.send(JSON.stringify({
            type: 'join-success',
            payload: { code: targetCode, playerId, room }
          }));

          // Notify everyone in the room of the new player join
          broadcastRoomState(targetCode);
          broadcastToRoom(targetCode, { type: 'announcement', payload: `${newPlayer.name} joined the lobby.` });
          break;
        }

        case 'toggle-ready': {
          const session = sessions.get(ws);
          if (!session) return;
          const room = rooms[session.roomCode];
          if (!room || room.gameState !== 'lobby') return;

          const player = room.players[session.playerId];
          if (player) {
            console.log(`[DEBUG] Ready button clicked by player: ${player.name} in room ${session.roomCode}`);
            // Host is always ready
            if (player.isHost) {
              player.ready = true;
            } else {
              player.ready = !player.ready;
            }
            broadcastRoomState(session.roomCode);
          }
          break;
        }

        case 'update-customization': {
          const session = sessions.get(ws);
          if (!session) return;
          const room = rooms[session.roomCode];
          if (!room) return;
          const player = room.players[session.playerId];
          if (player) {
            const { color, accessory, hair, outfit, glasses } = payload;
            if (color) {
              const isColorTaken = Object.values(room.players).some(
                (p) => p.id !== player.id && p.color.toUpperCase() === color.toUpperCase()
              );
              if (!isColorTaken) {
                player.color = color;
              }
            }
            if (accessory !== undefined) player.accessory = accessory;
            if (hair !== undefined) player.hair = hair;
            if (outfit !== undefined) player.outfit = outfit;
            if (glasses !== undefined) player.glasses = glasses;
            broadcastRoomState(session.roomCode);
          }
          break;
        }

        case 'emote': {
          const session = sessions.get(ws);
          if (!session) return;
          const { emote } = payload;
          broadcastToRoom(session.roomCode, {
            type: 'player-emote',
            payload: { playerId: session.playerId, emote }
          });
          break;
        }

        case 'chat-message': {
          const session = sessions.get(ws);
          if (!session) return;
          const room = rooms[session.roomCode];
          if (!room) return;
          const player = room.players[session.playerId];
          if (!player) return;

          const rawText = String(payload?.text || '').trim();
          if (!rawText) return;
          const cleanText = rawText.substring(0, 150);

          const chatMsg = {
            id: 'm-' + Math.random().toString(36).substring(2, 9),
            senderId: player.id,
            senderName: player.name,
            senderColor: player.color,
            text: cleanText,
            timestamp: Date.now()
          };

          if (!room.chatHistory) {
            room.chatHistory = [];
          }
          room.chatHistory.push(chatMsg);
          if (room.chatHistory.length > 50) {
            room.chatHistory = room.chatHistory.slice(-50);
          }

          broadcastToRoom(session.roomCode, {
            type: 'chat-message',
            payload: chatMsg
          });
          break;
        }

        case 'update-settings': {
          const session = sessions.get(ws);
          if (!session) return;
          const room = rooms[session.roomCode];
          if (!room || room.gameState !== 'lobby') return;

          const player = room.players[session.playerId];
          if (!player || !player.isHost) {
            ws.send(JSON.stringify({ type: 'error', payload: 'Only the host can modify settings.' }));
            return;
          }

          const { maxPlayers, numSeekers, hideTime, matchDuration, mapId, isPrivate } = payload as RoomSettings;
          const newSettings: RoomSettings = {
            maxPlayers: Number(maxPlayers),
            numSeekers: Number(numSeekers),
            hideTime: Number(hideTime),
            matchDuration: Number(matchDuration),
            mapId: mapId || 'meadow',
            isPrivate: Boolean(isPrivate)
          };

          const playersCount = Object.keys(room.players).length;
          const validation = validateSettings(playersCount, newSettings);

          if (!validation.valid) {
            console.error(`[DEBUG] Any network or synchronization error: ${validation.error}`);
            ws.send(JSON.stringify({ type: 'error', payload: validation.error }));
            return;
          }

          room.settings = newSettings;
          broadcastRoomState(session.roomCode);
          break;
        }

        case 'kick-player': {
          const session = sessions.get(ws);
          if (!session) return;
          const room = rooms[session.roomCode];
          if (!room || room.gameState !== 'lobby') return;

          const hostPlayer = room.players[session.playerId];
          if (!hostPlayer || !hostPlayer.isHost) {
            ws.send(JSON.stringify({ type: 'error', payload: 'Only the host can kick players.' }));
            return;
          }

          const targetPlayerId = payload.targetPlayerId;
          const targetPlayer = room.players[targetPlayerId];
          if (targetPlayer && !targetPlayer.isHost) {
            delete room.players[targetPlayerId];
            broadcastToRoom(session.roomCode, {
              type: 'announcement',
              payload: `${targetPlayer.name} was kicked from the room by the host.`
            });
            // Send kick notification to kicked client
            sessions.forEach((s) => {
              if (s.playerId === targetPlayerId && s.ws.readyState === WebSocket.OPEN) {
                s.ws.send(JSON.stringify({ type: 'kicked', payload: 'You were kicked from the lobby by the host.' }));
              }
            });
            broadcastRoomState(session.roomCode);
          }
          break;
        }

        case 'start-game': {
          const session = sessions.get(ws);
          if (!session) return;
          const room = rooms[session.roomCode];
          if (!room || room.gameState !== 'lobby') return;

          const hostPlayer = room.players[session.playerId];
          if (!hostPlayer || !hostPlayer.isHost) {
            console.error('[DEBUG] Any network or synchronization error: Non-host tried to start game');
            ws.send(JSON.stringify({ type: 'error', payload: 'Only the host can start the game.' }));
            return;
          }

          console.log(`[DEBUG] Start Game requested by host ${hostPlayer.name} in room ${session.roomCode}`);

          const playersList = Object.values(room.players);
          
          // Validation: Minimum 2 players
          if (playersList.length < 2) {
            console.error('[DEBUG] Any network or synchronization error: Cannot start game with less than 2 players');
            ws.send(JSON.stringify({ type: 'error', payload: 'Requires at least 2 players to start the game.' }));
            return;
          }

          // Validation: Check that everyone is ready
          const unreadyPlayers = playersList.filter(p => !p.ready);
          if (unreadyPlayers.length > 0) {
            const unreadyNames = unreadyPlayers.map(p => p.name).join(', ');
            console.error(`[DEBUG] Any network or synchronization error: Players not ready: ${unreadyNames}`);
            ws.send(JSON.stringify({ type: 'error', payload: `Waiting for players to ready up: ${unreadyNames}` }));
            return;
          }

          // Settings validity check
          const validation = validateSettings(playersList.length, room.settings);
          if (!validation.valid) {
            console.error(`[DEBUG] Any network or synchronization error: ${validation.error}`);
            ws.send(JSON.stringify({ type: 'error', payload: validation.error }));
            return;
          }

          // Settings valid, configure game: Shuffle and assign roles
          const shuffledPlayers = [...playersList].sort(() => Math.random() - 0.5);
          const seekerCount = room.settings.numSeekers;

          // Set activeMapId (randomize if 'random')
          let activeMapId = room.settings.mapId || 'meadow';
          if (activeMapId === 'random') {
            const maps = ['meadow', 'graveyard', 'toybox'];
            activeMapId = maps[Math.floor(Math.random() * maps.length)];
          }
          room.activeMapId = activeMapId;

          playersList.forEach(p => {
            p.score = 0; // reset active match score
            p.status = 'alive';
            p.survivalTime = undefined;
          });

          for (let i = 0; i < shuffledPlayers.length; i++) {
            const pId = shuffledPlayers[i].id;
            const playerInRoom = room.players[pId];
            if (i < seekerCount) {
              playerInRoom.role = 'seeker';
              playerInRoom.speed = 5.6; // seekers are slightly faster
            } else {
              playerInRoom.role = 'hider';
              playerInRoom.speed = 4.7; // hiders normal speed
            }

            // Set safe spawns using activeMapId
            const spawn = getRandomSpawnPoint(playerInRoom.role === 'seeker', room.activeMapId);
            playerInRoom.x = spawn.x;
            playerInRoom.y = spawn.y;
          }

          room.gameState = 'hiding';
          (room as any).lastHiderAnnounced = false;
          room.hideCountdown = room.settings.hideTime;
          room.matchTimer = room.settings.matchDuration * 60;

          console.log(`[DEBUG] Game state changed to playing in room ${session.roomCode}`);

          broadcastToRoom(session.roomCode, { type: 'game-start', payload: room });
          startGameTimer(session.roomCode);
          startRoomHighFreqLoop(session.roomCode);
          break;
        }

        case 'move': {
          const session = sessions.get(ws);
          if (!session) return;
          const room = rooms[session.roomCode];
          if (!room || (room.gameState !== 'hiding' && room.gameState !== 'playing')) return;

          const player = room.players[session.playerId];
          if (!player || player.status === 'found') return;

          // Seeker cannot move during hiding countdown phase
          if (room.gameState === 'hiding' && player.role === 'seeker') {
            return;
          }

          const { x, y } = payload;
          
          // Verify movement is within bounds
          if (x >= 0 && x <= MAP_WIDTH && y >= 0 && y <= MAP_HEIGHT) {
            // Apply coordinates
            player.x = x;
            player.y = y;
            player.lastActive = Date.now();

            // Mark player as dirty for high-frequency loop broadcast
            if (!(room as any).dirtyPlayers) {
              (room as any).dirtyPlayers = new Set<string>();
            }
            (room as any).dirtyPlayers.add(player.id);
          }
          break;
        }

        case 'tag': {
          const session = sessions.get(ws);
          if (!session) return;
          const room = rooms[session.roomCode];
          if (!room || room.gameState !== 'playing') return;

          const seeker = room.players[session.playerId];
          if (!seeker || seeker.role !== 'seeker' || seeker.status === 'found') return;

          const { hiderId } = payload;
          const hider = room.players[hiderId];
          if (!hider || hider.role !== 'hider' || hider.status !== 'alive') return;

          // Server-side distance check to validate tagging (allow slightly extra due to network latency)
          const dx = hider.x - seeker.x;
          const dy = hider.y - seeker.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Safe contact radius: player radius 16 * 2 + padding (say, 45 pixels maximum)
          if (distance <= 45) {
            hider.status = 'found';
            hider.survivalTime = room.settings.matchDuration * 60 - room.matchTimer;
            seeker.score += 1; // seeker gets score for finding this player

            broadcastToRoom(session.roomCode, { 
              type: 'player-found', 
              payload: { 
                hiderId: hider.id, 
                hiderName: hider.name, 
                seekerId: seeker.id, 
                seekerName: seeker.name 
              } 
            });

            // Check if game is over (no more hiders left)
            const remainingHiders = Object.values(room.players).filter(p => p.role === 'hider' && p.status === 'alive');
            if (remainingHiders.length === 0) {
              endGame(session.roomCode, 'seekers');
            } else {
              broadcastRoomState(session.roomCode);
            }
          }
          break;
        }

        case 'leave-room': {
          handleDisconnect(ws);
          break;
        }

        case 'return-to-lobby': {
          const session = sessions.get(ws);
          if (!session) return;
          const room = rooms[session.roomCode];
          if (!room || room.gameState !== 'ended') return;

          const player = room.players[session.playerId];
          if (!player || !player.isHost) {
            ws.send(JSON.stringify({ type: 'error', payload: 'Only the host can return to lobby.' }));
            return;
          }

          room.gameState = 'lobby';
          Object.values(room.players).forEach(p => {
            p.ready = p.isHost;
            p.role = 'spectator';
            p.status = 'alive';
            p.score = 0;
          });
          room.stats = undefined;
          broadcastRoomState(session.roomCode);
          break;
        }

        case 'play-again': {
          const session = sessions.get(ws);
          if (!session) return;
          const room = rooms[session.roomCode];
          if (!room || room.gameState !== 'ended') return;

          const player = room.players[session.playerId];
          if (!player || !player.isHost) {
            ws.send(JSON.stringify({ type: 'error', payload: 'Only the host can restart the game.' }));
            return;
          }

          const playersList = Object.values(room.players);
          const validation = validateSettings(playersList.length, room.settings);
          if (!validation.valid) {
            ws.send(JSON.stringify({ type: 'error', payload: validation.error }));
            return;
          }

          const shuffledPlayers = [...playersList].sort(() => Math.random() - 0.5);
          const seekerCount = room.settings.numSeekers;

          // Set activeMapId (randomize if 'random')
          let activeMapId = room.settings.mapId || 'meadow';
          if (activeMapId === 'random') {
            const maps = ['meadow', 'graveyard', 'toybox'];
            activeMapId = maps[Math.floor(Math.random() * maps.length)];
          }
          room.activeMapId = activeMapId;

          playersList.forEach(p => {
            p.score = 0;
            p.status = 'alive';
            p.survivalTime = undefined;
          });

          for (let i = 0; i < shuffledPlayers.length; i++) {
            const pId = shuffledPlayers[i].id;
            const playerInRoom = room.players[pId];
            if (i < seekerCount) {
              playerInRoom.role = 'seeker';
              playerInRoom.speed = 4.8;
            } else {
              playerInRoom.role = 'hider';
              playerInRoom.speed = 4.0;
            }

            const spawn = getRandomSpawnPoint(playerInRoom.role === 'seeker', room.activeMapId);
            playerInRoom.x = spawn.x;
            playerInRoom.y = spawn.y;
          }

          room.gameState = 'hiding';
          (room as any).lastHiderAnnounced = false;
          room.hideCountdown = room.settings.hideTime;
          room.matchTimer = room.settings.matchDuration * 60;
          room.stats = undefined;

          broadcastToRoom(session.roomCode, { type: 'game-start', payload: room });
          startGameTimer(session.roomCode);
          startRoomHighFreqLoop(session.roomCode);
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  // Client connection severed
  ws.on('close', () => {
    clearInterval(pingInterval);
    handleDisconnect(ws);
  });

  ws.on('error', () => {
    clearInterval(pingInterval);
    handleDisconnect(ws);
  });
});

// Handle player departure or disconnect gracefully
function handleDisconnect(ws: WebSocket) {
  const session = sessions.get(ws);
  if (!session) return;

  const { playerId, roomCode } = session;
  sessions.delete(ws);

  const room = rooms[roomCode];
  if (!room) return;

  const player = room.players[playerId];
  if (!player) return;

  console.log(`[DEBUG] Player disconnected: ${player.name} (${playerId}) from room ${roomCode}`);

  const disconnectKey = `${roomCode}:${playerId}`;
  if (disconnectTimers.has(disconnectKey)) {
    clearTimeout(disconnectTimers.get(disconnectKey)!);
  }

  // Grace period timer: wait 15 seconds before removing player permanently
  const timer = setTimeout(() => {
    disconnectTimers.delete(disconnectKey);
    const currentRoom = rooms[roomCode];
    if (!currentRoom) return;

    // Remove player if still not connected
    delete currentRoom.players[playerId];
    const remainingPlayers = Object.values(currentRoom.players);

    if (remainingPlayers.length === 0) {
      // Room empty: set 30s timer before destroying room completely
      if (roomDeleteTimers.has(roomCode)) {
        clearTimeout(roomDeleteTimers.get(roomCode)!);
      }
      const roomTimer = setTimeout(() => {
        roomDeleteTimers.delete(roomCode);
        if (rooms[roomCode] && Object.keys(rooms[roomCode].players).length === 0) {
          if (roomTimers[roomCode]) {
            clearInterval(roomTimers[roomCode]);
            delete roomTimers[roomCode];
          }
          stopRoomHighFreqLoop(roomCode);
          delete rooms[roomCode];
          console.log(`Room ${roomCode} destroyed (empty)`);
        }
      }, 30000);
      roomDeleteTimers.set(roomCode, roomTimer);
    } else {
      // Host Migration
      if (player.isHost) {
        const nextHost = remainingPlayers.find(p => p.ready) || remainingPlayers[0];
        if (nextHost) {
          nextHost.isHost = true;
          nextHost.ready = true;
          broadcastToRoom(roomCode, { type: 'announcement', payload: `${nextHost.name} has been promoted to Host.` });
        }
      }

      broadcastToRoom(roomCode, { type: 'announcement', payload: `${player.name} left the room.` });

      if (currentRoom.gameState === 'playing' || currentRoom.gameState === 'hiding') {
        const seekers = remainingPlayers.filter(p => p.role === 'seeker');
        const hiders = remainingPlayers.filter(p => p.role === 'hider' && p.status === 'alive');

        if (seekers.length === 0) {
          broadcastToRoom(roomCode, { type: 'announcement', payload: 'No seekers remaining. Returning to lobby.' });
          currentRoom.gameState = 'lobby';
          remainingPlayers.forEach(p => p.ready = false);
          stopRoomHighFreqLoop(roomCode);
        } else if (hiders.length === 0) {
          endGame(roomCode, 'seekers');
          return;
        }
      }

      broadcastRoomState(roomCode);
    }
  }, 15000);

  disconnectTimers.set(disconnectKey, timer);
}

// --------------------------------------------------------
// Vite configuration & Express routing setup
// --------------------------------------------------------

// Standard API endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', playersOnline: sessions.size, activeRooms: Object.keys(rooms).length });
});

// Endpoint to list active public lobbies
app.get('/api/public-lobbies', (req, res) => {
  const publicRooms = Object.values(rooms)
    .filter((room) => !room.settings.isPrivate && room.gameState === 'lobby')
    .map((room) => ({
      code: room.code,
      playerCount: Object.keys(room.players).length,
      maxPlayers: room.settings.maxPlayers,
      mapId: room.activeMapId || room.settings.mapId || 'meadow',
      hostName: Object.values(room.players).find((p) => p.isHost)?.name || 'Host',
    }));
  res.json({ lobbies: publicRooms });
});

// Setup Vite Dev server or Serve static files
const setupVite = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
};

setupVite().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
});
