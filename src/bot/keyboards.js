import { InlineKeyboard, Keyboard } from "grammy";

/**
 * Main menu keyboard with "Open App" web app button
 * @param {string} webAppUrl - URL to the mini app
 * @returns {InlineKeyboard}
 */
export function mainMenuKeyboard(webAppUrl) {
  return new InlineKeyboard().webApp("🚀 Open App", webAppUrl);
}

/**
 * Trip view keyboard with trip details button and share option
 * @param {string} tripId - ID of the trip
 * @param {string} webAppUrl - Base URL of the mini app
 * @returns {InlineKeyboard}
 */
export function tripKeyboard(tripId, webAppUrl) {
  const viewUrl = `${webAppUrl}?trip=${tripId}`;

  return new InlineKeyboard()
    .webApp("📍 View Trip", viewUrl)
    .row()
    .switchInline("📤 Share", `trip_${tripId}`);
}

/**
 * Deal/Match keyboard with open deal button
 * @param {string} dealId - ID of the deal
 * @param {string} webAppUrl - Base URL of the mini app
 * @returns {InlineKeyboard}
 */
export function dealKeyboard(dealId, webAppUrl) {
  const viewUrl = `${webAppUrl}?deal=${dealId}`;

  return new InlineKeyboard().webApp("💼 Open Deal", viewUrl);
}

/**
 * Request view keyboard with request details button and share option
 * @param {string} requestId - ID of the request
 * @param {string} webAppUrl - Base URL of the mini app
 * @returns {InlineKeyboard}
 */
export function requestKeyboard(requestId, webAppUrl) {
  const viewUrl = `${webAppUrl}?request=${requestId}`;

  return new InlineKeyboard()
    .webApp("📦 View Request", viewUrl)
    .row()
    .switchInline("📤 Share", `request_${requestId}`);
}

/**
 * Status change keyboard with action buttons
 * @param {string} dealId - ID of the deal
 * @param {string} webAppUrl - Base URL of the mini app
 * @returns {InlineKeyboard}
 */
export function actionKeyboard(dealId, webAppUrl) {
  const viewUrl = `${webAppUrl}?deal=${dealId}`;

  return new InlineKeyboard()
    .webApp("View & Take Action", viewUrl)
    .row()
    .url("Support", "https://t.me/support");
}

export default {
  mainMenuKeyboard,
  tripKeyboard,
  dealKeyboard,
  requestKeyboard,
  actionKeyboard,
};
