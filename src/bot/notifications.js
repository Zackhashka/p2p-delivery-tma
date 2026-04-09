const { Bot } = require('telegram-bot');
const bot = new Bot(process.env.TELEGRAM_TOKEN);

async function sendReceiverStatus(userId, info) {
  await bot.client.sendMessage({
    chat_id: userId,
    text: info
  });
}

module.exports = { sendReceiverStatus };