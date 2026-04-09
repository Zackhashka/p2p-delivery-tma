/**
 * Notification service for P2P Delivery bot
 * Handles all user notifications via Telegram messages
 */

let bot = null;

/**
 * Initialize notifications with bot instance
 * @param {Bot} botInstance - grammY Bot instance
 */
export function initNotifications(botInstance) {
  bot = botInstance;
}

/**
 * Send notification about new match found
 * @param {string} userId - Telegram user ID
 * @param {Object} matchData - Match/deal information
 * @param {string} matchData.dealId - Deal ID
 * @param {string} matchData.type - 'trip' or 'request'
 * @param {string} matchData.title - Deal title/description
 * @param {Object} keyboards - Keyboard configuration
 * @returns {Promise}
 */
export async function notifyNewMatch(userId, matchData, keyboards) {
  if (!bot) {
    console.error("Notifications not initialized. Call initNotifications() first.");
    return;
  }

  try {
    const typeLabel = matchData.type === "trip" ? "🚗 Trip" : "📦 Request";
    const text = `<b>✨ New match found!</b>\n\nA new ${matchData.type} matches your preferences:\n\n<b>${typeLabel}</b>\n${matchData.title}`;

    const keyboard = keyboards.dealKeyboard(matchData.dealId, process.env.WEBAPP_URL);

    await bot.api.sendMessage(userId, text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });

    console.log(`[NOTIFICATION] New match sent to user ${userId} - Deal ${matchData.dealId}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send new match notification: ${error.message}`);
  }
}

/**
 * Send notification about deal status change
 * @param {string} userId - Telegram user ID
 * @param {Object} dealData - Deal information
 * @param {string} dealData.dealId - Deal ID
 * @param {string} dealData.status - New status (accepted, in_progress, completed, cancelled, etc.)
 * @param {string} dealData.counterpartyName - Name of other user
 * @param {Object} keyboards - Keyboard configuration
 * @returns {Promise}
 */
export async function notifyStatusChange(userId, dealData, keyboards) {
  if (!bot) {
    console.error("Notifications not initialized. Call initNotifications() first.");
    return;
  }

  try {
    const statusMessages = {
      accepted: "✅ accepted",
      in_progress: "🚚 is in progress",
      completed: "🎉 completed successfully",
      cancelled: "❌ cancelled",
      rejected: "👋 was declined",
      driver_arrived: "📍 driver has arrived",
      recipient_confirmed: "✔️ recipient confirmed",
    };

    const statusText = statusMessages[dealData.status] || dealData.status;
    const emoji = dealData.status === "completed" ? "🎉" : "📢";

    const text = `<b>${emoji} Deal Update</b>\n\nYour deal with <b>${dealData.counterpartyName}</b> ${statusText}.\n\nTap below to see details.`;

    const keyboard = keyboards.actionKeyboard(dealData.dealId, process.env.WEBAPP_URL);

    await bot.api.sendMessage(userId, text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });

    console.log(`[NOTIFICATION] Status change sent to user ${userId} - Status: ${dealData.status}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send status change notification: ${error.message}`);
  }
}

/**
 * Send notification about new trip/request to subscribed users
 * @param {Array<string>} subscribedUserIds - Array of user IDs to notify
 * @param {Object} tripData - Trip/request information
 * @param {string} tripData.tripId - Trip/request ID
 * @param {string} tripData.type - 'trip' or 'request'
 * @param {string} tripData.route - Route description (e.g., "Moscow → Tver")
 * @param {string} tripData.payload - Payload description
 * @param {Object} keyboards - Keyboard configuration
 * @returns {Promise}
 */
export async function notifyNewTrip(subscribedUserIds, tripData, keyboards) {
  if (!bot) {
    console.error("Notifications not initialized. Call initNotifications() first.");
    return;
  }

  if (!subscribedUserIds || subscribedUserIds.length === 0) {
    console.log("[NOTIFICATION] No subscribed users to notify");
    return;
  }

  try {
    const typeLabel = tripData.type === "trip" ? "🚗 New Trip" : "📦 New Request";
    const text = `<b>${typeLabel}</b>\n\n<b>Route:</b> ${tripData.route}\n<b>Payload:</b> ${tripData.payload}`;

    const keyboard = keyboards.tripKeyboard(tripData.tripId, process.env.WEBAPP_URL);

    let successCount = 0;
    let failureCount = 0;

    for (const userId of subscribedUserIds) {
      try {
        await bot.api.sendMessage(userId, text, {
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
        successCount++;
      } catch (error) {
        console.warn(`[WARN] Failed to notify user ${userId}: ${error.message}`);
        failureCount++;
      }
    }

    console.log(
      `[NOTIFICATION] New trip notification: ${successCount} sent, ${failureCount} failed (${tripData.tripId})`
    );
  } catch (error) {
    console.error(`[ERROR] Failed to send new trip notification: ${error.message}`);
  }
}

/**
 * Send a generic message with error handling
 * @param {string} userId - Telegram user ID
 * @param {string} text - Message text (can include HTML)
 * @param {Object} options - Additional sendMessage options
 * @returns {Promise}
 */
export async function sendMessage(userId, text, options = {}) {
  if (!bot) {
    console.error("Notifications not initialized. Call initNotifications() first.");
    return;
  }

  try {
    const defaultOptions = {
      parse_mode: "HTML",
      ...options,
    };

    await bot.api.sendMessage(userId, text, defaultOptions);
    console.log(`[MESSAGE] Sent to user ${userId}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send message to user ${userId}: ${error.message}`);
  }
}

export default {
  initNotifications,
  notifyNewMatch,
  notifyStatusChange,
  notifyNewTrip,
  sendMessage,
};
