import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { DuelRoomState } from '../types';
import { sounds } from '../services/soundEffects';

interface DuelState {
  socket: Socket | null;
  isConnecting: boolean;
  isQueued: boolean;
  activeRoom: DuelRoomState | null;
  matchmakingMessage: string;
  initSocket: () => void;
  joinMatchmaking: (user: { id: string; username: string; avatarUrl?: string; overallBpi: number }, preferredGame?: string) => void;
  cancelMatchmaking: () => void;
  sendScoreUpdate: (score: number, combo: number, round: number) => void;
  sendPlayerFinished: (finalScore: number, accuracy: number) => void;
  leaveDuel: () => void;
}

export const useDuelStore = create<DuelState>((set, get) => ({
  socket: null,
  isConnecting: false,
  isQueued: false,
  activeRoom: null,
  matchmakingMessage: '',

  initSocket: () => {
    if (get().socket) return;

    set({ isConnecting: true });
    const socket = io({
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      set({ isConnecting: false });
    });

    socket.on('matchmaking_queued', (data: { message: string }) => {
      set({ isQueued: true, matchmakingMessage: data.message });
    });

    socket.on('matchmaking_cancelled', () => {
      set({ isQueued: false, matchmakingMessage: '' });
    });

    socket.on('duel_matched', (data: any) => {
      sounds.playVictory();
      set({
        isQueued: false,
        activeRoom: {
          roomId: data.roomId,
          gameId: data.gameId,
          seed: data.seed,
          durationSeconds: data.durationSeconds,
          player1: data.player1,
          player2: data.player2,
          p1Score: 0,
          p2Score: 0,
          p1Combo: 0,
          p2Combo: 0,
          isFinished: false,
        },
      });
    });

    socket.on('duel_live_stats', (data: { p1Score: number; p2Score: number; p1Combo: number; p2Combo: number }) => {
      const current = get().activeRoom;
      if (current) {
        set({
          activeRoom: {
            ...current,
            p1Score: data.p1Score,
            p2Score: data.p2Score,
            p1Combo: data.p1Combo,
            p2Combo: data.p2Combo,
          },
        });
      }
    });

    socket.on('duel_ended', (data: any) => {
      const current = get().activeRoom;
      if (current) {
        set({
          activeRoom: {
            ...current,
            p1Score: data.p1Score,
            p2Score: data.p2Score,
            isFinished: true,
            winnerId: data.winnerId,
            winnerUsername: data.winnerUsername,
            isTie: data.isTie,
          },
        });
      }
    });

    socket.on('duel_opponent_left', (data: { message: string }) => {
      const current = get().activeRoom;
      if (current) {
        set({
          activeRoom: {
            ...current,
            isFinished: true,
            winnerUsername: 'Hükmen Kazandınız (Rakip Ayrıldı)',
          },
        });
      }
    });

    set({ socket });
  },

  joinMatchmaking: (user, preferredGame) => {
    let socket = get().socket;
    if (!socket) {
      get().initSocket();
      socket = get().socket;
    }

    if (socket) {
      socket.emit('join_matchmaking', {
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bpi: user.overallBpi,
        preferredGame,
      });
      set({ isQueued: true, matchmakingMessage: 'Rakip aranıyor...' });
    }
  },

  cancelMatchmaking: () => {
    const socket = get().socket;
    if (socket) {
      socket.emit('cancel_matchmaking');
    }
    set({ isQueued: false, matchmakingMessage: '' });
  },

  sendScoreUpdate: (score, combo, round) => {
    const { socket, activeRoom } = get();
    if (socket && activeRoom) {
      socket.emit('duel_score_update', {
        roomId: activeRoom.roomId,
        score,
        combo,
        round,
      });
    }
  },

  sendPlayerFinished: (finalScore, accuracy) => {
    const { socket, activeRoom } = get();
    if (socket && activeRoom) {
      socket.emit('duel_player_finished', {
        roomId: activeRoom.roomId,
        finalScore,
        accuracy,
      });
    }
  },

  leaveDuel: () => {
    set({ activeRoom: null, isQueued: false });
  },
}));
