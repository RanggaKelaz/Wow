const { Telegraf } = require('telegraf');
const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const app = express();

// === GANTI DENGAN PUNYAMU ===
const BOT_TOKEN = process.env.TELEGRAM_TOKEN || '7819331162:AAHXHf9a47ReiMH-Mj8xQ7Pj-mo0qAhNB50';
const ADMIN_ID = process.env.ADMIN_ID || '-1002840111547';
const bot = new Telegraf(BOT_TOKEN);

let lastStockData = null;

// ==== WebSocket Grow a Garden ====
function growagarden() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://ws.growagardenpro.com', [], {
      headers: {
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        connection: 'Upgrade',
        host: 'ws.growagardenpro.com',
        origin: 'https://growagardenpro.com',
        pragma: 'no-cache',
        'sec-websocket-extensions': 'permessage-deflate; client_max_window_bits',
        'sec-websocket-key': 'TBIaQ04Blb4aAA2qgBCZdA==',
        'sec-websocket-version': '13',
        upgrade: 'websocket',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
      }
    });

    ws.onopen = () => console.log('✅ WebSocket Connected');

    ws.onmessage = (event) => {
      try {
        resolve(JSON.parse(event.data));
      } catch {
        resolve(event.data);
      }
      ws.close();
    };

    ws.onerror = reject;
    ws.onclose = () => console.log('❌ WebSocket Closed');
  });
}

// ==== Format Pesan Telegram ====
function buildStockMessage(data) {
  let message = `🌱 *Grow A Garden Stock Update*\n\n`;

  for (const category in data) {
    const items = data[category];
    message += `🧺 *${capitalize(category)}*\n`;

    for (const item of items) {
      const emoji = rarityEmoji(item.rarity);
      message += `- ${emoji} *${item.name}*: ${item.stock}\n`;
    }

    message += `\n`;
  }

  return message;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function rarityEmoji(rarity) {
  switch (rarity.toLowerCase()) {
    case 'common': return '⚪️';
    case 'uncommon': return '🟢';
    case 'rare': return '🔵';
    case 'divine': return '🟣';
    case 'prismatic': return '🌈';
    default: return '❔';
  }
}

// ==== Check Stock & Notify ====
async function checkAndNotify() {
  try {
    const data = await growagarden();

    const currentData = JSON.stringify(data);
    if (currentData !== lastStockData) {
      const message = buildStockMessage(data);
      await bot.telegram.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
      lastStockData = currentData;
      console.log('📤 Notifikasi terkirim ke Telegram.');
    } else {
      console.log('🔁 Tidak ada perubahan stock.');
    }
  } catch (err) {
    console.error('❌ Gagal ambil data:', err.message);
  }
}

// ==== Ping Diri Sendiri Tiap 5 Menit ====
setInterval(() => {
  const url = process.env.SELF_URL || 'http://localhost:' + (process.env.PORT || 3000);
  fetch(url).then(() => console.log('💓 Ping diri sendiri'));
}, 5 * 60 * 1000);

// ==== Web server untuk di-ping dari luar ====
app.get("/", (req, res) => {
  res.send("✅ Grow Garden Bot is running.");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server aktif.");
});

// ==== Interval Cek Stock ====
setInterval(checkAndNotify, 5 * 60 * 1000); // 5 menit
checkAndNotify(); // Run awal

// ==== Start Telegram Bot ====
bot.launch();
console.log('🚀 Bot Telegram aktif...');
