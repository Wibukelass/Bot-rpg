const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

console.log('🎮 Starting WhatsApp RPG Bot...');

// Database file
const PLAYERS_FILE = './data/players.json';
const MONSTERS_FILE = './data/monsters.json';

// Load atau buat database
let players = {};
let monsters = [];

if (fs.existsSync(PLAYERS_FILE)) {
    players = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
} else {
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    fs.writeFileSync(PLAYERS_FILE, '{}');
}

if (fs.existsSync(MONSTERS_FILE)) {
    monsters = JSON.parse(fs.readFileSync(MONSTERS_FILE, 'utf8'));
} else {
    // Default monsters
    monsters = [
        { id: 1, name: "Goblin", hp: 30, atk: 5, exp: 10, gold: 5 },
        { id: 2, name: "Slime", hp: 20, atk: 3, exp: 7, gold: 3 },
        { id: 3, name: "Wolf", hp: 40, atk: 8, exp: 15, gold: 8 },
        { id: 4, name: "Orc", hp: 60, atk: 12, exp: 25, gold: 15 },
        { id: 5, name: "Dragon", hp: 150, atk: 25, exp: 100, gold: 50 }
    ];
    fs.writeFileSync(MONSTERS_FILE, JSON.stringify(monsters, null, 2));
}

// Save database
function savePlayers() {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
}

// Inisialisasi player baru
function initPlayer(userId) {
    players[userId] = {
        name: "Adventurer",
        level: 1,
        exp: 0,
        expNeeded: 100,
        hp: 100,
        maxHp: 100,
        atk: 10,
        def: 5,
        gold: 50,
        energy: 100,
        maxEnergy: 100,
        lastEnergy: Date.now(),
        inventory: {
            potion: 3,
            sword: 0,
            armor: 0,
            shield: 0
        },
        stats: {
            monstersKilled: 0,
            bossesKilled: 0,
            totalGold: 50,
            totalExp: 0
        },
        class: "Novice",
        rank: "Bronze"
    };
    savePlayers();
    return players[userId];
}

// Get player
function getPlayer(userId) {
    if (!players[userId]) {
        return initPlayer(userId);
    }
    
    // Regenerate energy (1 per 5 menit)
    const player = players[userId];
    const now = Date.now();
    const hoursPassed = (now - player.lastEnergy) / (1000 * 60 * 5); // 5 menit = 1 energy
    if (hoursPassed >= 1) {
        const energyGain = Math.floor(hoursPassed);
        player.energy = Math.min(player.maxEnergy, player.energy + energyGain);
        player.lastEnergy = now;
        savePlayers();
    }
    
    return player;
}

// Level up system
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
        
        // Update rank
        const ranks = [
            { level: 1, name: "Bronze" },
            { level: 10, name: "Silver" },
            { level: 20, name: "Gold" },
            { level: 30, name: "Platinum" },
            { level: 40, name: "Diamond" },
            { level: 50, name: "Master" },
            { level: 60, name: "Grandmaster" },
            { level: 70, name: "Challenger" },
            { level: 80, name: "Legend" },
            { level: 90, name: "Mythic" },
            { level: 100, name: "GOD" }
        ];
        
        for (let i = ranks.length - 1; i >= 0; i--) {
            if (player.level >= ranks[i].level) {
                player.rank = ranks[i].name;
                break;
            }
        }
        
        savePlayers();
        return true;
    }
    return false;
}

// Battle system
function battle(player, monster) {
    let battleLog = [];
    let playerHp = player.hp;
    let monsterHp = monster.hp;
    
    battleLog.push(`⚔️ BATTLE START!`);
    battleLog.push(`You vs ${monster.name} (HP: ${monster.hp}, ATK: ${monster.atk})`);
    
    // Battle turns (max 10 rounds)
    for (let round = 1; round <= 10; round++) {
        // Player attack
        let playerDamage = Math.max(1, player.atk - Math.floor(monster.def || 0));
        monsterHp -= playerDamage;
        battleLog.push(`[Round ${round}] You hit ${monster.name} for ${playerDamage} damage!`);
        
        if (monsterHp <= 0) {
            battleLog.push(`🎉 You defeated ${monster.name}!`);
            
            // Rewards
            const expGain = monster.exp;
            const goldGain = monster.gold;
            
            player.exp += expGain;
            player.gold += goldGain;
            player.stats.monstersKilled++;
            player.stats.totalGold += goldGain;
            player.stats.totalExp += expGain;
            
            battleLog.push(`💰 +${goldGain} Gold`);
            battleLog.push(`🌟 +${expGain} EXP`);
            
            const leveledUp = checkLevelUp(player);
            if (leveledUp) {
                battleLog.push(`🎊 LEVEL UP! Now Level ${player.level} (${player.rank})`);
            }
            
            player.hp = playerHp; // Save remaining HP
            savePlayers();
            
            return {
                victory: true,
                log: battleLog,
                exp: expGain,
                gold: goldGain,
                leveledUp: leveledUp
            };
        }
        
        // Monster attack
        let monsterDamage = Math.max(1, monster.atk - Math.floor(player.def / 2));
        playerHp -= monsterDamage;
        battleLog.push(`[Round ${round}] ${monster.name} hit you for ${monsterDamage} damage!`);
        
        if (playerHp <= 0) {
            battleLog.push(`💀 You were defeated by ${monster.name}!`);
            player.hp = 1; // Revive with 1 HP
            savePlayers();
            return { victory: false, log: battleLog };
        }
    }
    
    battleLog.push(`⏳ Battle timed out! Both survived.`);
    player.hp = playerHp;
    savePlayers();
    return { victory: false, log: battleLog };
}

// WhatsApp Bot Setup
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
});

// QR Code
client.on('qr', (qr) => {
    console.log('\n📱 SCAN QR CODE INI DI WHATSAPP:');
    qrcode.generate(qr, { small: true });
});

// Bot Ready
client.on('ready', () => {
    console.log('✅ RPG BOT READY!');
    console.log('Prefix: !rpg');
});

// Message Handler
client.on('message', async (message) => {
    const text = message.body.toLowerCase();
    const sender = message.from;
    const userId = sender.split('@')[0];
    
    // RPG Commands
    if (text.startsWith('!rpg')) {
        const args = text.split(' ');
        const command = args[1] || 'help';
        
        const player = getPlayer(userId);
        
        switch(command) {
            case 'start':
            case 'register':
                await message.reply(`🎮 *WELCOME TO RPG ADVENTURE!*\n\n` +
                    `You are now registered as an Adventurer!\n` +
                    `Type *!rpg profile* to see your stats\n` +
                    `Type *!rpg help* for command list`);
                break;
                
            case 'profile':
            case 'stats':
                const profile = `📊 *PLAYER PROFILE*\n\n` +
                    `👤 Name: ${player.name}\n` +
                    `🏆 Rank: ${player.rank}\n` +
                    `🎮 Class: ${player.class}\n` +
                    `⭐ Level: ${player.level}\n` +
                    `❤️ HP: ${player.hp}/${player.maxHp}\n` +
                    `⚔️ ATK: ${player.atk}\n` +
                    `🛡️ DEF: ${player.def}\n` +
                    `🌟 EXP: ${player.exp}/${player.expNeeded}\n` +
                    `💰 Gold: ${player.gold}\n` +
                    `⚡ Energy: ${player.energy}/${player.maxEnergy}\n\n` +
                    `📈 Stats:\n` +
                    `• Monsters Killed: ${player.stats.monstersKilled}\n` +
                    `• Total Gold: ${player.stats.totalGold}\n` +
                    `• Total EXP: ${player.stats.totalExp}`;
                await message.reply(profile);
                break;
                
            case 'hunt':
                if (player.energy < 10) {
                    await message.reply(`⚠️ Not enough energy! You need 10 energy.\nCurrent: ${player.energy}/${player.maxEnergy}`);
                    return;
                }
                
                player.energy -= 10;
                const randomMonster = monsters[Math.floor(Math.random() * Math.min(monsters.length, player.level))];
                const battleResult = battle(player, randomMonster);
                
                let huntResult = `🌲 *GOING ON A HUNT!*\n\n`;
                huntResult += battleResult.log.join('\n') + '\n\n';
                huntResult += `⚡ Energy: -10 (${player.energy}/${player.maxEnergy} remaining)`;
                
                await message.reply(huntResult);
                break;
                
            case 'adventure':
                if (player.energy < 5) {
                    await message.reply(`⚠️ Not enough energy! You need 5 energy.\nCurrent: ${player.energy}/${player.maxEnergy}`);
                    return;
                }
                
                player.energy -= 5;
                const events = [
                    { type: 'gold', amount: Math.floor(Math.random() * 20) + 10, text: "💰 Found treasure!" },
                    { type: 'exp', amount: Math.floor(Math.random() * 15) + 5, text: "🌟 Discovered ancient ruins!" },
                    { type: 'potion', amount: 1, text: "🧪 Found a healing potion!" },
                    { type: 'monster', text: "🐺 Encountered a wild monster!" }
                ];
                
                const event = events[Math.floor(Math.random() * events.length)];
                let adventureResult = `🗺️ *ADVENTURE TIME!*\n\n${event.text}\n`;
                
                if (event.type === 'gold') {
                    player.gold += event.amount;
                    adventureResult += `💰 +${event.amount} Gold`;
                } else if (event.type === 'exp') {
                    player.exp += event.amount;
                    adventureResult += `🌟 +${event.amount} EXP`;
                    checkLevelUp(player);
                } else if (event.type === 'potion') {
                    player.inventory.potion += event.amount;
                    adventureResult += `🧪 +${event.amount} Potion`;
                } else if (event.type === 'monster') {
                    const easyMonster = monsters[0];
                    const battleResult = battle(player, easyMonster);
                    adventureResult += '\n' + battleResult.log.join('\n');
                }
                
                adventureResult += `\n\n⚡ Energy: -5 (${player.energy}/${player.maxEnergy} remaining)`;
                savePlayers();
                await message.reply(adventureResult);
                break;
                
            case 'inventory':
            case 'inv':
                const inv = `🎒 *INVENTORY*\n\n` +
                    `🧪 Healing Potion: ${player.inventory.potion}\n` +
                    `⚔️ Sword: ${player.inventory.sword}\n` +
                    `🛡️ Armor: ${player.inventory.armor}\n` +
                    `🔰 Shield: ${player.inventory.shield}\n\n` +
                    `💰 Gold: ${player.gold}`;
                await message.reply(inv);
                break;
                
            case 'shop':
                const shop = `🛒 *ITEM SHOP*\n\n` +
                    `1. 🧪 Healing Potion - 20 Gold\n` +
                    `   (Restore 50 HP)\n` +
                    `2. ⚔️ Iron Sword - 100 Gold\n` +
                    `   (+5 ATK)\n` +
                    `3. 🛡️ Leather Armor - 150 Gold\n` +
                    `   (+10 DEF)\n` +
                    `4. 🔰 Wooden Shield - 80 Gold\n` +
                    `   (+5 DEF)\n\n` +
                    `Type *!rpg buy <item number>* to purchase\n` +
                    `💰 Your gold: ${player.gold}`;
                await message.reply(shop);
                break;
                
            case 'buy':
                if (!args[2]) {
                    await message.reply(`Usage: !rpg buy <item number>`);
                    return;
                }
                
                const item = parseInt(args[2]);
                let success = false;
                
                switch(item) {
                    case 1: // Potion
                        if (player.gold >= 20) {
                            player.gold -= 20;
                            player.inventory.potion++;
                            success = true;
                        }
                        break;
                    case 2: // Sword
                        if (player.gold >= 100) {
                            player.gold -= 100;
                            player.inventory.sword++;
                            player.atk += 5;
                            success = true;
                        }
                        break;
                    case 3: // Armor
                        if (player.gold >= 150) {
                            player.gold -= 150;
                            player.inventory.armor++;
                            player.def += 10;
                            success = true;
                        }
                        break;
                    case 4: // Shield
                        if (player.gold >= 80) {
                            player.gold -= 80;
                            player.inventory.shield++;
                            player.def += 5;
                            success = true;
                        }
                        break;
                }
                
                if (success) {
                    savePlayers();
                    await message.reply(`✅ Purchase successful! Check your inventory with !rpg inv`);
                } else {
                    await message.reply(`❌ Not enough gold or invalid item!`);
                }
                break;
                
            case 'use':
                if (!args[2]) {
                    await message.reply(`Usage: !rpg use <item>\nItems: potion`);
                    return;
                }
                
                if (args[2] === 'potion') {
                    if (player.inventory.potion > 0) {
                        player.inventory.potion--;
                        const heal = 50;
                        player.hp = Math.min(player.maxHp, player.hp + heal);
                        savePlayers();
                        await message.reply(`🧪 Used healing potion! +${heal} HP\n❤️ HP: ${player.hp}/${player.maxHp}`);
                    } else {
                        await message.reply(`❌ No potions in inventory!`);
                    }
                }
                break;
                
            case 'leaderboard':
            case 'top':
                const playerList = Object.entries(players);
                if (playerList.length === 0) {
                    await message.reply(`📊 No players registered yet!`);
                    return;
                }
                
                const sorted = playerList.sort((a, b) => b[1].level - a[1].level).slice(0, 10);
                let leaderboard = `🏆 *TOP 10 PLAYERS*\n\n`;
                
                sorted.forEach(([id, p], index) => {
                    leaderboard += `${index + 1}. ${p.name} - Lv.${p.level} ${p.rank}\n`;
                });
                
                await message.reply(leaderboard);
                break;
                
            case 'boss':
                if (player.energy < 30) {
                    await message.reply(`⚠️ Not enough energy! You need 30 energy.\nCurrent: ${player.energy}/${player.maxEnergy}`);
                    return;
                }
                
                if (player.level < 5) {
                    await message.reply(`⚠️ You need to be at least level 5 to fight bosses!`);
                    return;
                }
                
                player.energy -= 30;
                const boss = monsters[monsters.length - 1]; // Dragon
                const bossResult = battle(player, boss);
                
                let bossMessage = `🐉 *BOSS BATTLE: DRAGON!*\n\n`;
                bossMessage += bossResult.log.join('\n') + '\n\n';
                
                if (bossResult.victory) {
                    bossMessage += `🎊 *BOSS DEFEATED!*\n`;
                    bossMessage += `💰 +${boss.gold * 2} Gold (Double Reward!)\n`;
                    bossMessage += `👑 You are now a Dragon Slayer!\n`;
                    player.stats.bossesKilled++;
                }
                
                bossMessage += `⚡ Energy: -30 (${player.energy}/${player.maxEnergy} remaining)`;
                savePlayers();
                await message.reply(bossMessage);
                break;
                
            case 'energy':
                const now = Date.now();
                const energyRegen = Math.floor((now - player.lastEnergy) / (1000 * 60 * 5)); // 5 minutes per energy
                const nextEnergy = player.lastEnergy + (1000 * 60 * 5);
                
                await message.reply(`⚡ *ENERGY STATUS*\n\n` +
                    `Current: ${player.energy}/${player.maxEnergy}\n` +
                    `Next energy in: ${Math.max(0, Math.ceil((nextEnergy - now) / (1000 * 60)))} minutes\n` +
                    `(1 energy regenerates every 5 minutes)`);
                break;
                
            case 'help':
            default:
                const help = `🎮 *RPG BOT COMMANDS*\n\n` +
                    `*PROFILE & STATS:*\n` +
                    `!rpg start - Register/start game\n` +
                    `!rpg profile - View your stats\n` +
                    `!rpg leaderboard - Top 10 players\n` +
                    `!rpg energy - Check energy\n\n` +
                    `*ACTIONS:*\n` +
                    `!rpg hunt - Hunt monsters (10 energy)\n` +
                    `!rpg adventure - Go adventure (5 energy)\n` +
                    `!rpg boss - Fight dragon boss (30 energy)\n\n` +
                    `*INVENTORY & SHOP:*\n` +
                    `!rpg inventory - View inventory\n` +
                    `!rpg shop - Open shop\n` +
                    `!rpg buy <number> - Buy item\n` +
                    `!rpg use <item> - Use item\n\n` +
                    `*OTHER:*\n` +
                    `!rpg help - Show this menu\n\n` +
                    `⚡ Energy regenerates 1 per 5 minutes\n` +
                    `📊 Stats saved automatically`;
                await message.reply(help);
                break;
        }
    }
    
    // Quick commands
    if (text === '!profile') {
        const player = getPlayer(userId);
        await message.reply(`📊 Level ${player.level} ${player.rank}\n❤️ ${player.hp}/${player.maxHp} HP | ⚡ ${player.energy} Energy`);
    }
});

// Error handling
client.on('auth_failure', () => console.log('❌ Auth failed'));
client.on('disconnected', () => {
    console.log('❌ Disconnected, reconnecting...');
    client.initialize();
});

// Start bot
client.initialize();