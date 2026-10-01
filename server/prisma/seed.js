"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding initial games and test data...');
    // Create or update Games
    const games = [
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
            id: 'lost-in-flight',
            title: 'Lost in Flight',
            category: 'ATTENTION',
            description: 'Çevreleyen yanıltıcı kuşlara aldırmadan, merkezdeki lider kuşun uçuş yönünü belirle.',
            instructions: '1. Sürünün tam ortasındaki ana kuşa odaklan.\n2. Ok tuşları veya yön butonları ile o kuşun baktığı yönü olabildiğince hızlı seç.\n3. Dikkat dağıtıcı çevre kuşlarına ve ani rüzgar yön değişikliklerine kanma!',
            iconName: 'Navigation',
            accentColor: '#8b5cf6',
        },
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
            id: 'rail-master',
            title: 'Rail Master',
            category: 'LOGIC',
            description: 'Ray makaslarını anlık olarak değiştirerek trenleri kendi renklerindeki istasyonlara güvenle ulaştır.',
            instructions: '1. Tünellerden çıkan renkli trenlerin rotasını takip et.\n2. Ray makaslarına tıklayarak yönlerini değiştir.\n3. Trenleri çarpıştırmadan ve yanlış istasyona sokmadan rotayı kusursuz tamamla!',
            iconName: 'Compass',
            accentColor: '#10b981',
        },
    ];
    for (const game of games) {
        await prisma.game.upsert({
            where: { id: game.id },
            update: game,
            create: game,
        });
    }
    // Create demo user
    const passwordHash = await bcryptjs_1.default.hash('neuro123', 10);
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
