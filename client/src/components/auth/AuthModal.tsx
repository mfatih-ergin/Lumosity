import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { sounds } from '../../services/soundEffects';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, setAuthModalOpen, login, register, guestLogin } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    sounds.playClick();

    try {
      if (mode === 'login') {
        await login(email || username, password);
        sounds.playVictory();
      } else {
        if (!username || !email || !password) {
          setError('Tüm alanları doldurmanız gerekmektedir.');
          setLoading(false);
          return;
        }
        await register(username, email, password);
        sounds.playVictory();
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'İşlem başarısız oldu. Lütfen tekrar deneyin.');
      sounds.playWrong();
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    sounds.playClick();
    try {
      await guestLogin();
      sounds.playVictory();
    } catch (err: any) {
      setError('Misafir girişi başarısız oldu.');
      sounds.playWrong();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-black">
      <div className="relative w-full max-w-md rounded-3xl bg-white border-[3px] border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_#000] overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            setAuthModalOpen(false);
          }}
          className="absolute top-4 right-4 p-1.5 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] hover:bg-amber-50 transition-transform active:scale-90"
        >
          <X className="w-5 h-5 text-black stroke-[2.5]" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ffd43b] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-3">
            <ShieldCheck className="w-7 h-7 text-black stroke-[2.5]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            {mode === 'login' ? 'Tekrar Hoş Geldiniz' : 'Bilişsel Yolculuğa Başla'}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-neutral-600 mt-1">
            {mode === 'login'
              ? 'Beyin performans skorlarınıza ve antrenmanlarınıza erişin'
              : 'Ücretsiz profilini oluştur, BPI indeksini ölç ve 1v1 düellolara katıl'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#ff6b6b] border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_0px_#000]">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black text-black uppercase font-mono mb-1.5">Kullanıcı Adı</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="NöronUstası"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-black bg-[#fffdf5] shadow-[2.5px_2.5px_0px_0px_#000] text-sm text-black font-bold focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-black uppercase font-mono mb-1.5">
              {mode === 'login' ? 'E-posta veya Kullanıcı Adı' : 'E-posta Adresi'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
              <input
                type={mode === 'login' ? 'text' : 'email'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'ornek@neuro.com veya Kullanıcı Adı' : 'ornek@neuro.com'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-black bg-[#fffdf5] shadow-[2.5px_2.5px_0px_0px_#000] text-sm text-black font-bold focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-black uppercase font-mono mb-1.5">Şifre</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-black bg-[#fffdf5] shadow-[2.5px_2.5px_0px_0px_#000] text-sm text-black font-bold focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl border-2 border-black bg-[#ff6b6b] hover:bg-[#fa5252] text-black font-black text-sm shadow-[4px_4px_0px_0px_#000] hover:shadow-[5px_5px_0px_0px_#000] flex items-center justify-center gap-2 transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
          >
            {loading ? 'Lütfen bekleyin...' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-black" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase font-mono font-black">
            <span className="bg-white px-2 text-black">veya</span>
          </div>
        </div>

        {/* Quick Guest Login */}
        <button
          onClick={handleGuestLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl border-2 border-black bg-[#fde047] hover:bg-amber-300 text-black text-xs font-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-2 transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px]"
        >
          <Sparkles className="w-4 h-4 stroke-[2.5]" />
          <span>Kayıtsız Hızlı Misafir Girişi Yap</span>
        </button>

        {/* Toggle Mode */}
        <div className="text-center mt-5 text-xs font-bold text-neutral-700">
          {mode === 'login' ? (
            <span>
              Hesabınız yok mu?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-black font-black underline underline-offset-2 ml-1"
              >
                Hemen Kaydolun
              </button>
            </span>
          ) : (
            <span>
              Zaten hesabınız var mı?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-black font-black underline underline-offset-2 ml-1"
              >
                Giriş Yapın
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
