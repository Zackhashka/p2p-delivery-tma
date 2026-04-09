/**
 * Webhook setup utility for Telegram bot
 * Usage:
 *   node webhook.js set   - Set webhook URL
 *   node webhook.js delete - Remove webhook and switch to polling
 */

import "dotenv/config";
import https from "https";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is not set in .env file");
  process.exit(1);
}

/**
 * Make HTTPS request to Telegram Bot API
 * @param {string} method - API method name
 * @param {Object} data - Request data
 * @returns {Promise<Object>}
 */
function telegramRequest(method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.telegram.org",
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${body}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

/**
 * Set webhook for the bot
 */
async function setWebhook() {
  if (!WEBHOOK_URL) {
    console.error("❌ WEBHOOK_URL is not set in .env file");
    process.exit(1);
  }

  try {
    console.log(`🔗 Setting webhook to: ${WEBHOOK_URL}`);

    const response = await telegramRequest("setWebhook", {
      url: WEBHOOK_URL,
      allowed_updates: ["message", "callback_query", "inline_query"],
    });

    if (response.ok) {
      console.log("✅ Webhook set successfully!");
      console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);

      // Get webhook info
      const infoResponse = await telegramRequest("getWebhookInfo", {});
      if (infoResponse.ok) {
        const info = infoResponse.result;
        console.log(`\n📊 Webhook Info:`);
        console.log(`   URL: ${info.url}`);
        console.log(`   Pending updates: ${info.pending_update_count}`);
      }
    } else {
      console.error("❌ Failed to set webhook:", response.description);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error setting webhook:", error.message);
    process.exit(1);
  }
}

/**
 * Delete webhook and switch to polling
 */
async function deleteWebhook() {
  try {
    console.log("🗑️  Deleting webhook...");

    const response = await telegramRequest("setWebhook", {
      url: "", // Empty URL deletes webhook
    });

    if (response.ok) {
      console.log("✅ Webhook deleted successfully!");
      console.log("📋 Bot switched to long polling mode");

      // Get webhook info
      const infoResponse = await telegramRequest("getWebhookInfo", {});
      if (infoResponse.ok) {
        console.log("\n📊 Webhook Info:");
        console.log(`   URL: ${infoResponse.result.url || "(not set)"}`);
      }
    } else {
      console.error("❌ Failed to delete webhook:", response.description);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error deleting webhook:", error.message);
    process.exit(1);
  }
}

/**
 * Get webhook info
 */
async function getWebhookInfo() {
  try {
    console.log("📊 Fetching webhook info...\n");

    const response = await telegramRequest("getWebhookInfo", {});

    if (response.ok) {
      const info = response.result;
      console.log("Webhook Information:");
      console.log(`  URL: ${info.url || "(not set - using polling)"}`);
      console.log(`  Pending updates: ${info.pending_update_count}`);

      if (info.ip_address) {
        console.log(`  IP Address: ${info.ip_address}`);
      }

      if (info.last_error_date) {
        const lastError = new Date(info.last_error_date * 1000);
        console.log(`  Last error: ${lastError.toISOString()}`);
        console.log(`  Last error message: ${info.last_error_message}`);
      }
    } else {
      console.error("❌ Failed to get webhook info:", response.description);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error fetching webhook info:", error.message);
    process.exit(1);
  }
}

// Main execution
const command = process.argv[2];

switch (command) {
  case "set":
    setWebhook();
    break;
  case "delete":
    deleteWebhook();
    break;
  case "info":
    getWebhookInfo();
    break;
  default:
    console.log("🤖 Telegram Bot Webhook Manager\n");
    console.log("Usage:");
    console.log("  node webhook.js set    - Set webhook URL");
    console.log("  node webhook.js delete - Delete webhook (switch to polling)");
    console.log("  node webhook.js info   - Get webhook information");
    console.log("\nMake sure WEBHOOK_URL is set in .env file.");
    process.exit(0);
}
