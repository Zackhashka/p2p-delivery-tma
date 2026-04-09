import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/p2p_delivery'
  },
  telegram: {
    botToken: process.env.BOT_TOKEN || '',
    webappUrl: process.env.WEBAPP_URL || 'http://localhost:3000'
  },
  server: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development'
  }
};

if (!config.telegram.botToken) {
  console.warn('⚠️ BOT_TOKEN not set. Telegram auth will be disabled.');
}
