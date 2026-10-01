import React, { useState, useEffect } from 'react';
import { Bell, Flame, Sparkles, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { workoutApi } from '../../services/api';
import { sounds } from '../../services/soundEffects';

interface TrainingReminderToastProps {
  onNavigate: (tab: string) => void;
}

export const TrainingReminderToast: React.FC<TrainingReminderToastProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const [showToast, setShowToast] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  useEffect(() => {
    // Check Notification Permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    const checkDailyStatus = async () => {
      if (!user) return;

      // Only remind if settings permit
      if (user.settings && user.settings.dailyReminder === false) {
        setShowToast(false);
        return;
      }

      try {
        const workout = await workoutApi.getDaily();
        if (workout && !workout.isCompleted) {
          setWorkoutCompleted(false);

          // Check if dismissed in this session
          const isDismissed = sessionStorage.getItem('neuro_reminder_dismissed');
          if (!isDismissed) {
            setShowToast(true);
            // Play subtle chime sound
            sounds.playLevelUp();
          }

          // Trigger Desktop Notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            const lastNotified = localStorage.getItem('neuro_last_desktop_notification_date');
            const todayStr = new Date().toISOString().slice(0, 10);

            if (lastNotified !== todayStr) {
              new Notification('🧠 NeuroCraft Günlük Antrenman Zamanı!', {
                body: `${user.streakDays} günlük serini korumak için bugünkü beyin egzersizini yapmayı unutma!`,
                icon: '/favicon.ico',
              });
              localStorage.setItem('neuro_last_desktop_notification_date', todayStr);
            }
          }
        } else {
          setWorkoutCompleted(true);
          setShowToast(false);
        }
      } catch (err) {
        console.error('Check workout status error:', err);
      }
    };

    // Wait 2 seconds after page load before showing toast for smooth UX
    const timer = setTimeout(() => {
      checkDailyStatus();
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  const handleDismiss = () => {
    sounds.playClick();
    setShowToast(false);
    sessionStorage.setItem('neuro_reminder_dismissed', 'true');
  };

  const handleRequestPermission = async () => {
    sounds.playClick();
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('🔔 Antrenman Bildirimleri Aktif!', {
          body: 'Artık günlük beyin egzersizi hatırlatıcılarını masaüstünüzde alacaksınız.',
        });
      }
    }
  };

  const handleStartWorkout = () => {
    sounds.playClick();
    setShowToast(false);
    onNavigate('workout');
  };

  if (!user || !showToast || workoutCompleted) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 animate-fade-in text-black">
      <div className="neo-card p-5 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden bg-white border-[2.5px] border-black">
        
        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1 rounded-xl border border-black bg-white shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-amber-50 text-black transition-all"
          title="Kapat"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="flex items-start gap-4">
          {/* Animated Flame Icon */}
          <div className="p-3 rounded-2xl bg-[#ffd43b] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000] shrink-0 animate-bounce">
            <Flame className="w-6 h-6 stroke-[2.5] fill-amber-400" />
          </div>

          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-2">
              <span className="neo-badge bg-[#ffd43b] text-black text-[10px] py-0 px-2">
                GÜNLÜK ANTRENMAN
              </span>
              <span className="text-[11px] font-mono text-black font-black">
                {user.streakDays} Gün Seri
              </span>
            </div>

            <h3 className="text-base font-black text-black tracking-tight">
              Bugünün Beyin Egzersizi Bekliyor!
            </h3>

            <p className="text-xs font-bold text-neutral-600 leading-relaxed">
              Bilişsel BPI puanını yükseltmek ve serini korumak için 3 dakikalık günlük seansı tamamla.
            </p>

            {/* Notification Permission Prompt if default */}
            {notificationPermission === 'default' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="mt-1 text-[11px] text-black hover:underline font-mono font-bold flex items-center gap-1"
              >
                <Bell className="w-3 h-3 stroke-[2.5]" />
                <span>Masaüstü bildirimlerine izin ver</span>
              </button>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartWorkout}
                className="neo-btn bg-[#ff6b6b] hover:bg-[#fa5252] text-black text-xs px-4 py-2 shadow-[2.5px_2.5px_0px_0px_#000]"
              >
                <span>Hemen Başla</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="neo-btn bg-white hover:bg-amber-50 text-black text-xs px-3 py-2 shadow-[2px_2px_0px_0px_#000]"
              >
                Sonra
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
