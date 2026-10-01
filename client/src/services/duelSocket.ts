import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DuelPlayer {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string;
  bpi: number;
}

export interface ActiveDuelRoom {
  roomId: string;
  gameId: string;
  seed: string;
  durationSeconds: number;
  player1: DuelPlayer;
  player2: DuelPlayer;
  p1Score: number;
  p2Score: number;
  p1Combo: number;
  p2Combo: number;
  isFinished?: boolean;
  winnerId?: string | null;
  isTie?: boolean;
}

export function useDuelSocket() {
  const [activeRoom, setActiveRoom] = useState<ActiveDuelRoom | null>(null);
  const [isQueued, setIsQueued] = useState<boolean>(false);
  const [matchmakingMessage, setMatchmakingMessage] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef<ActiveDuelRoom | null>(null);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // Connect socket
  useEffect(() => {
    // In dev, Vite proxies /socket.io to backend
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[DuelSocket] Connected to duel hub with socket id:', socket.id);
    });

    socket.on('matchmaking_queued', (data: { message: string }) => {
      setIsQueued(true);
      setMatchmakingMessage(data.message || 'Rakip aranıyor...');
    });

    socket.on('matchmaking_cancelled', () => {
      setIsQueued(false);
      setMatchmakingMessage('');
    });

    socket.on('duel_matched', (data: {
      roomId: string;
      gameId: string;
      seed: string;
      durationSeconds: number;
      player1: DuelPlayer;
      player2: DuelPlayer;
    }) => {
      setIsQueued(false);
      setMatchmakingMessage('');
      const room: ActiveDuelRoom = {
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
      };
      setActiveRoom(room);
    });

    socket.on('duel_live_stats', (data: {
      p1Score: number;
      p2Score: number;
      p1Combo: number;
      p2Combo: number;
    }) => {
      setActiveRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          p1Score: data.p1Score,
          p2Score: data.p2Score,
          p1Combo: data.p1Combo,
          p2Combo: data.p2Combo,
        };
      });
    });

    socket.on('duel_ended', (data: {
      roomId: string;
      p1Score: number;
      p2Score: number;
      winnerId: string | null;
      isTie: boolean;
      winnerUsername: string;
    }) => {
      setActiveRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          p1Score: data.p1Score,
          p2Score: data.p2Score,
          isFinished: true,
          winnerId: data.winnerId,
          isTie: data.isTie,
        };
      });
    });

    socket.on('duel_opponent_left', (data: { message: string }) => {
      setActiveRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          isFinished: true,
          winnerId: prev.player1.socketId === socket.id ? prev.player1.userId : prev.player2.userId,
          isTie: false,
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startMatchmaking = useCallback(
    (
      player: { id: string; username: string; avatarUrl?: string; overallBpi?: number },
      preferredGame: string
    ) => {
      if (!socketRef.current) return;
      setIsQueued(true);
      setMatchmakingMessage('Rakip aranıyor...');
      socketRef.current.emit('join_matchmaking', {
        userId: player.id,
        username: player.username,
        avatarUrl: player.avatarUrl,
        bpi: player.overallBpi,
        preferredGame,
      });
    },
    []
  );

  const cancelMatchmaking = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('cancel_matchmaking');
    setIsQueued(false);
    setMatchmakingMessage('');
  }, []);

  const sendScoreUpdate = useCallback(
    (score: number, combo: number, round: number) => {
      if (!socketRef.current || !activeRoomRef.current) return;
      socketRef.current.emit('duel_score_update', {
        roomId: activeRoomRef.current.roomId,
        score,
        combo,
        round,
      });
    },
    []
  );

  const sendPlayerFinished = useCallback(
    (finalScore: number, accuracy: number) => {
      if (!socketRef.current || !activeRoomRef.current) return;
      socketRef.current.emit('duel_player_finished', {
        roomId: activeRoomRef.current.roomId,
        finalScore,
        accuracy,
      });
    },
    []
  );

  const leaveDuel = useCallback(() => {
    if (isQueued) {
      cancelMatchmaking();
    }
    setActiveRoom(null);
  }, [isQueued, cancelMatchmaking]);

  return {
    activeRoom,
    isQueued,
    matchmakingMessage,
    startMatchmaking,
    cancelMatchmaking,
    sendScoreUpdate,
    sendPlayerFinished,
    leaveDuel,
  };
}
