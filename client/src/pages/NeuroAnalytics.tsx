import React, { useState, useEffect } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { 
  Brain, 
  Target, 
  Zap, 
  BarChart2, 
  Compass, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  Flame,
  Award,
  Users
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { analyticsApi } from '../services/api';

export const NeuroAnalytics: React.FC = () => {
  const { user, setAuthModalOpen } = useAuthStore();
  const [stats, setStats] = useState({
    avgAccuracy: 0,
    avgReaction: 0,
    totalSessions: 0,
    history: [] as any[],
  });
  const [selectedAgeBracket, setSelectedAgeBracket] = useState<string>('25-34');
  const [loading, setLoading] = useState(true);

  const calculateAge = (birthYear?: number | null) => {
    if (!birthYear) return 26;
    return new Date().getFullYear() - birthYear || 26;
  };

  const calculatedAge = calculateAge(user?.profile?.birthYear);

  const getDefaultBracket = (age: number) => {
    if (age <= 24) return '18-24';
    if (age <= 34) return '25-34';
    if (age <= 44) return '35-44';
    if (age <= 54) return '45-54';
    return '55+';
  };

  useEffect(() => {
    if (user?.profile?.birthYear) {
      setSelectedAgeBracket(getDefaultBracket(calculatedAge));
    }
  }, [user?.profile?.birthYear, calculatedAge]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await analyticsApi.getBpiStats();
        setStats({
          avgAccuracy: data.stats?.avgAccuracy || 0,
          avgReaction: data.stats?.avgReaction || 0,
          totalSessions: data.stats?.totalSessions || 0,
          history: data.timelineData || [],
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in text-black">
        <div className="w-16 h-16 rounded-2xl bg-[#ffd43b] border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center mx-auto text-black">
          <Brain className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight">Bilişsel Analiz Raporu</h2>
        <p className="text-sm font-bold text-neutral-700">
          Kişiselleştirilmiş BPI radar grafiğinizi, reaksiyon süresi gelişimini ve bilişsel profilinizi görüntülemek için giriş yapın.
        </p>
        <button
          onClick={() => setAuthModalOpen(true, 'login')}
          className="neo-btn bg-[#ff6b6b] text-black px-8 py-3.5 shadow-[4px_4px_0px_0px_#000] text-sm hover:bg-[#fa5252]"
        >
          Giriş Yap veya Kaydol
        </button>
      </div>
    );
  }

  const radarData = [
    { domain: 'Hafıza', bpi: user.memoryBpi, fullMark: 1500 },
    { domain: 'Dikkat & Odak', bpi: user.attentionBpi, fullMark: 1500 },
    { domain: 'İşlem Hızı', bpi: user.speedBpi, fullMark: 1500 },
    { domain: 'Mantık', bpi: user.logicBpi, fullMark: 1500 },
    { domain: 'Esneklik', bpi: user.flexBpi, fullMark: 1500 },
  ];

  const timelineData = stats.history.map((h: any, idx: number) => ({
    date: h.date || (h.playedAt ? new Date(h.playedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : `Oturum ${idx + 1}`),
    score: h.score || h.bpiEarned || 0,
    session: idx + 1,
  }));

  const activeTheme = (typeof window !== 'undefined' && localStorage.getItem('neuro_theme')) || user?.settings?.theme || 'LIGHT_WHITE';
  const isDark = activeTheme === 'DARK' || activeTheme === 'DARK_BLACK';
  const chartStroke = isDark ? '#ffffff' : '#000000';
  const chartTextFill = isDark ? '#ffffff' : '#000000';
  const gridStroke = isDark ? '#555555' : '#000000';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-black">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="neo-badge bg-[#ffd43b] text-black mb-2">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>KAPSAMLI BİLİŞSEL GELİŞİM RAPORU</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
            NeuroIndex Analizi
          </h1>
          <p className="text-xs sm:text-sm font-bold text-neutral-600 mt-1">
            5 ana bilişsel alan üzerindeki performans eğrileriniz ve reaksiyon hızınız.
          </p>
        </div>

        {/* Global BPI Summary Pill */}
        <div className="p-4 rounded-2xl bg-[#fde047] border-[2.5px] border-black flex items-center gap-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="w-12 h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
            <Zap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[10px] text-neutral-800 uppercase font-mono font-black">Genel BPI İndeksi</div>
            <div className="text-2xl sm:text-3xl font-black text-black font-mono">
              {user.overallBpi} <span className="text-xs text-neutral-700 font-bold">/ 1500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="neo-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#4ecdc4] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center text-black">
            <Target className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs text-neutral-600 font-mono font-bold">Ortalama Doğruluk</div>
            <div className="text-xl sm:text-2xl font-black text-black font-mono">{stats.avgAccuracy}%</div>
          </div>
        </div>

        <div className="neo-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#a78bfa] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center text-black">
            <Clock className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs text-neutral-600 font-mono font-bold">Ortalama Reaksiyon Süresi</div>
            <div className="text-xl sm:text-2xl font-black text-black font-mono">{stats.avgReaction}ms</div>
          </div>
        </div>

        <div className="neo-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#ffbe76] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center text-black">
            <Flame className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs text-neutral-600 font-mono font-bold">Tamamlanan Antrenman</div>
            <div className="text-xl sm:text-2xl font-black text-black font-mono">{stats.totalSessions} Seans</div>
          </div>
        </div>
      </div>

      {/* Charts Section: 5-Axis Radar & Performance Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Radar Chart */}
        <div className="neo-card p-6 flex flex-col items-center shadow-[5px_5px_0px_0px_#000]">
          <div className="w-full flex items-center justify-between mb-4 border-b-2 border-black pb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-black stroke-[2.5]" />
              <h3 className="text-base sm:text-lg font-black text-black">5 Bilişsel Alan Radar Dağılımı</h3>
            </div>
            <span className="neo-badge bg-[#4ecdc4] text-black">
              BPI Profili
            </span>
          </div>

          <div className="w-full h-72 sm:h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke={gridStroke} strokeWidth={1.5} />
                <PolarAngleAxis dataKey="domain" stroke={chartStroke} tick={{ fill: chartTextFill, fontSize: 12, fontWeight: 900 }} />
                <PolarRadiusAxis domain={[0, 1500]} tick={false} stroke="none" />
                <Radar
                  name="Bilişsel Puan"
                  dataKey="bpi"
                  stroke={chartStroke}
                  strokeWidth={2.5}
                  fill="#fde047"
                  fillOpacity={0.75}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="neo-card p-6 flex flex-col justify-between shadow-[5px_5px_0px_0px_#000]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-black stroke-[2.5]" />
                <h3 className="text-base sm:text-lg font-black text-black">BPI Gelişim ve Skor Trendi</h3>
              </div>
              <span className="neo-badge bg-[#a78bfa] text-black">
                Kronolojik
              </span>
            </div>
            <p className="text-xs font-bold text-neutral-600 mb-4">
              Oynadığınız son seanslardaki puan ve hız gelişim eğriniz.
            </p>
          </div>

          <div className="w-full h-64 sm:h-72">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ecdc4" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444444' : '#cbd5e1'} />
                  <XAxis dataKey="date" stroke={chartStroke} tick={{ fill: chartTextFill, fontSize: 10, fontWeight: 700 }} />
                  <YAxis stroke={chartStroke} tick={{ fill: chartTextFill, fontSize: 10, fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                      borderColor: isDark ? '#444444' : '#000000',
                      borderWidth: '2px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: isDark ? '#ffffff' : '#000000',
                      boxShadow: '3px 3px 0px #000'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={chartStroke}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#scoreGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 text-xs font-bold">
                <Brain className="w-8 h-8 mb-2 opacity-50 stroke-[2]" />
                <span>Henüz tamamlanmış seans kaydı bulunmuyor.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Yaş Grubu Kıyaslaması ve Akran Normları */}
      {(() => {
        const ageNormsData: Record<string, { label: string; avgOverall: number; domains: { key: string; name: string; userVal: number; normVal: number; icon: any; color: string }[] }> = {
          '18-24': {
            label: '18 - 24 Yaş (Genç Erişkin Grubu)',
            avgOverall: 720,
            domains: [
              { key: 'memory', name: 'Hafıza', userVal: user.memoryBpi, normVal: 710, icon: Brain, color: 'bg-[#4ecdc4]' },
              { key: 'attention', name: 'Dikkat & Odak', userVal: user.attentionBpi, normVal: 740, icon: Target, color: 'bg-[#a78bfa]' },
              { key: 'speed', name: 'İşlem Hızı', userVal: user.speedBpi, normVal: 760, icon: Zap, color: 'bg-[#ff6b6b]' },
              { key: 'logic', name: 'Mantık & Muhakeme', userVal: user.logicBpi, normVal: 730, icon: BarChart2, color: 'bg-[#fde047]' },
              { key: 'flex', name: 'Bilişsel Esneklik', userVal: user.flexBpi, normVal: 700, icon: Compass, color: 'bg-[#ffbe76]' },
            ],
          },
          '25-34': {
            label: '25 - 34 Yaş (Kariyer & Zirve Performans)',
            avgOverall: 740,
            domains: [
              { key: 'memory', name: 'Hafıza', userVal: user.memoryBpi, normVal: 730, icon: Brain, color: 'bg-[#4ecdc4]' },
              { key: 'attention', name: 'Dikkat & Odak', userVal: user.attentionBpi, normVal: 750, icon: Target, color: 'bg-[#a78bfa]' },
              { key: 'speed', name: 'İşlem Hızı', userVal: user.speedBpi, normVal: 770, icon: Zap, color: 'bg-[#ff6b6b]' },
              { key: 'logic', name: 'Mantık & Muhakeme', userVal: user.logicBpi, normVal: 760, icon: BarChart2, color: 'bg-[#fde047]' },
              { key: 'flex', name: 'Bilişsel Esneklik', userVal: user.flexBpi, normVal: 720, icon: Compass, color: 'bg-[#ffbe76]' },
            ],
          },
          '35-44': {
            label: '35 - 44 Yaş (Olgun Bilişsel Denge)',
            avgOverall: 710,
            domains: [
              { key: 'memory', name: 'Hafıza', userVal: user.memoryBpi, normVal: 720, icon: Brain, color: 'bg-[#4ecdc4]' },
              { key: 'attention', name: 'Dikkat & Odak', userVal: user.attentionBpi, normVal: 730, icon: Target, color: 'bg-[#a78bfa]' },
              { key: 'speed', name: 'İşlem Hızı', userVal: user.speedBpi, normVal: 710, icon: Zap, color: 'bg-[#ff6b6b]' },
              { key: 'logic', name: 'Mantık & Muhakeme', userVal: user.logicBpi, normVal: 750, icon: BarChart2, color: 'bg-[#fde047]' },
              { key: 'flex', name: 'Bilişsel Esneklik', userVal: user.flexBpi, normVal: 710, icon: Compass, color: 'bg-[#ffbe76]' },
            ],
          },
          '45-54': {
            label: '45 - 54 Yaş (Kıdemli Deneyim Grubu)',
            avgOverall: 680,
            domains: [
              { key: 'memory', name: 'Hafıza', userVal: user.memoryBpi, normVal: 690, icon: Brain, color: 'bg-[#4ecdc4]' },
              { key: 'attention', name: 'Dikkat & Odak', userVal: user.attentionBpi, normVal: 710, icon: Target, color: 'bg-[#a78bfa]' },
              { key: 'speed', name: 'İşlem Hızı', userVal: user.speedBpi, normVal: 670, icon: Zap, color: 'bg-[#ff6b6b]' },
              { key: 'logic', name: 'Mantık & Muhakeme', userVal: user.logicBpi, normVal: 720, icon: BarChart2, color: 'bg-[#fde047]' },
              { key: 'flex', name: 'Bilişsel Esneklik', userVal: user.flexBpi, normVal: 680, icon: Compass, color: 'bg-[#ffbe76]' },
            ],
          },
          '55+': {
            label: '55+ Yaş (Zihinsel Bilgelik & Koruma)',
            avgOverall: 650,
            domains: [
              { key: 'memory', name: 'Hafıza', userVal: user.memoryBpi, normVal: 660, icon: Brain, color: 'bg-[#4ecdc4]' },
              { key: 'attention', name: 'Dikkat & Odak', userVal: user.attentionBpi, normVal: 680, icon: Target, color: 'bg-[#a78bfa]' },
              { key: 'speed', name: 'İşlem Hızı', userVal: user.speedBpi, normVal: 630, icon: Zap, color: 'bg-[#ff6b6b]' },
              { key: 'logic', name: 'Mantık & Muhakeme', userVal: user.logicBpi, normVal: 700, icon: BarChart2, color: 'bg-[#fde047]' },
              { key: 'flex', name: 'Bilişsel Esneklik', userVal: user.flexBpi, normVal: 650, icon: Compass, color: 'bg-[#ffbe76]' },
            ],
          },
        };

        const activeNorm = ageNormsData[selectedAgeBracket] || ageNormsData['25-34'];
        const overallDelta = user.overallBpi - activeNorm.avgOverall;
        const percentile = Math.min(99, Math.max(5, Math.round(50 + (overallDelta / 6))));

        return (
          <div className="neo-card p-6 sm:p-8 space-y-6 shadow-[6px_6px_0px_0px_#000]">
            {/* Title & Banner Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b-2 border-black pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-black stroke-[2.5]" />
                  <h2 className="text-2xl font-black text-black">Yaş Grubu BPI Kıyaslaması & Akran Normları</h2>
                </div>
                <p className="text-xs sm:text-sm font-bold text-neutral-600">
                  Performansınızı yaş grubunuzdaki antrenman yapan aktif sporcuların normları ile karşılaştırın.
                </p>
              </div>

              {/* Percentile Highlight Card */}
              <div className="w-full lg:w-auto p-4 rounded-2xl bg-[#ffd43b] border-2 border-black flex items-center justify-between lg:justify-end gap-4 shadow-[3px_3px_0px_0px_#000]">
                <div>
                  <div className="text-[10px] font-mono uppercase text-neutral-800 font-black">Akran Dilim Derecesi</div>
                  <div className="text-xl font-black text-black font-mono">
                    Top %{100 - percentile} <span className="text-xs text-neutral-700 font-bold">(Yüzdelik: %{percentile})</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                  <Award className="w-6 h-6 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Age Group Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-black text-black mr-2">Karşılaştırılan Yaş Grubu:</span>
              {Object.keys(ageNormsData).map((key) => {
                const isSelected = selectedAgeBracket === key;
                const isUserDefault = getDefaultBracket(calculatedAge) === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedAgeBracket(key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black font-mono transition-all flex items-center gap-1.5 border-2 border-black ${
                      isSelected
                        ? 'bg-[#fde047] text-black shadow-[3px_3px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
                        : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#fff9ea]'
                    }`}
                  >
                    <span>{key} Yaş</span>
                    {isUserDefault && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-black font-black bg-white text-black shadow-[1px_1px_0px_0px_#000]">
                        Sen
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Age Group Banner Notice */}
            <div className="p-4 rounded-2xl bg-[#fffdf5] border-2 border-black flex items-center justify-between flex-wrap gap-3 shadow-[2.5px_2.5px_0px_0px_#000]">
              <div>
                <h4 className="text-sm font-black text-black">{activeNorm.label}</h4>
                <p className="text-xs font-bold text-neutral-700">
                  Akran Ortalama BPI Skoru: <strong className="text-black font-mono">{activeNorm.avgOverall} BPI</strong> — Senin Skorun: <strong className="text-black font-mono bg-[#fde047] px-1 rounded border border-black">{user.overallBpi} BPI</strong>
                </p>
              </div>

              <div className={`neo-badge ${
                overallDelta >= 0
                  ? 'bg-[#4ecdc4] text-black'
                  : 'bg-[#ff6b6b] text-black'
              }`}>
                {overallDelta >= 0 ? `🚀 Akran Ortalamasının +${overallDelta} Puan Üstündesin!` : `⚠️ Akran Ortalamasının ${Math.abs(overallDelta)} Puan Altındasın`}
              </div>
            </div>

            {/* 5 Cognitive Domains Norm Comparison Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {activeNorm.domains.map((dom) => {
                const IconComp = dom.icon;
                const delta = dom.userVal - dom.normVal;
                const userPct = Math.min(100, Math.max(10, (dom.userVal / 1200) * 100));
                const normPct = Math.min(100, Math.max(10, (dom.normVal / 1200) * 100));

                return (
                  <div
                    key={dom.key}
                    className="p-4 rounded-2xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border-2 border-black ${dom.color} text-black shadow-[1.5px_1.5px_0px_0px_#000]`}>
                          <IconComp className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-black">{dom.name}</h4>
                          <div className="text-[11px] text-neutral-600 font-mono font-bold">
                            Sen: <span className="text-black font-black">{dom.userVal}</span> vs Akran: <span>{dom.normVal}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`neo-badge ${
                        delta >= 0
                          ? 'bg-[#4ecdc4] text-black'
                          : 'bg-[#ff6b6b] text-black'
                      }`}>
                        {delta >= 0 ? `+${delta}` : `${delta}`}
                      </span>
                    </div>

                    {/* Comparative Dual Bar */}
                    <div className="space-y-1">
                      <div className="relative w-full h-4 rounded-full border-2 border-black bg-white overflow-hidden p-0.5 shadow-[1.5px_1.5px_0px_0px_#000]">
                        {/* User Bar */}
                        <div
                          className={`h-full rounded-full border-r-2 border-black ${dom.color} transition-all duration-700`}
                          style={{ width: `${userPct}%` }}
                        />
                        {/* Age Norm Indicator Marker Line */}
                        <div
                          className="absolute top-0 bottom-0 w-1.5 bg-black z-10"
                          style={{ left: `${normPct}%` }}
                          title={`Akran Ortalaması: ${dom.normVal}`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-600 font-mono font-bold">
                        <span>0 BPI</span>
                        <span className="text-black flex items-center gap-1 font-bold">
                          <div className="w-2 h-2 rounded-full bg-black" />
                          <span>İbre: Akran Ortalaması ({dom.normVal})</span>
                        </span>
                        <span>1200 BPI</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        );
      })()}

    </div>
  );
};
