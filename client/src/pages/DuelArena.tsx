import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Trophy, 
  RotateCcw, 
  Loader2, 
  Sparkles,
  Zap,
  Target
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useDuelSocket } from '../services/duelSocket';
import { sounds } from '../services/soundEffects';

import { LostInFlightGame } from '../games/lost-in-flight/LostInFlightGame';
import { StroopRushGame } from '../games/stroop-rush/StroopRushGame';
import { SpatialMatrixGame } from '../games/spatial-matrix/SpatialMatrixGame';

export const DuelArena: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedGame, setSelectedGame] = useState<string>('lost-in-flight');

  const {
    activeRoom,
    isQueued,
    matchmakingMessage,
    startMatchmaking,
    cancelMatchmaking,
    sendScoreUpdate,
    leaveDuel,
  } = useDuelSocket();

  useEffect(() => {
    return () => {
      leaveDuel();
    };
  }, []);

  const handleStartMatchmaking = () => {
    if (!user) return;
    sounds.playClick();
    startMatchmaking(
      {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        overallBpi: user.overallBpi,
      },
      selectedGame
    );
  };

  const isPlayer1 = activeRoom?.player1.userId === user?.id;
  const myScore = isPlayer1 ? activeRoom?.p1Score : activeRoom?.p2Score;
  const oppScore = isPlayer1 ? activeRoom?.p2Score : activeRoom?.p1Score;
  const oppPlayer = isPlayer1 ? activeRoom?.player2 : activeRoom?.player1;

  // Active Live Duel View
  if (activeRoom) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-black">
        
        {/* Duel Live HUD & Comparison Bar */}
        <div className="neo-card p-4 sm:p-6 shadow-[5px_5px_0px_0px_#000]">
          <div className="flex items-center justify-between gap-4">
            
            {/* Player 1 (You) */}
            <div className="flex items-center gap-3">
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
                alt="Sen"
                className="w-12 h-12 rounded-2xl border-2 border-black bg-amber-100 shadow-[2px_2px_0px_0px_#000] object-cover"
              />
              <div>
                <div className="neo-badge bg-[#4ecdc4] text-[10px] py-0 px-2 mb-0.5">SEN</div>
                <div className="text-base sm:text-lg font-black text-black">{user?.username}</div>
                <div className="text-2xl font-black text-black font-mono">{(myScore || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Match VS Badge */}
            <div className="flex flex-col items-center">
              <div className="neo-badge bg-[#ff6b6b] text-black">
                <Swords className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                <span>CANLI DÜELLO</span>
              </div>
              <div className="text-neutral-600 text-[11px] font-bold font-mono mt-1">45 Saniyelik Zeka Kapışması</div>
            </div>

            {/* Player 2 (Opponent) */}
            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="neo-badge bg-[#ff6b6b] text-[10px] py-0 px-2 mb-0.5">RAKİP</div>
                <div className="text-base sm:text-lg font-black text-black">{oppPlayer?.username}</div>
                <div className="text-2xl font-black text-black font-mono">{(oppScore || 0).toLocaleString()}</div>
              </div>
              <img
                src={oppPlayer?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${oppPlayer?.username}`}
                alt={oppPlayer?.username}
                className="w-12 h-12 rounded-2xl border-2 border-black bg-purple-100 shadow-[2px_2px_0px_0px_#000] object-cover"
              />
            </div>
          </div>

          {/* Tug-of-war Score Comparison Bar */}
          <div className="mt-4">
            <div className="w-full h-4 rounded-full border-2 border-black bg-white overflow-hidden flex p-0.5 shadow-[2px_2px_0px_0px_#000]">
              <div
                className="h-full bg-[#4ecdc4] border-r-2 border-black transition-all duration-300"
                style={{
                  width: `${
                    ((myScore || 0) + (oppScore || 0)) === 0
                      ? 50
                      : Math.max(5, Math.min(95, ((myScore || 0) / ((myScore || 0) + (oppScore || 0) + 1)) * 100))
                  }%`,
                }}
              />
              <div
                className="h-full bg-[#ff6b6b] transition-all duration-300"
                style={{
                  width: `${
                    ((myScore || 0) + (oppScore || 0)) === 0
                      ? 50
                      : Math.max(5, Math.min(95, ((oppScore || 0) / ((myScore || 0) + (oppScore || 0) + 1)) * 100))
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Embedded Synchronized Duel Game */}
        <div className="w-full">
          {activeRoom.gameId === 'lost-in-flight' && (
            <LostInFlightGame
              onExit={leaveDuel}
              duelSeed={activeRoom.seed}
              onDuelScoreUpdate={(score, combo, round) => sendScoreUpdate(score, combo, round)}
            />
          )}

          {activeRoom.gameId === 'stroop-rush' && (
            <StroopRushGame
              onExit={leaveDuel}
              duelSeed={activeRoom.seed}
              onDuelScoreUpdate={(score, combo, round) => sendScoreUpdate(score, combo, round)}
            />
          )}

          {activeRoom.gameId === 'spatial-matrix' && (
            <SpatialMatrixGame onExit={leaveDuel} />
          )}
        </div>

        {/* Duel Result Modal */}
        {activeRoom.isFinished && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-black">
            <div className="w-full max-w-md rounded-3xl bg-white border-[3px] border-black p-8 shadow-[8px_8px_0px_0px_#000] text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ffd43b] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-4">
                <Trophy className="w-8 h-8 text-black stroke-[2.5]" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-black">
                {activeRoom.winnerId === user?.id
                  ? '🏆 TEBRİKLER, KAZANDIN!'
                  : activeRoom.isTie
                  ? '🤝 DOSTLUK KAZANDI (BERABERE)'
                  : '💀 RAKİP KAZANDI!'}
              </h2>

              <p className="text-xs font-bold text-neutral-600 mt-1 mb-6">
                Düello sonuçları liderlik tablosuna kaydedildi.
              </p>

              <div className="p-4 rounded-2xl bg-[#fffdf5] border-2 border-black grid grid-cols-2 gap-4 mb-6 shadow-[2px_2px_0px_0px_#000]">
                <div>
                  <div className="text-xs text-neutral-600 font-mono font-bold">Senin Puanın</div>
                  <div className="text-2xl font-black text-black font-mono">{(myScore || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-600 font-mono font-bold">Rakip Puanı</div>
                  <div className="text-2xl font-black text-black font-mono">{(oppScore || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    sounds.playClick();
                    leaveDuel();
                    handleStartMatchmaking();
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#ff6b6b] hover:bg-[#fa5252] border-2 border-black text-black font-black text-xs shadow-[3px_3px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>Yeni Düello Bul</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    leaveDuel();
                  }}
                  className="px-5 py-3 rounded-xl border-2 border-black bg-white hover:bg-amber-50 text-black font-black text-xs shadow-[2px_2px_0px_0px_#000]"
                >
                  Çıkış
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Lobby / Matchmaking Queue View
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fade-in text-black">
      
      {/* Header Banner */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="neo-badge bg-[#ff6b6b] text-black">
          <Swords className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span>EŞZAMANLI ÇOK OYUNCULU BEYİN ARENASI</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
          1v1 Canlı Düello
        </h1>
        <p className="text-xs sm:text-sm font-bold text-neutral-600">
          Aynı tohumla üretilmiş zeka bulmacalarında rakibinizle 45 saniye boyunca yarışın. En hızlı tepkiyi veren ve en yüksek komboyu yapan kazanır!
        </p>
      </div>

      {/* Duel Config Card */}
      <div className="neo-card p-6 sm:p-10 max-w-xl mx-auto text-center shadow-[6px_6px_0px_0px_#000]">
        
        {isQueued ? (
          <div className="py-8 space-y-6">
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-[#ffd43b] border-2 border-black shadow-[3px_3px_0px_0px_#000] text-black">
              <Loader2 className="w-12 h-12 animate-spin stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-black">{matchmakingMessage || 'Rakip Aranıyor...'}</h3>
              <p className="text-xs font-bold text-neutral-600 mt-1">
                Eşit BPI seviyesindeki nöron ustaları taranıyor
              </p>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                cancelMatchmaking();
              }}
              className="neo-btn bg-white text-black px-6 py-2.5 text-xs shadow-[2.5px_2.5px_0px_0px_#000] hover:bg-amber-50"
            >
              İptal Et
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-left">
              <label className="block text-xs font-black text-black mb-2 uppercase font-mono">
                Düello Kategorisi Seçin
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedGame('lost-in-flight')}
                  className={`p-4 rounded-2xl border-2 border-black text-left transition-all ${
                    selectedGame === 'lost-in-flight'
                      ? 'bg-[#fde047] text-black shadow-[3px_3px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
                      : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#fff9ea]'
                  }`}
                >
                  <div className="font-black text-sm">Lost in Flight</div>
                  <div className="text-[10px] font-bold text-neutral-700">Dikkat & Flanker Kapışması</div>
                </button>

                <button
                  onClick={() => setSelectedGame('stroop-rush')}
                  className={`p-4 rounded-2xl border-2 border-black text-left transition-all ${
                    selectedGame === 'stroop-rush'
                      ? 'bg-[#fde047] text-black shadow-[3px_3px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
                      : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#fff9ea]'
                  }`}
                >
                  <div className="font-black text-sm">Stroop Rush</div>
                  <div className="text-[10px] font-bold text-neutral-700">İşlem Hızı & Renk Düellosu</div>
                </button>
              </div>
            </div>

            <button
              onClick={handleStartMatchmaking}
              className="w-full py-4 rounded-2xl border-2 border-black bg-[#ff6b6b] hover:bg-[#fa5252] text-black font-black text-base shadow-[4px_4px_0px_0px_#000] hover:shadow-[5px_5px_0px_0px_#000] flex items-center justify-center gap-2 transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px]"
            >
              <Swords className="w-5 h-5 stroke-[2.5]" />
              <span>Hemen Rakip Bul ve Başla</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
