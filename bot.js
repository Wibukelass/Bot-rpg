# Buat file bot.js sederhana dulu
cat > bot.js << 'EOF'
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🚀 Starting Bot...');

const client = new Client({
    puppeteer: {
        executablePath: '/data/data/com.termux/files/usr/bin/chromium',
        args: ['--no-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('\n📱 SCAN QR:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ BOT READY!');
});

client.on('message', async (msg) => {
    if (msg.body === 'ping') {
        await msg.reply('pong');
    }
});

client.initialize();
EOF