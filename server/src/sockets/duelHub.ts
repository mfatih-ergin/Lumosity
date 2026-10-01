import { Server, Socket } from 'socket.io';
import { prisma } from '../config/db';

interface PlayerInfo {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string;
  bpi: number;
}

interface MatchRoom {
  id: string;
  player1: PlayerInfo;
  player2: PlayerInfo;
  gameId: string;
  seed: string;
  p1Score: number;
  p2Score: number;
  p1Combo: number;
  p2Combo: number;
  durationSeconds: number;
  status: 'COUNTDOWN' | 'PLAYING' | 'FINISHED';
  isBotMatch: boolean;
  botInterval?: NodeJS.Timeout;
}

export function setupDuelSocketHub(io: Server) {
  const matchmakingQueue: Array<{ player: PlayerInfo; gameId: string; queuedAt: number }> = [];
  const activeRooms = new Map<string, MatchRoom>();

  const AVAILABLE_DUEL_GAMES = ['lost-in-flight', 'stroop-rush', 'spatial-matrix'];

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join Matchmaking Queue
    socket.on('join_matchmaking', (data: { userId: string; username: string; avatarUrl?: string; bpi?: number; preferredGame?: string }) => {
      const player: PlayerInfo = {
        socketId: socket.id,
        userId: data.userId || `guest_${socket.id.slice(0, 5)}`,
        username: data.username || 'Nöron Gezgini',
        avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${socket.id}`,
        bpi: data.bpi || 500,
      };

      const gameId = data.preferredGame && AVAILABLE_DUEL_GAMES.includes(data.preferredGame)
        ? data.preferredGame
        : AVAILABLE_DUEL_GAMES[Math.floor(Math.random() * AVAILABLE_DUEL_GAMES.length)];

      // Check if someone else is waiting
      const opponentIndex = matchmakingQueue.findIndex((q) => q.player.socketId !== socket.id);

      if (opponentIndex !== -1) {
        // Match found!
        const matchOpponent = matchmakingQueue.splice(opponentIndex, 1)[0];
        createMatchRoom(io, player, matchOpponent.player, gameId, false, activeRooms);
      } else {
        // Add to queue
        matchmakingQueue.push({ player, gameId, queuedAt: Date.now() });
        socket.emit('matchmaking_queued', { message: 'Rakip aranıyor...' });

        // Auto-match with AI Bot after 4.5 seconds if no human opponent joins
        setTimeout(() => {
          const queueIdx = matchmakingQueue.findIndex((q) => q.player.socketId === socket.id);
          if (queueIdx !== -1) {
            const queuedItem = matchmakingQueue.splice(queueIdx, 1)[0];
            const botNames = ['Cortex-AI', 'NeuroBot_99', 'Synapse_Pro', 'BrainWave_X', 'AeroMind'];
            const randomBotName = botNames[Math.floor(Math.random() * botNames.length)];
            const botPlayer: PlayerInfo = {
              socketId: `bot_${Date.now()}`,
              userId: `bot_system_${Date.now()}`,
              username: randomBotName,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${randomBotName}`,
              bpi: Math.round(player.bpi + (Math.random() * 80 - 40)),
            };

            createMatchRoom(io, queuedItem.player, botPlayer, queuedItem.gameId, true, activeRooms);
          }
        }, 4500);
      }
    });

    // Cancel Matchmaking
    socket.on('cancel_matchmaking', () => {
      const index = matchmakingQueue.findIndex((q) => q.player.socketId === socket.id);
      if (index !== -1) {
        matchmakingQueue.splice(index, 1);
        socket.emit('matchmaking_cancelled');
      }
    });

    // Real-time Score Update during Duel
    socket.on('duel_score_update', (data: { roomId: string; score: number; combo: number; round: number }) => {
      const room = activeRooms.get(data.roomId);
      if (!room) return;

      const isP1 = room.player1.socketId === socket.id;
      if (isP1) {
        room.p1Score = data.score;
        room.p1Combo = data.combo;
      } else {
        room.p2Score = data.score;
        room.p2Combo = data.combo;
      }

      // Broadcast opponent's live progress
      io.to(room.id).emit('duel_live_stats', {
        p1Score: room.p1Score,
        p2Score: room.p2Score,
        p1Combo: room.p1Combo,
        p2Combo: room.p2Combo,
      });
    });

    // Duel Completed by Player
    socket.on('duel_player_finished', async (data: { roomId: string; finalScore: number; accuracy: number }) => {
      const room = activeRooms.get(data.roomId);
      if (!room) return;

      const isP1 = room.player1.socketId === socket.id;
      if (isP1) {
        room.p1Score = data.finalScore;
      } else {
        room.p2Score = data.finalScore;
      }

      endMatchRoom(io, room, activeRooms);
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      // Remove from matchmaking queue if present
      const index = matchmakingQueue.findIndex((q) => q.player.socketId === socket.id);
      if (index !== -1) matchmakingQueue.splice(index, 1);

      // Handle active room disconnect
      for (const [roomId, room] of activeRooms.entries()) {
        if (room.player1.socketId === socket.id || room.player2.socketId === socket.id) {
          if (room.botInterval) clearInterval(room.botInterval);
          io.to(roomId).emit('duel_opponent_left', { message: 'Rakip bağlantısı koptu. Hükmen galipsiniz!' });
          activeRooms.delete(roomId);
        }
      }
    });
  });
}

function createMatchRoom(
  io: Server,
  p1: PlayerInfo,
  p2: PlayerInfo,
  gameId: string,
  isBotMatch: boolean,
  activeRooms: Map<string, MatchRoom>
) {
  const roomId = `duel_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const seed = `seed_${Date.now()}_${Math.random()}`;
  const durationSeconds = 45; // 45 second fast-paced duel

  const room: MatchRoom = {
    id: roomId,
    player1: p1,
    player2: p2,
    gameId,
    seed,
    p1Score: 0,
    p2Score: 0,
    p1Combo: 0,
    p2Combo: 0,
    durationSeconds,
    status: 'COUNTDOWN',
    isBotMatch,
  };

  activeRooms.set(roomId, room);

  // Join sockets to room
  const socket1 = io.sockets.sockets.get(p1.socketId);
  if (socket1) socket1.join(roomId);

  if (!isBotMatch) {
    const socket2 = io.sockets.sockets.get(p2.socketId);
    if (socket2) socket2.join(roomId);
  }

  // Notify players that match is found
  io.to(roomId).emit('duel_matched', {
    roomId,
    gameId,
    seed,
    durationSeconds,
    player1: p1,
    player2: p2,
  });

  // Start Bot AI Simulation if playing vs Bot
  if (isBotMatch) {
    simulateBotProgress(io, room);
  }
}

function simulateBotProgress(io: Server, room: MatchRoom) {
  let botScore = 0;
  let botCombo = 0;

  const interval = setInterval(() => {
    if (room.status === 'FINISHED') {
      clearInterval(interval);
      return;
    }

    // Bot scoring logic based on simulated BPI
    const hitSuccess = Math.random() < 0.88; // 88% accuracy
    if (hitSuccess) {
      botCombo++;
      const gain = 100 + Math.min(botCombo * 20, 200) + Math.floor(Math.random() * 30);
      botScore += gain;
    } else {
      botCombo = 0;
    }

    room.p2Score = botScore;
    room.p2Combo = botCombo;

    io.to(room.id).emit('duel_live_stats', {
      p1Score: room.p1Score,
      p2Score: room.p2Score,
      p1Combo: room.p1Combo,
      p2Combo: room.p2Combo,
    });
  }, 1200 + Math.floor(Math.random() * 500));

  room.botInterval = interval;
}

async function endMatchRoom(io: Server, room: MatchRoom, activeRooms: Map<string, MatchRoom>) {
  if (room.status === 'FINISHED') return;
  room.status = 'FINISHED';

  if (room.botInterval) {
    clearInterval(room.botInterval);
  }

  let winnerId: string | null = null;
  let isTie = room.p1Score === room.p2Score;

  if (!isTie) {
    winnerId = room.p1Score > room.p2Score ? room.player1.userId : room.player2.userId;
  }

  // Save to database if neither is a guest/bot with missing DB record
  try {
    if (!room.isBotMatch && !room.player1.userId.startsWith('guest_') && !room.player2.userId.startsWith('guest_')) {
      await prisma.duelMatch.create({
        data: {
          player1Id: room.player1.userId,
          player2Id: room.player2.userId,
          gameId: room.gameId,
          player1Score: room.p1Score,
          player2Score: room.p2Score,
          winnerId,
          gameSeed: room.seed,
        },
      });
    }
  } catch (err) {
    console.error('Failed to persist duel record:', err);
  }

  io.to(room.id).emit('duel_ended', {
    roomId: room.id,
    p1Score: room.p1Score,
    p2Score: room.p2Score,
    winnerId,
    isTie,
    winnerUsername: winnerId === room.player1.userId ? room.player1.username : room.player2.username,
  });

  setTimeout(() => {
    activeRooms.delete(room.id);
  }, 5000);
}
