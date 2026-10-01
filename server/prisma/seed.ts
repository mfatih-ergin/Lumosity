import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial games and test data...');

  // Create or update Games
  const games = [
    // MEMORY (5 Games)
    {
      id: 'spatial-matrix',
      title: 'Spatial Matrix',
      category: 'MEMORY',
      description: 'Göz açıp kapayıncaya kadar beliren kareleri aklında tut ve matris üzerinde hatırla.',
      instructions: '1. Izgara üzerinde beliren yeşil ışıklı hafıza karolarını dikkatle izle.\n2. Işıklar söndükten sonra aynı karolara tıklayarak deseni yeniden oluştur.\n3. İlerledikçe ızgara boyutu büyür ve şaşırtıcı animasyonlar devreye girer!',
      iconName: 'Grid',
      accentColor: '#06b6d4',
    },
    {
      id: 'digit-flash',
      title: 'Digit Flash',
      category: 'MEMORY',
      description: 'Kağıtta çok kısa süre gözüken 4 haneli sayıyı aklında tut ve kutucuklara doğru gir.',
      instructions: '1. Kağıt notunun üzerinde saniyenin altında beliren 4 haneli sayıyı pür dikkat izle.\n2. Sayı kaybolduktan sonra kutucuklara sayıyı klavye veya tuş takımıyla girip Onayla/Enter tuşuna bas.\n3. İlerledikçe gösterim süresi kısalır ve ikonik hafıza sınırların zorlanır!',
      iconName: 'FileText',
      accentColor: '#f59e0b',
    },
    {
      id: 'cup-stack',
      title: 'Cup Stack',
      category: 'MEMORY',
      description: 'Karttaki renkli bardakların aşağıdan yukarıya dizilimini aklında tut ve kuleyi oluştur.',
      instructions: '1. Ekrana gelen karttaki renkli bardakların aşağıdan yukarıya sıralamasını 2-3 saniye içinde aklında tut.\n2. Kart yukarı kaybolduktan sonra 10 saniyen başlar; aşağıdaki bardaklara tıklayarak kuleyi en alttan başlayarak üst üste diz.\n3. Doğru sıralamayı hızlıca tamamlayıp komboları topla!',
      iconName: 'Layers',
      accentColor: '#ec4899',
    },
    {
      id: 'memory-match',
      title: 'Memory Match',
      category: 'MEMORY',
      description: 'Kapalı kartları çevirerek eşleşen sembol çiftlerini bul ve çalışma belleğini güçlendir.',
      instructions: '1. Kapalı duran kartlara tıklayarak ön yüzlerini aç.\n2. Aynı sembole sahip iki kartı arka arkaya bularak eşleştir.\n3. Yanlış açılan kartların yerini zihninde tut ve masayı en az hamleyle temizle!',
      iconName: 'Layers',
      accentColor: '#10b981',
    },
    {
      id: 'pinball-recall',
      title: 'Pinball Recall',
      category: 'MEMORY',
      description: 'Labirentte seken topun çarptığı tamponları ve engelleri sırasıyla aklında canlandır.',
      instructions: '1. Labirentte fırlatılan pinball topunun çarpma sırasını pür dikkat takip et.\n2. Top durduktan sonra temas ettiği engelleri aynı kronolojik sırayla işaretle.\n3. Uzamsal hafıza ve hareket izleme kapasiteni zirveye çıkar!',
      iconName: 'Target',
      accentColor: '#8b5cf6',
    },

    // ATTENTION (4 Games)
    {
      id: 'lost-in-flight',
      title: 'Lost in Flight',
      category: 'ATTENTION',
      description: 'Çevreleyen yanıltıcı kuşlara aldırmadan, merkezdeki lider kuşun uçuş yönünü belirle.',
      instructions: '1. Sürünün tam ortasındaki ana kuşa odaklan.\n2. Ok tuşları veya yön butonları ile o kuşun baktığı yönü olabildiğince hızlı seç.\n3. Dikkat dağıtıcı çevre kuşlarına ve ani rüzgar yön değişikliklerine kanma!',
      iconName: 'Navigation',
      accentColor: '#8b5cf6',
    },
    {
      id: 'star-search',
      title: 'Star Search',
      category: 'ATTENTION',
      description: 'Ekrana saçılmış semboller arasında eşi veya çifti olmayan tek benzersiz hedefi yakala.',
      instructions: '1. Izgara üzerindeki tüm sembolleri hızlıca tara.\n2. Biri hariç tüm sembollerin en az bir çifti vardır; yalnız olan tek sembolü bul.\n3. Görsel karmaşa içinden hedefi şimşek hızında ayrıştırıp tıkla!',
      iconName: 'Sparkles',
      accentColor: '#ffd43b',
    },
    {
      id: 'eagle-eye',
      title: 'Eagle Eye',
      category: 'ATTENTION',
      description: 'Merkezdeki hedefe odaklanırken periferal görüş alanında anlık beliren kuşu tespit et.',
      instructions: '1. Gözlerini ekranın merkezindeki ana sembole sabitle.\n2. Yanıp sönen çevresel nesnenin konumunu göz ucuyla algıla.\n3. Merkezdeki nesneyi ve çevredeki konumu aynı anda hatırla!',
      iconName: 'Eye',
      accentColor: '#06b6d4',
    },
    {
      id: 'color-match',
      title: 'Color Match',
      category: 'ATTENTION',
      description: 'Üstteki kelimenin anlamı ile alttaki kelimenin renginin eşleşip eşleşmediğini doğrula.',
      instructions: '1. İki farklı kelime kartını aynı anda incele.\n2. Üstteki kelimenin ne anlama geldiğini ve alttaki kelimenin yazı rengini kontrol et.\n3. Eşleşiyorsa EVET, uyuşmuyorsa HAYIR seçeneğini işaretle!',
      iconName: 'CheckCircle',
      accentColor: '#f43f5e',
    },

    // SPEED (4 Games)
    {
      id: 'stroop-rush',
      title: 'Stroop Rush',
      category: 'SPEED',
      description: 'Renk ve kelime çatışmasında beyninin filtreleme hızını test et (Stroop Etkisi).',
      instructions: '1. Yukarıda beliren kelimenin RENGİ ile aşağıdaki kelimenin ANLAMINI karşılaştır.\n2. Renk ve anlam eşleşiyorsa "DOĞRU", uyuşmuyorsa "YANLIŞ" butonuna bas.\n3. Hızlı ve hatasız ardışık seriler yaparak kombo çarpanını katla!',
      iconName: 'Zap',
      accentColor: '#ec4899',
    },
    {
      id: 'speed-match',
      title: 'Speed Match',
      category: 'SPEED',
      description: 'Mevcut sembolü hemen bir önceki sembolle karşılaştır; aynı mı farklı mı?',
      instructions: '1. İlk kartı hafızana alarak oyunu başlat.\n2. Sonraki her kartta: "Bu kart az önce gördüğüm kart ile AYNI MI?" sorusuna yanıt ver.\n3. Sol Ok (AYNI) veya Sağ Ok (FARKLI) ile komboları topla!',
      iconName: 'Zap',
      accentColor: '#ff6b6b',
    },
    {
      id: 'spatial-speed',
      title: 'Spatial Speed',
      category: 'SPEED',
      description: 'Ekranda rastgele konumlarda anlık beliren yön oklarına milisaniyeler içinde karşılık ver.',
      instructions: '1. Ekranda çok kısa süre beliren okun yönünü anında algıla.\n2. Eşleşen yön tuşuna göz kırpma hızında bas.\n3. Tepki süreni 300 ms altına indirmeye çalış!',
      iconName: 'Compass',
      accentColor: '#38bdf8',
    },
    {
      id: 'penguin-pursuit',
      title: 'Penguin Pursuit',
      category: 'SPEED',
      description: 'Buzul labirentinde hızla kayan pengueni yönlendir, engelleri aş ve balıkları topla.',
      instructions: '1. Labirentte hızla hareket eden penguenin rotasını çiz.\n2. Buz blokları ve çatlaklara çarpmadan hızlı reflekslerle yön değiştir.\n3. Zaman dolmadan en yüksek skora ulaş!',
      iconName: 'Navigation',
      accentColor: '#0ea5e9',
    },

    // FLEXIBILITY (3 Games)
    {
      id: 'rule-switch',
      title: 'Cognitive Switch',
      category: 'FLEXIBILITY',
      description: 'Sayı kuralı ile harf kuralı arasında anlık geçiş yaparak zihinsel esnekliğini katla.',
      instructions: '1. Kart Üst Bölmede ise SAYI kuralına odaklan: Tek mi Çift mi?\n2. Kart Alt Bölmede ise HARF kuralına odaklan: Sesli mi Sessiz mi?\n3. Sürekli değişen kurallara hızla adapte ol!',
      iconName: 'Shuffle',
      accentColor: '#a855f7',
    },
    {
      id: 'shape-shift',
      title: 'Shape Shift',
      category: 'FLEXIBILITY',
      description: 'Renk kuralından şekil kuralına geçerken zihinsel direnci kır ve yeni kurala uyum sağla.',
      instructions: '1. Ekranın tepesinde beliren aktif kuralı izle (RENK veya ŞEKİL).\n2. Kural değiştikçe eski alışkanlığını anında sıfırla ve yeni eşleşmeyi seç.\n3. Bilişsel engelleme ve esneklik performansını test et!',
      iconName: 'Sparkles',
      accentColor: '#f59e0b',
    },
    {
      id: 'disillusion',
      title: 'Disillusion',
      category: 'FLEXIBILITY',
      description: 'Dinamik değişen sembol kartlarında yanıltıcı ipuçlarını filtreleyerek doğru deseni bul.',
      instructions: '1. Kartların rengi ve desen çizgileri arasındaki ilişkiyi çöz.\n2. Kural "Renk Uyumu"ndan "Şekil Uyumu"na döndüğünde hızla strateji değiştir.\n3. Dikkatini ve zihinsel çevikliğini göster!',
      iconName: 'Layers',
      accentColor: '#10b981',
    },

    // LOGIC (5 Games)
    {
      id: 'rail-master',
      title: 'Rail Master',
      category: 'LOGIC',
      description: 'Ray makaslarını anlık olarak değiştirerek trenleri kendi renklerindeki istasyonlara güvenle ulaştır.',
      instructions: '1. Tünellerden çıkan renkli trenlerin rotasını takip et.\n2. Ray makaslarına tıklayarak yönlerini değiştir.\n3. Trenleri çarpıştırmadan ve yanlış istasyona sokmadan rotayı kusursuz tamamla!',
      iconName: 'Compass',
      accentColor: '#10b981',
    },
    {
      id: 'flash-math',
      title: 'Flash Math',
      category: 'LOGIC',
      description: 'Anlık parlayan matematik işlemini (örn: 76 - 23) zihninde hesapla ve sonucunu hemen yaz.',
      instructions: '1. Ekranda saniyenin altında beliren matematik işlemini (toplama, çıkarma, çarpma) pür dikkat oku.\n2. İşlem kaybolduktan sonra hesapladığın sonucu tuşlayıp Enter/Onayla tuşuna bas.\n3. İlerledikçe işlemler hızlanır ve zihinsel aritmetik gücün gelişir!',
      iconName: 'Calculator',
      accentColor: '#38bdf8',
    },
    {
      id: 'number-compare',
      title: 'Number Compare',
      category: 'LOGIC',
      description: 'İki taraftaki ifadeyi veya sayıları kıyasla; hedef kurala göre daha büyük veya daha küçük olanı şimşek hızında seç!',
      instructions: '1. Sol ve Sağ taraftaki sayı veya matematiksel ifadeleri hızlıca hesapla ve kıyasla.\n2. Ekranda belirtilen hedef uyarısına dikkat et: DAHA BÜYÜK OLANI SEÇ ya da DAHA KÜÇÜK OLANI SEÇ!\n3. Ok tuşları (← / →) veya tıklayarak doğru kartı seç ve komboları topla!',
      iconName: 'Scale',
      accentColor: '#f43f5e',
    },
    {
      id: 'matrix-reasoning',
      title: 'Matrix Reasoning',
      category: 'LOGIC',
      description: 'Mantıksal matris ızgarasındaki eksik parçayı örüntü kuralına göre doğru tamamla.',
      instructions: '1. 3x3 matristeki şekillerin yatay ve dikey değişim kurallarını keşfet.\n2. Soru işaretli boş alana gelmesi gereken şekli mantık yürüterek belirle.\n3. Soyut akıl yürütme ve problem çözme gücünü geliştir!',
      iconName: 'Grid',
      accentColor: '#6366f1',
    },
    {
      id: 'pet-detective',
      title: 'Pet Detective',
      category: 'LOGIC',
      description: 'Şehir planında kayıp evcil hayvanları en kısa ve en mantıklı rotayı çizerek güvenle topla.',
      instructions: '1. Sokak ızgarasındaki evcil hayvanların konumlarını incele.\n2. Minimum hamle ile tüm hedeflere ulaşacak en optimize rotayı hesapla.\n3. İleriye dönük planlama ve uzamsal optimizasyon yeteneğini geliştir!',
      iconName: 'Target',
      accentColor: '#f97316',
    },

    // LANGUAGE (3 Games)
    {
      id: 'word-bubbles',
      title: 'Word Bubbles',
      category: 'LANGUAGE',
      description: 'Verilen kök ve hecelerle başlayan anlamlı Türkçe kelimeleri süresi dolmadan oluştur.',
      instructions: '1. Ekranın ortasında beliren kök heceye (örn: BİL...) dikkatle bak.\n2. Baloncuklar içindeki ekleri tarayarak anlamlı sözcüğü doğru tamamla.\n3. Sözel akıcılığını ve kelime dağarcığını zenginleştir!',
      iconName: 'BookOpen',
      accentColor: '#51cf66',
    },
    {
      id: 'vocabulary-voyage',
      title: 'Vocabulary Voyage',
      category: 'LANGUAGE',
      description: 'Eş anlamlı, zıt anlamlı ve bağlamsal kelimeleri hızlıca eşleştirerek sözel zekanı konuştur.',
      instructions: '1. Hedef kelimenin anlamını zihninde canlandır.\n2. Seçenekler arasından doğru eş anlamlı veya zıt anlamlı karşılığı seç.\n3. Hızlı sözel çağrışım ve anlamsal bellek kapasiteni artır!',
      iconName: 'BookOpen',
      accentColor: '#10b981',
    },
    {
      id: 'syllable-rush',
      title: 'Syllable Rush',
      category: 'LANGUAGE',
      description: 'Karışık verilen heceleri doğru sıraya dizerek bilişsel sözcükleri zamana karşı tamamla.',
      instructions: '1. Dağınık duran heceleri hızla oku.\n2. Mantıklı ve doğru kelimeyi oluşturacak sırayla hecelere tıkla.\n3. Dil işleme hızını ve fonolojik farkındalığını zirveye taşı!',
      iconName: 'BookOpen',
      accentColor: '#06b6d4',
    },
  ];

  for (const game of games) {
    await prisma.game.upsert({
      where: { id: game.id },
      update: game,
      create: game,
    });
  }

  // Seed Achievements
  const achievements = [
    {
      id: 'first-step',
      title: 'İlk Adım',
      description: 'Platformda ilk beyin egzersizini başarıyla tamamla.',
      badgeIcon: 'Sparkles',
      category: 'GAMES',
      requiredValue: 1,
      xpReward: 50,
    },
    {
      id: 'streak-3',
      title: 'Alışkanlık Başlangıcı',
      description: '3 gün üst üste günlük beyin antrenmanını tamamla.',
      badgeIcon: 'Flame',
      category: 'STREAK',
      requiredValue: 3,
      xpReward: 100,
    },
    {
      id: 'streak-7',
      title: 'Haftalık Şampiyon',
      description: '7 günlük kesintisiz antrenman serisine ulaş.',
      badgeIcon: 'Flame',
      category: 'STREAK',
      requiredValue: 7,
      xpReward: 250,
    },
    {
      id: 'bpi-800',
      title: 'Bilişsel Usta',
      description: 'Genel BPI puanını 800 seviyesinin üzerine çıkar.',
      badgeIcon: 'Brain',
      category: 'BPI',
      requiredValue: 800,
      xpReward: 200,
    },
    {
      id: 'speed-demon',
      title: 'Şimşek Refleks',
      description: 'Ortalama reaksiyon süresini 350 milisaniyenin altına indir.',
      badgeIcon: 'Zap',
      category: 'GAMES',
      requiredValue: 350,
      xpReward: 150,
    },
    {
      id: 'duel-winner',
      title: 'Arena Gladyatörü',
      description: 'Canlı 1v1 düellolarda ilk zaferini kazan.',
      badgeIcon: 'Swords',
      category: 'DUEL',
      requiredValue: 1,
      xpReward: 150,
    },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { id: ach.id },
      update: ach,
      create: ach,
    });
  }

  // Create demo user
  const passwordHash = await bcrypt.hash('neuro123', 10);
  const demoUser = await prisma.user.upsert({
    where: { username: 'NeuroChampion' },
    update: {},
    create: {
      username: 'NeuroChampion',
      email: 'champ@neurocraft.dev',
      passwordHash,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeuroChampion',
      overallBpi: 840,
      memoryBpi: 890,
      attentionBpi: 820,
      speedBpi: 860,
      flexBpi: 790,
      logicBpi: 840,
      streakDays: 7,
    },
  });

  // Create initial duel stats for demo user
  await prisma.userDuelStats.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      eloRating: 1350,
      totalWins: 12,
      totalLosses: 3,
      totalTies: 1,
      currentWinStreak: 4,
      bestWinStreak: 6,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
