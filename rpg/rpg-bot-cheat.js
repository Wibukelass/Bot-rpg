const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

console.log('🎮 RPG BOT v2.0 - WITH CHEAT MENU');

// === CONFIGURASI OWNER ===
const OWNER_NUMBER = "821-8101-3441"; // GANTI DENGAN NOMOR MU!
const OWNER_ID = OWNER_NUMBER + "@c.us";

// Database files
const PLAYERS_FILE = './data/players.json';
let players = {};

// Load database
if (fs.existsSync(PLAYERS_FILE)) {
    players = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
} else {
    fs.writeFileSync(PLAYERS_FILE, '{}');
}

function savePlayers() {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
}

// Cheat commands for owner
const CHEAT_COMMANDS = {
    // Give resources
    "!cheat gold": "Add gold to player",
    "!cheat exp": "Add experience",
    "!cheat level": "Set level directly",
    "!cheat item": "Give any item",
    
    // Player management
    "!cheat stats": "Set player stats",
    "!cheat heal": "Full heal player",
    "!cheat energy": "Full energy",
    
    // God mode
    "!cheat god": "Enable god mode",
    "!cheat mortal": "Disable god mode",
    
    // Admin tools
    "!cheat ban": "Ban player",
    "!cheat unban": "Unban player",
    "!cheat reset": "Reset player data",
    
    // Server control
    "!cheat broadcast": "Broadcast message",
    "!cheat shutdown": "Shutdown bot",
    "!cheat restart": "Restart bot",
    
    // Debug
    "!cheat players": "List all players",
    "!cheat db": "View database stats",
    "!cheat backup": "Backup database",
    
    // Fun cheats
    "!cheat spawnboss": "Spawn boss in chat",
    "!cheat event": "Start special event",
    "!cheat lottery": "Force lottery win"
};

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
    console.log('✅ RPG BOT READY!');
    console.log(`👑 Owner: ${OWNER_NUMBER}`);
    console.log('Type !cheatmenu for owner commands');
});

// ==================== CHEAT HANDLER ====================
async function handleCheatCommand(message, args) {
    const sender = message.from;
    
    // Cek apakah sender adalah owner
    if (sender !== OWNER_ID) {
        await message.reply('❌ CHEAT COMMANDS FOR OWNER ONLY!');
        return;
    }
    
    const cheatCmd = args[1];
    const target = args[2]; // Player ID or "@mention"
    const value = args[3];
    
    switch(cheatCmd) {
        case 'menu':
            let cheatMenu = `👑 *OWNER CHEAT MENU*\n\n`;
            for (const [cmd, desc] of Object.entries(CHEAT_COMMANDS)) {
                cheatMenu += `${cmd}\n  ↳ ${desc}\n\n`;
            }
            cheatMenu += `📌 Usage: !cheat <command> <target> <value>`;
            await message.reply(cheatMenu);
            break;
            
        case 'gold':
            if (!target || !value) {
                await message.reply('Usage: !cheat gold @player 1000');
                return;
            }
            const goldTarget = extractPlayerId(target, message);
            if (goldTarget && players[goldTarget]) {
                const amount = parseInt(value);
                players[goldTarget].gold += amount;
                savePlayers();
                await message.reply(`💰 Added ${amount} gold to player ${goldTarget}\nNew total: ${players[goldTarget].gold}`);
            } else {
                await message.reply('❌ Player not found!');
            }
            break;
            
        case 'exp':
            if (!target || !value) {
                await message.reply('Usage: !cheat exp @player 500');
                return;
            }
            const expTarget = extractPlayerId(target, message);
            if (expTarget && players[expTarget]) {
                const amount = parseInt(value);
                players[expTarget].exp += amount;
                
                // Auto level up
                while (players[expTarget].exp >= players[expTarget].expNeeded) {
                    players[expTarget].level++;
                    players[expTarget].exp -= players[expTarget].expNeeded;
                    players[expTarget].expNeeded = Math.floor(players[expTarget].expNeeded * 1.5);
                    players[expTarget].maxHp += 20;
                    players[expTarget].atk += 5;
                    players[expTarget].def += 2;
                }
                
                savePlayers();
                await message.reply(`🌟 Added ${amount} EXP to player\nNew level: ${players[expTarget].level}`);
            }
            break;
            
        case 'level':
            if (!target || !value) {
                await message.reply('Usage: !cheat level @player 50');
                return;
            }
            const levelTarget = extractPlayerId(target, message);
            if (levelTarget && players[levelTarget]) {
                const newLevel = parseInt(value);
                const oldLevel = players[levelTarget].level;
                const levelDiff = newLevel - oldLevel;
                
                players[levelTarget].level = newLevel;
                players[levelTarget].exp = 0;
                players[levelTarget].expNeeded = 100 * Math.pow(1.5, newLevel - 1);
                
                // Add stats based on level difference
                players[levelTarget].maxHp += 20 * levelDiff;
                players[levelTarget].hp = players[levelTarget].maxHp;
                players[levelTarget].atk += 5 * levelDiff;
                players[levelTarget].def += 2 * levelDiff;
                
                savePlayers();
                await message.reply(`⭐ Set player level to ${newLevel}\n+${20 * levelDiff} Max HP\n+${5 * levelDiff} ATK\n+${2 * levelDiff} DEF`);
            }
            break;
            
        case 'item':
            if (!target || !value) {
                await message.reply('Usage: !cheat item @player dragon_sword 5');
                return;
            }
            const itemTarget = extractPlayerId(args[2], message);
            const itemName = args[3];
            const itemQty = parseInt(args[4]) || 1;
            
            if (itemTarget && players[itemTarget]) {
                players[itemTarget].inventory[itemName] = (players[itemTarget].inventory[itemName] || 0) + itemQty;
                savePlayers();
                await message.reply(`🎁 Gave ${itemQty}x ${itemName} to player`);
            }
            break;
            
        case 'heal':
            const healTarget = target ? extractPlayerId(target, message) : extractPlayerIdFromMessage(message);
            if (healTarget && players[healTarget]) {
                players[healTarget].hp = players[healTarget].maxHp;
                players[healTarget].energy = players[healTarget].maxEnergy;
                players[healTarget].stamina = players[healTarget].maxStamina;
                savePlayers();
                await message.reply(`💖 Fully healed player!\nHP: ${players[healTarget].hp}/${players[healTarget].maxHp}\nEnergy: ${players[healTarget].energy}/${players[healTarget].maxEnergy}`);
            }
            break;
            
        case 'god':
            const godTarget = target ? extractPlayerId(target, message) : extractPlayerIdFromMessage(message);
            if (godTarget && players[godTarget]) {
                players[godTarget].godMode = true;
                players[godTarget].atk *= 10;
                players[godTarget].def *= 10;
                players[godTarget].maxHp *= 10;
                players[godTarget].hp = players[godTarget].maxHp;
                savePlayers();
                await message.reply(`👑 GOD MODE ACTIVATED!\nATK: ${players[godTarget].atk}\nDEF: ${players[godTarget].def}\nHP: ${players[godTarget].hp}`);
            }
            break;
            
        case 'mortal':
            const mortalTarget = target ? extractPlayerId(target, message) : extractPlayerIdFromMessage(message);
            if (mortalTarget && players[mortalTarget]) {
                players[mortalTarget].godMode = false;
                players[mortalTarget].atk = Math.floor(players[mortalTarget].atk / 10);
                players[mortalTarget].def = Math.floor(players[mortalTarget].def / 10);
                players[mortalTarget].maxHp = Math.floor(players[mortalTarget].maxHp / 10);
                players[mortalTarget].hp = Math.min(players[mortalTarget].hp, players[mortalTarget].maxHp);
                savePlayers();
                await message.reply(`😇 GOD MODE DEACTIVATED\nPlayer returned to mortal form`);
            }
            break;
            
        case 'players':
            let playerList = `📊 REGISTERED PLAYERS: ${Object.keys(players).length}\n\n`;
            Object.entries(players).forEach(([id, player], index) => {
                playerList += `${index + 1}. ${id}\n`;
                playerList += `   Lv.${player.level} | Gold: ${player.gold} | HP: ${player.hp}/${player.maxHp}\n`;
                if (player.godMode) playerList += `   👑 GOD MODE\n`;
                playerList += `\n`;
            });
            await message.reply(playerList);
            break;
            
        case 'broadcast':
            const broadcastMsg = args.slice(2).join(' ');
            if (!broadcastMsg) {
                await message.reply('Usage: !cheat broadcast <message>');
                return;
            }
            
            let broadcastCount = 0;
            for (const playerId of Object.keys(players)) {
                try {
                    await client.sendMessage(playerId + '@c.us', 
                        `📢 *ADMIN BROADCAST*\n\n${broadcastMsg}\n\n- System Admin`);
                    broadcastCount++;
                } catch (err) {
                    console.log(`Failed to send to ${playerId}:`, err.message);
                }
            }
            await message.reply(`✅ Broadcast sent to ${broadcastCount} players`);
            break;
            
        case 'reset':
            const resetTarget = target ? extractPlayerId(target, message) : extractPlayerIdFromMessage(message);
            if (resetTarget && players[resetTarget]) {
                const playerName = players[resetTarget].name;
                delete players[resetTarget];
                savePlayers();
                await message.reply(`♻️ Reset data for player: ${playerName}`);
            }
            break;
            
        case 'spawnboss':
            const bossTypes = ["Dragon", "Demon Lord", "Titan", "Leviathan", "Phoenix"];
            const randomBoss = bossTypes[Math.floor(Math.random() * bossTypes.length)];
            const bossHP = 5000 + Math.floor(Math.random() * 5000);
            const bossReward = 1000 + Math.floor(Math.random() * 2000);
            
            await message.reply(`🐉 *WILD BOSS APPEARED!*\n\n` +
                `👹 ${randomBoss}\n` +
                `❤️ HP: ${bossHP}\n` +
                `💰 Reward: ${bossReward} Gold\n\n` +
                `⚔️ Attack with !rpg boss`);
            break;
            
        case 'event':
            const events = [
                "🔥 DOUBLE EXP WEEKEND - All EXP x2!",
                "💰 GOLD RUSH - Monster gold x3!",
                "🎁 ITEM BONANZA - Drop rate increased!",
                "⚔️ PvP TOURNAMENT - Join for huge rewards!",
                "🐉 BOSS INVASION - Boss spawn rate x5!"
            ];
            const randomEvent = events[Math.floor(Math.random() * events.length)];
            
            // Broadcast to all players
            for (const playerId of Object.keys(players)) {
                try {
                    await client.sendMessage(playerId + '@c.us', 
                        `🎪 *SPECIAL EVENT STARTED!*\n\n${randomEvent}\n\nDuration: 24 hours`);
                } catch (err) {}
            }
            
            await message.reply(`🎉 Event started: ${randomEvent}`);
            break;
            
        case 'lottery':
            const lotteryTarget = target ? extractPlayerId(target, message) : extractPlayerIdFromMessage(message);
            if (lotteryTarget && players[lotteryTarget]) {
                const jackpot = 1000000;
                players[lotteryTarget].gold += jackpot;
                savePlayers();
                
                await message.reply(`🎰 JACKPOT FORCED!\n\n` +
                    `💰 ${lotteryTarget} won ${jackpot.toLocaleString()} Gold!\n` +
                    `🎉 Congratulations!`);
            }
            break;
            
        case 'db':
            const dbStats = {
                totalPlayers: Object.keys(players).length,
                totalGold: Object.values(players).reduce((sum, p) => sum + p.gold, 0),
                totalLevels: Object.values(players).reduce((sum, p) => sum + p.level, 0),
                avgLevel: Object.values(players).length > 0 ? 
                    Math.round(Object.values(players).reduce((sum, p) => sum + p.level, 0) / Object.values(players).length) : 0,
                godModePlayers: Object.values(players).filter(p => p.godMode).length
            };
            
            await message.reply(`📊 DATABASE STATS\n\n` +
                `Players: ${dbStats.totalPlayers}\n` +
                `Total Gold: ${dbStats.totalGold.toLocaleString()}\n` +
                `Total Levels: ${dbStats.totalLevels}\n` +
                `Average Level: ${dbStats.avgLevel}\n` +
                `God Mode: ${dbStats.godModePlayers} player(s)`);
            break;
            
        case 'backup':
            const backupFile = `./data/backup_${Date.now()}.json`;
            fs.writeFileSync(backupFile, JSON.stringify(players, null, 2));
            await message.reply(`💾 Backup created: ${backupFile}\nTotal players: ${Object.keys(players).length}`);
            break;
            
        case 'shutdown':
            await message.reply('🔴 Shutting down bot in 3 seconds...');
            setTimeout(() => {
                console.log('Bot shutdown by owner');
                process.exit(0);
            }, 3000);
            break;
            
        case 'restart':
            await message.reply('🔄 Restarting bot...');
            setTimeout(() => {
                console.log('Bot restarting...');
                process.exit(1); // Will be restarted by PM2 or script
            }, 2000);
            break;
            
        default:
            await message.reply(`❌ Unknown cheat command. Type !cheat menu for list.`);
    }
}

// Helper function to extract player ID
function extractPlayerId(input, message) {
    if (input.startsWith('@')) {
        // Extract from mention (simplified)
        const mentioned = message.mentionedIds;
        if (mentioned && mentioned.length > 0) {
            return mentioned[0].split('@')[0];
        }
    }
    // If input is already a number
    if (/^\d+$/.test(input)) {
        return input;
    }
    return null;
}

function extractPlayerIdFromMessage(message) {
    return message.from.split('@')[0];
}

// ==================== MAIN MESSAGE HANDLER ====================
client.on('message', async (message) => {
    const text = message.body.toLowerCase();
    const sender = message.from;
    
    // CHEAT COMMANDS (Owner only)
    if (text.startsWith('!cheat')) {
        const args = text.split(' ');
        await handleCheatCommand(message, args);
        return;
    }
    
    // RPG COMMANDS (Regular players)
    if (text.startsWith('!rpg')) {
        // ... (kode RPG biasa dari versi sebelumnya) ...
        const args = text.split(' ');
        const command = args[1] || 'help';
        const userId = sender.split('@')[0];
        
        // Initialize player jika belum ada
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
                gold: 100,
                energy: 100,
                maxEnergy: 100,
                inventory: {
                    potion: 5,
                    sword: 0
                },
                godMode: false
            };
            savePlayers();
        }
        
        const player = players[userId];
        
        // Handle RPG commands
        switch(command) {
            case 'start':
                await message.reply(`🎮 RPG STARTED!\nLevel: ${player.level}\nGold: ${player.gold}\nHP: ${player.hp}/${player.maxHp}`);
                break;
                
            case 'profile':
                let profile = `📊 PROFILE\n`;
                profile += `Level: ${player.level}\n`;
                profile += `Gold: ${player.gold}\n`;
                profile += `HP: ${player.hp}/${player.maxHp}\n`;
                profile += `ATK: ${player.atk}\n`;
                profile += `DEF: ${player.def}\n`;
                if (player.godMode) profile += `👑 GOD MODE: ACTIVE\n`;
                await message.reply(profile);
                break;
                
            case 'hunt':
                if (player.energy < 10) {
                    await message.reply('⚡ Not enough energy!');
                    return;
                }
                
                player.energy -= 10;
                const goldEarned = player.godMode ? 
                    1000 + Math.floor(Math.random() * 500) : 
                    50 + Math.floor(Math.random() * 50);
                    
                player.gold += goldEarned;
                
                let huntMsg = `⚔️ HUNT COMPLETE!\n`;
                huntMsg += `💰 +${goldEarned} Gold\n`;
                if (player.godMode) huntMsg += `👑 GOD MODE BONUS!\n`;
                huntMsg += `⚡ Energy: ${player.energy}/${player.maxEnergy}`;
                
                savePlayers();
                await message.reply(huntMsg);
                break;
                
            case 'help':
                let helpMsg = `🎮 RPG COMMANDS\n\n`;
                helpMsg += `!rpg start - Start game\n`;
                helpMsg += `!rpg profile - Your stats\n`;
                helpMsg += `!rpg hunt - Hunt monsters\n`;
                helpMsg += `!rpg shop - Buy items\n`;
                helpMsg += `!rpg inventory - View items\n\n`;
                
                if (sender === OWNER_ID) {
                    helpMsg += `👑 OWNER COMMANDS:\n`;
                    helpMsg += `!cheat menu - Cheat commands\n`;
                }
                
                await message.reply(helpMsg);
                break;
                
            default:
                await message.reply(`Type !rpg help for commands`);
        }
    }
});

// Start bot
client.initialize();