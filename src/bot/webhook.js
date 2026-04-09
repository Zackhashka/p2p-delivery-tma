/**
 * Webhook setup utility for Telegram bot
/ 
const express = require('express');
const { Bot } = require('telegram-bot');

const router = express.Router();

router.post('/webhook', () => {
  // handle updates from telegram
});

module.exports = router;