const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

console.log('🎮 RPG BOT v2.0 - LOADING...');

// Database files
const PLAYERS_FILE = './data/players.json';
const GUILDS_FILE = './data/guilds.json';
const MARKET_FILE = './data/market.json';
const ACHIEVEMENTS_FILE = './data/achievements.json';

// Inisialisasi database
let players = loadJSON(PLAYERS_FILE, {});
let guilds = loadJSON(GUILDS_FILE, {});
let market = loadJSON(MARKET_FILE, []);
let achievements = loadJSON(ACHIEVEMENTS_FILE, [
    { id: 1, name: "First Blood", desc: "Kill first monster", reward: { gold: 100, exp: 50 } },
    { id: 2, name: "Dragon Slayer", desc: "Defeat Dragon", reward: { gold: 500, item: "dragon_scale" } },
    { id: 3, name: "Rich Player", desc: "Collect 5000 gold", reward: { gold: 1000 } },
    { id: 4, name: "Social Butterfly", desc: "Join a guild", reward: { exp: 200 } },
    { id: 5, name: "Married Life", desc: "Get married", reward: { gold: 999, item: "wedding_ring" } }
]);

// Class definitions
const CLASSES = {
    warrior: { atk: 15, def: 10, hp: 120, mana: 50, skill: "Slash" },
    mage: { atk: 25, def: 5, hp: 80, mana: 150, skill: "Fireball" },
    archer: { atk: 20, def: 8, hp: 90, mana: 80, skill: "Multi-Shot" },
    assassin: { atk: 30, def: 5, hp: 70, mana: 60, skill: "Backstab" },
    tank: { atk: 10, def: 25, hp: 200, mana: 40, skill: "Shield Wall" },
    healer: { atk: 12, def: 8, hp: 100, mana: 200, skill: "Heal" },
    berserker: { atk: 35, def: 3, hp: 150, mana: 30, skill: "Rage" }
};

// Jobs/Professions
const JOBS = {
    blacksmith: { income: 50, items: ["sword", "armor"] },
    alchemist: { income: 40, items: ["potion", "elixir"] },
    fisherman: { income: 30, items: ["fish", "shrimp"] },
    miner: { income: 35, items: ["iron", "gold_ore"] },
    merchant: { income: 45, items: ["scroll", "gem"] }
};

// Helper functions
function loadJSON(file, defaultValue) {
    if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
}

function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getPlayer(userId) {
    if (!players[userId]) {
        players[userId] = {
            name: "Adventurer",
            level: 1,
            exp: 0,
            expNeeded: 100,
            hp: 100,
            maxHp: 100,
            atk: 10,
            def: 5,
            mana: 50,
            maxMana: 50,
            gold: 100,
            energy: 100,
            maxEnergy: 100,
            stamina: 100,
            maxStamina: 100,
            class: "novice",
            job: null,
            rank: "Bronze",
            inventory: {
                potion: 5,
                sword: 0,
                armor: 0,
                shield: 0,
                fish: 0,
                ore: 0,
                scroll: 0
            },
            equipment: {
                weapon: null,
                armor: null,
                accessory: null,
                pet: null
            },
            skills: [],
            pet: null,
            marriedTo: null,
            guild: null,
            guildRank: null,
            achievements: [],
            dailyQuests: [],
            lastDaily: 0,
            lastWork: 0,
            pvpWins: 0,
            pvpLosses: 0,
            created: Date.now()
        };
        saveJSON(PLAYERS_FILE, players);
    }
    return players[userId];
}

function checkAchievements(player, userId, type, value) {
    let newAchievements = [];
    
    achievements.forEach(ach => {
        if (!player.achievements.includes(ach.id)) {
            let completed = false;
            
            switch(ach.name) {
                case "First Blood":
                    completed = player.stats?.monstersKilled >= 1;
                    break;
                case "Dragon Slayer":
                    completed = player.stats?.bossesKilled >= 1;
                    break;
                case "Rich Player":
                    completed = player.gold >= 5000;
                    break;
                case "Social Butterfly":
                    completed = player.guild !== null;
                    break;
                case "Married Life":
                    completed = player.marriedTo !== null;
                    break;
            }
            
            if (completed) {
                player.achievements.push(ach.id);
                newAchievements.push(ach);
                
                // Give rewards
                if (ach.reward.gold) player.gold += ach.reward.gold;
                if (ach.reward.exp) player.exp += ach.reward.exp;
                if (ach.reward.item) player.inventory[ach.reward.item] = (player.inventory[ach.reward.item] || 0) + 1;
            }
        }
    });
    
    if (newAchievements.length > 0) {
        saveJSON(PLAYERS_FILE, players);
    }
    
    return newAchievements;
}

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

client.on('qr', (qr) => {
    console.log('\n📱 SCAN QR CODE:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ RPG BOT v2.0 READY!');
    console.log('Commands: !rpg help');
});

// MAIN MESSAGE HANDLER
client.on('message', async (message) => {
    const text = message.body.toLowerCase();
    const sender = message.from;
    const userId = sender.split('@')[0];
    
    if (text.startsWith('!rpg')) {
        const args = text.split(' ');
        const command = args[1] || 'help';
        const player = getPlayer(userId);
        
        try {
            switch(command) {
                // ========== CHARACTER SYSTEM ==========
                case 'class':
                    if (args[2] && CLASSES[args[2]]) {
                        if (player.level >= 10) {
                            player.class = args[2];
                            const cls = CLASSES[args[2]];
                            player.atk += cls.atk;
                            player.def += cls.def;
                            player.maxHp += cls.hp;
                            player.maxMana += cls.mana;
                            player.skills.push(cls.skill);
                            saveJSON(PLAYERS_FILE, players);
                            await message.reply(`✅ Class changed to ${args[2].toUpperCase()}!\nSkill: ${cls.skill}`);
                        } else {
                            await message.reply(`❌ Need level 10 to choose class!`);
                        }
                    } else {
                        let classList = "🎭 AVAILABLE CLASSES (Require Level 10):\n";
                        for (const [cls, stats] of Object.entries(CLASSES)) {
                            classList += `• ${cls.toUpperCase()} - ATK:${stats.atk} DEF:${stats.def} HP:${stats.hp}\n`;
                        }
                        await message.reply(classList);
                    }
                    break;
                    
                case 'job':
                    if (args[2] && JOBS[args[2]]) {
                        player.job = args[2];
                        saveJSON(PLAYERS_FILE, players);
                        await message.reply(`💼 Job set to ${args[2].toUpperCase()}!\nIncome: ${JOBS[args[2]].income} gold/hour`);
                    } else {
                        let jobList = "💼 AVAILABLE JOBS:\n";
                        for (const [job, info] of Object.entries(JOBS)) {
                            jobList += `• ${job.toUpperCase()} - ${info.income} gold/hour\n`;
                        }
                        await message.reply(jobList);
                    }
                    break;
                    
                case 'work':
                    if (!player.job) {
                        await message.reply(`❌ Set job first with !rpg job <jobname>`);
                        return;
                    }
                    
                    const now = Date.now();
                    const cooldown = 3600000; // 1 hour
                    
                    if (now - player.lastWork < cooldown) {
                        const remaining = Math.ceil((cooldown - (now - player.lastWork)) / 60000);
                        await message.reply(`⏳ Can work again in ${remaining} minutes`);
                        return;
                    }
                    
                    const job = JOBS[player.job];
                    const income = job.income + (player.level * 5);
                    player.gold += income;
                    player.lastWork = now;
                    
                    // Random item from job
                    const randomItem = job.items[Math.floor(Math.random() * job.items.length)];
                    player.inventory[randomItem] = (player.inventory[randomItem] || 0) + 1;
                    
                    saveJSON(PLAYERS_FILE, players);
                    await message.reply(`💼 Worked as ${player.job.toUpperCase()}!\n💰 +${income} Gold\n🎁 +1 ${randomItem}`);
                    break;
                    
                // ========== PvP SYSTEM ==========
                case 'duel':
                    if (!args[2]) {
                        await message.reply(`Usage: !rpg duel @mention_player`);
                        return;
                    }
                    
                    if (player.energy < 20) {
                        await message.reply(`⚡ Need 20 energy to duel!`);
                        return;
                    }
                    
                    // In real implementation, extract mentioned user
                    const targetId = "628xxx"; // Get from mention
                    const target = getPlayer(targetId);
                    
                    player.energy -= 20;
                    target.energy = Math.max(0, target.energy - 10);
                    
                    // Simple PvP calculation
                    const playerPower = player.atk + player.def + (player.level * 5);
                    const targetPower = target.atk + target.def + (target.level * 5);
                    const randomFactor = Math.random() * 0.4 + 0.8; // 0.8 - 1.2
                    
                    let winner, loser;
                    if (playerPower * randomFactor > targetPower) {
                        winner = player;
                        loser = target;
                        winner.pvpWins++;
                        loser.pvpLosses++;
                    } else {
                        winner = target;
                        loser = player;
                        winner.pvpWins++;
                        loser.pvpLosses++;
                    }
                    
                    const reward = Math.floor(loser.level * 10);
                    winner.gold += reward;
                    
                    saveJSON(PLAYERS_FILE, players);
                    await message.reply(`⚔️ DUEL RESULTS!\n🏆 Winner: ${winner === player ? "YOU" : "Opponent"}\n💰 Reward: ${reward} Gold\n❤️ Your HP: ${player.hp}/${player.maxHp}`);
                    break;
                    
                case 'pvp':
                    let pvpStats = `⚔️ PvP STATS\n\n`;
                    pvpStats += `Wins: ${player.pvpWins}\n`;
                    pvpStats += `Losses: ${player.pvpLosses}\n`;
                    pvpStats += `Win Rate: ${player.pvpWins + player.pvpLosses > 0 ? Math.round((player.pvpWins / (player.pvpWins + player.pvpLosses)) * 100) : 0}%\n\n`;
                    pvpStats += `🎖️ PvP Rank: ${player.pvpWins >= 100 ? "Gladiator" : player.pvpWins >= 50 ? "Champion" : player.pvpWins >= 20 ? "Fighter" : "Novice"}`;
                    await message.reply(pvpStats);
                    break;
                    
                // ========== GUILD SYSTEM ==========
                case 'guild':
                    const subcmd = args[2] || 'info';
                    
                    switch(subcmd) {
                        case 'create':
                            if (player.guild) {
                                await message.reply(`❌ You're already in a guild!`);
                                return;
                            }
                            
                            if (player.gold < 1000) {
                                await message.reply(`❌ Need 1000 gold to create guild!`);
                                return;
                            }
                            
                            const guildName = args.slice(3).join(' ');
                            if (!guildName) {
                                await message.reply(`Usage: !rpg guild create <name>`);
                                return;
                            }
                            
                            const guildId = `guild_${Date.now()}`;
                            guilds[guildId] = {
                                name: guildName,
                                level: 1,
                                exp: 0,
                                members: [userId],
                                leader: userId,
                                treasury: 0,
                                created: Date.now()
                            };
                            
                            player.guild = guildId;
                            player.guildRank = "Leader";
                            player.gold -= 1000;
                            guilds[guildId].treasury += 1000;
                            
                            saveJSON(GUILDS_FILE, guilds);
                            saveJSON(PLAYERS_FILE, players);
                            
                            await message.reply(`🏰 Guild "${guildName}" created!\n💰 1000 gold used as treasury`);
                            break;
                            
                        case 'join':
                            // Implementation for joining guild
                            await message.reply(`🔍 Use !rpg guild list to see available guilds`);
                            break;
                            
                        case 'info':
                            if (!player.guild) {
                                await message.reply(`❌ You're not in a guild!\nCreate: !rpg guild create <name>`);
                                return;
                            }
                            
                            const guild = guilds[player.guild];
                            let guildInfo = `🏰 GUILD: ${guild.name}\n`;
                            guildInfo += `⭐ Level: ${guild.level}\n`;
                            guildInfo += `👥 Members: ${guild.members.length}/50\n`;
                            guildInfo += `💰 Treasury: ${guild.treasury} Gold\n`;
                            guildInfo += `👑 Leader: ${guild.leader === userId ? "YOU" : "Another player"}\n`;
                            guildInfo += `🎖️ Your Rank: ${player.guildRank}`;
                            
                            await message.reply(guildInfo);
                            break;
                            
                        case 'list':
                            let guildList = `🏰 AVAILABLE GUILDS\n\n`;
                            let count = 0;
                            for (const [id, g] of Object.entries(guilds)) {
                                if (g.members.length < 50) {
                                    guildList += `• ${g.name} (Lv.${g.level}) - ${g.members.length}/50 members\n`;
                                    count++;
                                    if (count >= 10) break;
                                }
                            }
                            
                            if (count === 0) guildList += `No guilds available. Create one with !rpg guild create`;
                            await message.reply(guildList);
                            break;
                    }
                    break;
                    
                // ========== MINIGAMES ==========
                case 'fish':
                    if (player.energy < 15) {
                        await message.reply(`⚡ Need 15 energy to fish!`);
                        return;
                    }
                    
                    player.energy -= 15;
                    const fishRarity = Math.random();
                    
                    let fishResult = `🎣 FISHING MINIGAME\n\n`;
                    
                    if (fishRarity < 0.01) { // 1% legendary
                        fishResult += `🎉 LEGENDARY CATCH! Golden Fish!\n`;
                        player.inventory.golden_fish = (player.inventory.golden_fish || 0) + 1;
                        player.gold += 500;
                    } else if (fishRarity < 0.1) { // 9% rare
                        fishResult += `🌟 RARE CATCH! Red Snapper!\n`;
                        player.inventory.red_snapper = (player.inventory.red_snapper || 0) + 1;
                        player.gold += 100;
                    } else if (fishRarity < 0.4) { // 30% uncommon
                        fishResult += `👍 Good catch! Salmon!\n`;
                        player.inventory.salmon = (player.inventory.salmon || 0) + 1;
                        player.gold += 50;
                    } else { // 60% common
                        fishResult += `🐟 Caught a small fish!\n`;
                        player.inventory.fish = (player.inventory.fish || 0) + 1;
                        player.gold += 20;
                    }
                    
                    fishResult += `⚡ Energy: -15 (${player.energy}/${player.maxEnergy})`;
                    saveJSON(PLAYERS_FILE, players);
                    await message.reply(fishResult);
                    break;
                    
                case 'mine':
                    if (player.stamina < 20) {
                        await message.reply(`💪 Need 20 stamina to mine!`);
                        return;
                    }
                    
                    player.stamina -= 20;
                    const mineRarity = Math.random();
                    
                    let mineResult = `⛏️ MINING MINIGAME\n\n`;
                    
                    if (mineRarity < 0.005) { // 0.5% diamond
                        mineResult += `💎 JACKPOT! DIAMOND FOUND!\n`;
                        player.inventory.diamond = (player.inventory.diamond || 0) + 1;
                        player.gold += 1000;
                    } else if (mineRarity < 0.05) { // 4.5% gold
                        mineResult += `🌟 Gold ore found!\n`;
                        player.inventory.gold_ore = (player.inventory.gold_ore || 0) + 1;
                        player.gold += 300;
                    } else if (mineRarity < 0.3) { // 25% iron
                        mineResult += `👍 Iron ore found!\n`;
                        player.inventory.iron = (player.inventory.iron || 0) + 1;
                        player.gold += 100;
                    } else { // 70% stone
                        mineResult += `🪨 Found some stones\n`;
                        player.inventory.stone = (player.inventory.stone || 0) + 3;
                        player.gold += 30;
                    }
                    
                    mineResult += `💪 Stamina: -20 (${player.stamina}/${player.maxStamina})`;
                    saveJSON(PLAYERS_FILE, players);
                    await message.reply(mineResult);
                    break;
                    
/ ========== DAILY SYSTEM ==========
                case 'daily':
                    const today = new Date().toDateString();
                    
                    if (player.lastDaily === today) {
                        await message.reply(`🎁 Already claimed daily reward today!`);
                        return;
                    }
                    
                    player.lastDaily = today;
                    const dailyGold = 100 + (player.level * 10);
                    const dailyExp = 50 + (player.level * 5);
                    
                    player.gold += dailyGold;
                    player.exp += dailyExp;
                    
                    // Random daily item
                    const dailyItems = ['potion', 'scroll', 'fish', 'ore'];
                    const dailyItem = dailyItems[Math.floor(Math.random() * dailyItems.length)];
                    player.inventory[dailyItem] = (player.inventory[dailyItem] || 0) + 2;
                    
                    checkLevelUp(player);
                    saveJSON(PLAYERS_FILE, players);
                    
                    await message.reply(`🎁 DAILY REWARD!\n💰 +${dailyGold} Gold\n🌟 +${dailyExp} EXP\n🎁 +2 ${dailyItem}\n\nCome back tomorrow!`);
                    break;
                    
                case 'quest':
                    if (player.dailyQuests.length === 0) {
                        // Generate 3 random quests
                        player.dailyQuests = [
                            { type: 'hunt', target: 5, progress: 0, reward: { gold: 200, exp: 100 } },
                            { type: 'fish', target: 3, progress: 0, reward: { gold: 150, item: 'potion' } },
                            { type: 'mine', target: 10, progress: 0, reward: { gold: 300, exp: 50 } }
                        ];
                    }
                    
                    let questList = `📜 DAILY QUESTS\n\n`;
                    player.dailyQuests.forEach((q, i) => {
                        questList += `${i+1}. ${q.type.toUpperCase()} ${q.progress}/${q.target}\n`;
                        questList += `   Reward: ${q.reward.gold} Gold`;
                        if (q.reward.exp) questList += `, ${q.reward.exp} EXP`;
                        if (q.reward.item) questList += `, ${q.reward.item}`;
                        questList += `\n\n`;
                    });
                    
                    await message.reply(questList);
                    break;
                    
                // ========== GACHA SYSTEM ==========
                case 'gacha':
                    if (player.gold < 100) {
                        await message.reply(`❌ Need 100 gold for 1 gacha pull!`);
                        return;
                    }
                    
                    player.gold -= 100;
                    const gachaRoll = Math.random();
                    
                    let gachaResult = `🎰 GACHA PULL\n\n`;
                    
                    if (gachaRoll < 0.01) { // 1% SSR
                        const ssrItems = ['Excalibur', 'Dragon Armor', 'Phoenix Feather'];
                        const ssrItem = ssrItems[Math.floor(Math.random() * ssrItems.length)];
                        gachaResult += `🌈 **SSR LEGENDARY!** ${ssrItem}\n`;
                        player.inventory[ssrItem.toLowerCase().replace(' ', '_')] = 1;
                        player.gold += 1000; // Bonus gold
                    } else if (gachaRoll < 0.1) { // 9% SR
                        const srItems = ['Silver Sword', 'Magic Robe', 'Guardian Shield'];
                        const srItem = srItems[Math.floor(Math.random() * srItems.length)];
                        gachaResult += `⭐ **SR RARE!** ${srItem}\n`;
                        player.inventory[srItem.toLowerCase().replace(' ', '_')] = 1;
                        player.gold += 300;
                    } else if (gachaRoll < 0.4) { // 30% R
                        const rItems = ['Iron Sword', 'Leather Armor', 'Health Potion x5'];
                        const rItem = rItems[Math.floor(Math.random() * rItems.length)];
                        gachaResult += `👍 **R UNCOMMON!** ${rItem}\n`;
                        if (rItem.includes('x5')) {
                            player.inventory.potion += 5;
                        } else {
                            player.inventory[rItem.toLowerCase().replace(' ', '_')] = 1;
                        }
                    } else { // 60% N
                        const nItems = ['Small Potion', 'Bandage', 'Rusty Dagger'];
                        const nItem = nItems[Math.floor(Math.random() * nItems.length)];
                        gachaResult += `🎁 **N COMMON** ${nItem}\n`;
                        player.inventory[nItem.toLowerCase().replace(' ', '_')] = 1;
                    }
                    
                    gachaResult += `💰 Gold: -100 (Remaining: ${player.gold})`;
                    saveJSON(PLAYERS_FILE, players);
                    await message.reply(gachaResult);
                    break;
                    
                // ========== MARRIAGE SYSTEM ==========
                case 'marry':
                    if (!args[2]) {
                        await message.reply(`Usage: !rpg marry @mention_player\nCost: 999 Gold`);
                        return;
                    }
                    
                    if (player.marriedTo) {
                        await message.reply(`❌ You're already married!`);
                        return;
                    }
                    
                    if (player.gold < 999) {
                        await message.reply(`❌ Need 999 gold for wedding!`);
                        return;
                    }
                    
                    // In real: get target player ID from mention
                    const spouseId = "628xxx"; // From mention
                    const spouse = getPlayer(spouseId);
                    
                    if (spouse.marriedTo) {
                        await message.reply(`❌ That player is already married!`);
                        return;
                    }
                    
                    player.marriedTo = spouseId;
                    spouse.marriedTo = userId;
                    player.gold -= 999;
                    
                    // Wedding gift
                    player.inventory.wedding_ring = 1;
                    spouse.inventory.wedding_ring = 1;
                    
                    // Marriage bonus
                    player.atk += 5;
                    player.def += 5;
                    spouse.atk += 5;
                    spouse.def += 5;
                    
                    saveJSON(PLAYERS_FILE, players);
                    await message.reply(`💍 CONGRATULATIONS! You're now married!\n✨ Both get +5 ATK/DEF\n💝 Received Wedding Ring!`);
                    break;
                    
                case 'divorce':
                    if (!player.marriedTo) {
                        await message.reply(`❌ You're not married!`);
                        return;
                    }
                    
                    player.marriedTo = null;
                    saveJSON(PLAYERS_FILE, players);
                    await message.reply(`💔 Marriage ended.`);
                    break;
                    
                // ========== PET SYSTEM ==========
                case 'pet':
                    if (!player.pet) {
                        // Show available pets
                        const pets = [
                            { name: "Wolf", price: 500, stats: { atk: 10 } },
                            { name: "Owl", price: 300, stats: { exp: 0.1 } }, // +10% exp
                            { name: "Turtle", price: 400, stats: { def: 15 } },
                            { name: "Dragon", price: 5000, stats: { atk: 30, def: 20 } }
                        ];
                        
                        let petList = `🐾 AVAILABLE PETS\n\n`;
                        pets.forEach(p => {
                            petList += `• ${p.name} - ${p.price} Gold\n`;
                        });
                        petList += `\nBuy: !rpg pet buy <name>`;
                        await message.reply(petList);
                    } else {
                        await message.reply(`🐾 Your pet: ${player.pet.name}\nLevel: ${player.pet.level}\nHappiness: ${player.pet.happiness}/100`);
                    }
                    break;
                    
                case 'petbuy':
                    const petName = args.slice(3).join(' ').toLowerCase();
                    const petShop = {
                        wolf: { name: "Wolf", price: 500, atk: 10 },
                        owl: { name: "Owl", price: 300, exp: 0.1 },
                        turtle: { name: "Turtle", price: 400, def: 15 },
                        dragon: { name: "Dragon", price: 5000, atk: 30, def: 20 }
                    };
                    
                    if (petShop[petName]) {
                        if (player.gold >= petShop[petName].price) {
                            player.gold -= petShop[petName].price;
                            player.pet = {
                                name: petShop[petName].name,
                                level: 1,
                                exp: 0,
                                happiness: 100,
                                stats: petShop[petName]
                            };
                            saveJSON(PLAYERS_FILE, players);
                            await message.reply(`🐾 You bought a ${petShop[petName].name}!\nIt will help you in adventures!`);
                        } else {
                            await message.reply(`❌ Not enough gold! Need ${petShop[petName].price}`);
                        }
                    } else {
                        await message.reply(`❌ Pet not found! Use !rpg pet to see list`);
                    }
                    break;
                      // ========== DUNGEON SYSTEM ==========
                case 'dungeon':
                    if (player.energy < 50) {
                        await message.reply(`⚡ Need 50 energy to enter dungeon!`);
                        return;
                    }
                    
                    player.energy -= 50;
                    const dungeonFloors = [3, 5, 10][Math.floor(Math.random() * 3)];
                    let dungeonResult = `🏰 DUNGEON RAID - ${dungeonFloors} FLOORS\n\n`;
                    
                    let totalGold = 0;
                    let totalExp = 0;
                    let floor = 1;
                    
                    while (floor <= dungeonFloors && player.hp > 0) {
                        const floorGold = floor * 50;
                        const floorExp = floor * 20;
                        
                        dungeonResult += `Floor ${floor}: +${floorGold} Gold, +${floorExp} EXP\n`;
                        
                        totalGold += floorGold;
                        totalExp += floorExp;
                        
                        // 30% chance monster each floor
                        if (Math.random() < 0.3) {
                            const monsterDmg = Math.floor(Math.random() * 20) + 10;
                            player.hp -= monsterDmg;
                            dungeonResult += `  💥 Monster hit! -${monsterDmg} HP\n`;
                            
                            if (player.hp <= 0) {
                                dungeonResult += `\n💀 Defeated on floor ${floor}!`;
                                player.hp = 1;
                                break;
                            }
                        }
                        
                        floor++;
                    }
                    
                    if (floor > dungeonFloors) {
                        dungeonResult += `\n🎉 DUNGEON CLEARED!\n`;
                        // Bonus for full clear
                        totalGold *= 2;
                        totalExp *= 2;
                        dungeonResult += `✨ BONUS: Double rewards!\n`;
                    }
                    
                    player.gold += totalGold;
                    player.exp += totalExp;
                    dungeonResult += `\n💰 Total: +${totalGold} Gold\n🌟 Total: +${totalExp} EXP`;
                    dungeonResult += `\n⚡ Energy: -50 (${player.energy}/${player.maxEnergy})`;
                    
                    checkLevelUp(player);
                    saveJSON(PLAYERS_FILE, players);
                    await message.reply(dungeonResult);
                    break;
                    
                // ========== MARKET SYSTEM ==========
                case 'market':
                    const marketCmd = args[2] || 'browse';
                    
                    switch(marketCmd) {
                        case 'browse':
                            let marketList = `🛒 PLAYER MARKET\n\n`;
                            if (market.length === 0) {
                                marketList += `No items for sale.\nSell: !rpg market sell <item> <price>`;
                            } else {
                                market.slice(0, 10).forEach(item => {
                                    marketList += `• ${item.item} - ${item.price} Gold (Seller: ${item.seller})\n`;
                                });
                            }
                            await message.reply(marketList);
                            break;
                            
                        case 'sell':
                            const itemName = args[3];
                            const price = parseInt(args[4]);
                            
                            if (!itemName || !price) {
                                await message.reply(`Usage: !rpg market sell <item> <price>\nExample: !rpg market sell potion 50`);
                                return;
                            }
                            
                            if (!player.inventory[itemName] || player.inventory[itemName] < 1) {
                                await message.reply(`❌ You don't have ${itemName}!`);
                                return;
                            }
                            
                            player.inventory[itemName]--;
                            market.push({
                                item: itemName,
                                price: price,
                                seller: userId,
                                timestamp: Date.now()
                            });
                            
                            saveJSON(MARKET_FILE, market);
                            saveJSON(PLAYERS_FILE, players);
                            
                            await message.reply(`✅ Listed ${itemName} for ${price} gold on market!`);
                            break;
                            
                        case 'buy':
                            const itemId = parseInt(args[3]);
                            if (isNaN(itemId) || itemId < 0 || itemId >= market.length) {
                                await message.reply(`Usage: !rpg market buy <item_number>\nCheck numbers with !rpg market browse`);
                                return;
                            }
                            
                            const marketItem = market[itemId];
                            if (player.gold < marketItem.price) {
                                await message.reply(`❌ Not enough gold! Need ${marketItem.price}`);
                                return;
                            }
                            
                            player.gold -= marketItem.price;
                            player.inventory[marketItem.item] = (player.inventory[marketItem.item] || 0) + 1;
                            
                            // Give gold to seller
                            const seller = getPlayer(marketItem.seller);
                            seller.gold += marketItem.price;
                            
                            // Remove from market
                            market.splice(itemId, 1);
                            
                            saveJSON(MARKET_FILE, market);
                            saveJSON(PLAYERS_FILE, players);
                            
                            await message.reply(`✅ Bought ${marketItem.item} for ${marketItem.price} gold!`);
                            break;
                    }
                    break;
                       // ========== DUNGEON SYSTEM ==========
                case 'dungeon':
                    if (player.energy < 50) {
                        await message.reply(`⚡ Need 50 energy to enter dungeon!`);
                        return;
                    }
                    
                    player.energy -= 50;
                    const dungeonFloors = [3, 5, 10][Math.floor(Math.random() * 3)];
                    let dungeonResult = `🏰 DUNGEON RAID - ${dungeonFloors} FLOORS\n\n`;
                    
                    let totalGold = 0;
                    let totalExp = 0;
                    let floor = 1;
                    
                    while (floor <= dungeonFloors && player.hp > 0) {
                        const floorGold = floor * 50;
                        const floorExp = floor * 20;
                        
                        dungeonResult += `Floor ${floor}: +${floorGold} Gold, +${floorExp} EXP\n`;
                        
                        totalGold += floorGold;
                        totalExp += floorExp;
                        
                        // 30% chance monster each floor
                        if (Math.random() < 0.3) {
                            const monsterDmg = Math.floor(Math.random() * 20) + 10;
                            player.hp -= monsterDmg;
                            dungeonResult += `  💥 Monster hit! -${monsterDmg} HP\n`;
                            
                            if (player.hp <= 0) {
                                dungeonResult += `\n💀 Defeated on floor ${floor}!`;
                                player.hp = 1;
                                break;
                            }
                        }
                        
                        floor++;
                    }
                    
                    if (floor > dungeonFloors) {
                        dungeonResult += `\n🎉 DUNGEON CLEARED!\n`;
                        // Bonus for full clear
                        totalGold *= 2;
                        totalExp *= 2;
                        dungeonResult += `✨ BONUS: Double rewards!\n`;
                    }
                    
                    player.gold += totalGold;
                    player.exp += totalExp;
                    dungeonResult += `\n💰 Total: +${totalGold} Gold\n🌟 Total: +${totalExp} EXP`;
                    dungeonResult += `\n⚡ Energy: -50 (${player.energy}/${player.maxEnergy})`;
                    
                    checkLevelUp(player);
                    saveJSON(PLAYERS_FILE, players);
                    await message.reply(dungeonResult);
                    break;
                         // ========== MARKET SYSTEM ==========
                case 'market':
                    const marketCmd = args[2] || 'browse';
                    
                    switch(marketCmd) {
                        case 'browse':
                            let marketList = `🛒 PLAYER MARKET\n\n`;
                            if (market.length === 0) {
                                marketList += `No items for sale.\nSell: !rpg market sell <item> <price>`;
                            } else {
                                market.slice(0, 10).forEach(item => {
                                    marketList += `• ${item.item} - ${item.price} Gold (Seller: ${item.seller})\n`;
                                });
                            }
                            await message.reply(marketList);
                            break;
                            
                        case 'sell':
                            const itemName = args[3];
                            const price = parseInt(args[4]);
                            
                            if (!itemName || !price) {
                                await message.reply(`Usage: !rpg market sell <item> <price>\nExample: !rpg market sell potion 50`);
                                return;
                            }
                            
                            if (!player.inventory[itemName] || player.inventory[itemName] < 1) {
                                await message.reply(`❌ You don't have ${itemName}!`);
                                return;
                            }
                            
                            player.inventory[itemName]--;
                            market.push({
                                item: itemName,
                                price: price,
                                seller: userId,
                                timestamp: Date.now()
                            });
                            
                            saveJSON(MARKET_FILE, market);
                            saveJSON(PLAYERS_FILE, players);
                            
                            await message.reply(`✅ Listed ${itemName} for ${price} gold on market!`);
                            break;
                            
                        case 'buy':
                            const itemId = parseInt(args[3]);
                            if (isNaN(itemId) || itemId < 0 || itemId >= market.length) {
                                await message.reply(`Usage: !rpg market buy <item_number>\nCheck numbers with !rpg market browse`);
                                return;
                            }
                            
                            const marketItem = market[itemId];
                            if (player.gold < marketItem.price) {
                                await message.reply(`❌ Not enough gold! Need ${marketItem.price}`);
                                return;
                            }
                            
                            player.gold -= marketItem.price;
                            player.inventory[marketItem.item] = (player.inventory[marketItem.item] || 0) + 1;
                            
                            // Give gold to seller
                            const seller = getPlayer(marketItem.seller);
                            seller.gold += marketItem.price;
                            
                            // Remove from market
                            market.splice(itemId, 1);
                            
                            saveJSON(MARKET_FILE, market);
                            saveJSON(PLAYERS_FILE, players);
                            
                            await message.reply(`✅ Bought ${marketItem.item} for ${marketItem.price} gold!`);
                            break;
                    }
                    break;
   // ========== ACHIEVEMENTS ==========
                case 'achievements':
                    let achList = `🏆 ACHIEVEMENTS\n\n`;
                    achievements.forEach(ach => {
                        const has = player.achievements.includes(ach.id);
                        achList += `${has ? '✅' : '❌'} ${ach.name}\n`;
                        achList += `   ${ach.desc}\n`;
                        if (has) achList += `   ✓ Completed\n\n`;
                        else achList += `   ✗ Not completed\n\n`;
                    });
                    await message.reply(achList);
                    break;
                    
                // ========== EVENT SYSTEM ==========
                case 'event':
                    const events = [
                        { name: "Double EXP Event", active: true, desc: "All EXP x2 for 24h!" },
                        { name: "Gold Rush", active: false, desc: "Gold from monsters x3" },
                        { name: "Boss Festival", active: true, desc: "Increased boss spawn rate" }
                    ];
                    
                    let eventList = `🎪 CURRENT EVENTS\n\n`;
                    events.forEach(e => {
                        eventList += `${e.active ? '🎉' : '💤'} ${e.name}\n`;
                        eventList += `   ${e.desc}\n\n`;
                    });
                    await message.reply(eventList);
                    break;
                    
                // ========== PROFILE ==========
                case 'profile':
                    let profile = `📊 PLAYER PROFILE\n\n`;
                    profile += `👤 ${player.name}\n`;
                    profile += `⭐ Level ${player.level} (${player.rank})\n`;
                    profile += `🎭 Class: ${player.class.toUpperCase()}\n`;
                    if (player.job) profile += `💼 Job: ${player.job.toUpperCase()}\n`;
                    profile += `❤️ HP: ${player.hp}/${player.maxHp}\n`;
                    profile += `⚔️ ATK: ${player.atk}\n`;
                    profile += `🛡️ DEF: ${player.def}\n`;
                    profile += `🌀 Mana: ${player.mana}/${player.maxMana}\n`;
                    profile += `⚡ Energy: ${player.energy}/${player.maxEnergy}\n`;
                    profile += `💪 Stamina: ${player.stamina}/${player.maxStamina}\n`;
                    profile += `💰 Gold: ${player.gold}\n`;
                    profile += `🌟 EXP: ${player.exp}/${player.expNeeded}\n`;
                    
                    if (player.guild) profile += `🏰 Guild: ${guilds[player.guild]?.name || "Unknown"}\n`;
                    if (player.marriedTo) profile += `💍 Married: Yes\n`;
                    if (player.pet) profile += `🐾 Pet: ${player.pet.name}\n`;
                    
                    profile += `🏆 Achievements: ${player.achievements.length}/${achievements.length}`;
                    await message.reply(profile);
                    break;
                    
                // ========== HELP ==========
                case 'help':
                default:
                    const help = `🎮 RPG BOT v2.0 - COMMANDS\n\n` +
                        `📊 CHARACTER:\n` +
                        `!rpg start - Register\n` +
                        `!rpg profile - Your stats\n` +
                        `!rpg class - Choose class (Lv.10+)\n` +
                        `!rpg job - Set profession\n` +
                        `!rpg work - Work for gold\n\n` +
                        
                        `⚔️ COMBAT:\n` +
                        `!rpg hunt - Hunt monsters\n` +
                        `!rpg adventure - Random adventure\n` +
                        `!rpg boss - Fight boss\n` +
                        `!rpg duel @player - PvP battle\n` +
                        `!rpg pvp - PvP stats\n` +
                        `!rpg dungeon - Raid dungeon\n\n` +
                        
                        `🎮 MINIGAMES:\n` +
                        `!rpg fish - Fishing minigame\n` +
                        `!rpg mine - Mining minigame\n` +
                        `!rpg gacha - Gacha system\n\n` +
                        
                        `👥 SOCIAL:\n` +
                        `!rpg guild - Guild system\n` +
                        `!rpg marry @player - Get married\n` +
                        `!rpg divorce - End marriage\n\n` +
                        
                        `📈 PROGRESSION:\n` +
                        `!rpg daily - Daily reward\n` +
                        `!rpg quest - Daily quests\n` +
                        `!rpg achievements - Achievements\n` +
                        `!rpg event - Current events\n\n` +
                        
                        `🛒 ECONOMY:\n` +
                        `!rpg market - Player market\n` +
                        `!rpg shop - NPC shop\n` +
                        `!rpg inventory - Your items\n\n` +
                        
                        `🐾 PETS:\n` +
                        `!rpg pet - Pet system\n` +
                        `!rpg petbuy <name> - Buy pet\n\n` +
                        
                        `🔧 OTHER:\n` +
                        `!rpg help - This menu\n` +
                        `!rpg leaderboard - Top players`;
                    await message.reply(help);
                    break;
            }
        } catch (error) {
            console.error('Command error:', error);
            await message.reply('❌ Error executing command');
        }
    }
});

// Helper function for level up
function checkLevelUp(player) {
    if (player.exp >= player.expNeeded) {
        player.level++;
        player.exp -= player.expNeeded;
        player.expNeeded = Math.floor(player.expNeeded * 1.5);
        
        // Stat increase
        player.maxHp += 20;
        player.hp = player.maxHp;
        player.atk += 5;
        player.def += 2;
        player.maxEnergy += 10;
        player.energy = player.maxEnergy;
        player.maxStamina += 5;
        player.stamina = player.maxStamina;
        
        return true;
    }
    return false;
}

// Error handling
client.on('auth_failure', () => console.log('❌ Auth failed'));
client.on('disconnected', () => {
    console.log('❌ Disconnected, reconnecting...');
    client.initialize();
});

// Start bot
client.initialize();
