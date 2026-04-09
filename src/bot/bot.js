import "dotenv/config";
import { Bot } from "grammy";
import prisma from "./models.js";
import { mainMenuKeyboard, tripKeyboard, requestKeyboard } from "./keyboards.js";
import { initNotifications } from "./notifications.js";

// Validate required environment variables
const requiredEnvVars = ["BOT_TOKEN", "DATABASE_URL", "WEBAPP_URL"];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

// Initialize bot
const bot = new Bot(process.env.BOT_TOKEN);

// Initialize notifications with bot instance
initNotifications(bot);

// Connect to PostgreSQL
async function connectDB() {
  try {
    await prisma.$connect();
    console.log("✅ Connected to PostgreSQL");
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:", error.message);
    process.exit(1);
  }
}

// ==================== Command Handlers ====================

/**
 * /start command - Welcome message and user registration
 */
bot.command("start", async (ctx) => {
  const userId = BigInt(ctx.from.id);
  const firstName = ctx.from.first_name || "User";
  const username = ctx.from.username || "";

  console.log(`[COMMAND] /start from user ${userId} (${firstName})`);

  try {
    let user = await prisma.user.findUnique({ where: { tg_id: userId } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          tg_id: userId,
          first_name: firstName,
          username,
        },
      });
      console.log(`[USER] New user registered: ${userId}`);

      const welcomeText = `<b>👋 Welcome to P2P Delivery, ${firstName}!</b>

Send packages across borders faster and cheaper. Connect with travelers heading your way or earn money with spare luggage space.

<b>How it works:</b>
• Post a delivery request or available luggage space
• Get matched with compatible partners
• Complete deliveries and earn money

Ready to get started?`;

      await ctx.reply(welcomeText, {
        parse_mode: "HTML",
        reply_markup: mainMenuKeyboard(process.env.WEBAPP_URL),
      });
    } else {
      const welcomeBackText = `<b>Welcome back, ${firstName}!</b>

You have:
• <b>${user.delivery_count}</b> deliveries completed
• <b>${user.reviews_count}</b> reviews
• <b>⭐ ${user.rating.toFixed(1)}</b> rating`;

      await ctx.reply(welcomeBackText, {
        parse_mode: "HTML",
        reply_markup: mainMenuKeyboard(process.env.WEBAPP_URL),
      });
    }
  } catch (error) {
    console.error(`[ERROR] /start handler error: ${error.message}`);
    await ctx.reply("⚠️ Something went wrong. Please try again.", {
      parse_mode: "HTML",
    });
  }
});

/**
 * /help command
 */
bot.command("help", async (ctx) => {
  console.log(`[COMMAND] /help from user ${ctx.from.id}`);

  const helpText = `<b>📚 P2P Delivery Help</b>

<b>What is this?</b>
P2P Delivery connects people who need to send packages with travelers heading the same way.

<b>Commands:</b>
/start - Open the main menu
/help - Show this message
/mytrips - View your active trips
/myrequests - View your active requests

<b>Features:</b>
🚗 <b>Post a Trip</b> - Have spare luggage space? Offer it and earn money
📦 <b>Send a Package</b> - Need delivery? Post a request and get matched
💬 <b>Chat & Rate</b> - Communicate with partners and leave ratings
⭐ <b>Build Trust</b> - Your rating helps you get better matches

<b>Support:</b>
Having issues? Contact @ptp_delivery_support`;

  await ctx.reply(helpText, {
    parse_mode: "HTML",
    reply_markup: mainMenuKeyboard(process.env.WEBAPP_URL),
  });
});

/**
 * /mytrips command
 */
bot.command("mytrips", async (ctx) => {
  const userId = BigInt(ctx.from.id);
  console.log(`[COMMAND] /mytrips from user ${userId}`);

  try {
    const trips = await prisma.trip.findMany({
      where: {
        traveler_id: userId,
        status: { in: ["active", "completed"] },
      },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    if (trips.length === 0) {
      await ctx.reply("📭 You don't have any active trips yet.\n\nCreate your first trip in the app!", {
        parse_mode: "HTML",
        reply_markup: mainMenuKeyboard(process.env.WEBAPP_URL),
      });
      return;
    }

    let tripsText = "<b>🚗 Your Trips</b>\n\n";

    for (const trip of trips) {
      const available = trip.capacity_kg - trip.used_capacity_kg;
      tripsText += `<b>${trip.from_city} → ${trip.to_city}</b>\n`;
      tripsText += `Available: ${available}/${trip.capacity_kg} kg\n`;
      tripsText += `Price: ${trip.price_per_kg} ${trip.currency}/kg\n`;
      tripsText += `Status: ${trip.status}\n`;
      tripsText += `\n`;
    }

    tripsText += "\n💡 Tap the button below to manage your trips:";

    await ctx.reply(tripsText, {
      parse_mode: "HTML",
      reply_markup: mainMenuKeyboard(process.env.WEBAPP_URL),
    });
  } catch (error) {
    console.error(`[ERROR] /mytrips handler error: ${error.message}`);
    await ctx.reply("⚠️ Failed to load trips. Please try again.", {
      parse_mode: "HTML",
    });
  }
});

/**
 * /myrequests command
 */
bot.command("myrequests", async (ctx) => {
  const userId = BigInt(ctx.from.id);
  console.log(`[COMMAND] /myrequests from user ${userId}`);

  try {
    const requests = await prisma.request.findMany({
      where: {
        sender_id: userId,
        status: { in: ["open", "matched"] },
      },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    if (requests.length === 0) {
      await ctx.reply("📭 You don't have any active requests yet.\n\nCreate your first request in the app!", {
        parse_mode: "HTML",
        reply_markup: mainMenuKeyboard(process.env.WEBAPP_URL),
      });
      return;
    }

    let requestsText = "<b>📦 Your Requests</b>\n\n";

    for (const request of requests) {
      requestsText += `<b>${request.from_city} → ${request.to_city}</b>\n`;
      requestsText += `Weight: ${request.weight_kg} kg | Type: ${request.parcel_type}\n`;
      requestsText += `Reward: ${request.reward_amount} ${request.reward_currency}\n`;
      requestsText += `Status: ${request.status}\n`;
      requestsText += `\n`;
    }

    requestsText += "\n💡 Tap the button below to manage your requests:";

    await ctx.reply(requestsText, {
      parse_mode: "HTML",
      reply_markup: mainMenuKeyboard(process.env.WEBAPP_URL),
    });
  } catch (error) {
    console.error(`[ERROR] /myrequests handler error: ${error.message}`);
    await ctx.reply("⚠️ Failed to load requests. Please try again.", {
      parse_mode: "HTML",
    });
  }
});

// ==================== Inline Mode ====================

bot.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query;
  const userId = BigInt(ctx.from.id);

  console.log(`[INLINE] Query from user ${userId}: "${query}"`);

  try {
    let trips = [];
    let requests = [];

    if (!query) {
      trips = await prisma.trip.findMany({
        where: { traveler_id: userId, status: "active" },
        orderBy: { created_at: "desc" },
        take: 5,
      });

      requests = await prisma.request.findMany({
        where: { sender_id: userId, status: { in: ["open", "matched"] } },
        orderBy: { created_at: "desc" },
        take: 5,
      });
    } else if (query.startsWith("trip_")) {
      const tripId = query.substring(5);
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (trip && trip.traveler_id === userId) trips = [trip];
    } else if (query.startsWith("request_")) {
      const requestId = query.substring(8);
      const req = await prisma.request.findUnique({ where: { id: requestId } });
      if (req && req.sender_id === userId) requests = [req];
    }

    const results = [];

    for (const trip of trips) {
      const title = `🚗 ${trip.from_city} → ${trip.to_city}`;
      const description = `${trip.capacity_kg}kg capacity • ${trip.price_per_kg} ${trip.currency}/kg`;

      results.push({
        type: "article",
        id: `trip_${trip.id}`,
        title,
        description,
        input_message_content: {
          message_text: `<b>${title}</b>\n\n${description}\n\n${trip.description}`,
          parse_mode: "HTML",
        },
        reply_markup: tripKeyboard(trip.id, process.env.WEBAPP_URL),
      });
    }

    for (const request of requests) {
      const title = `📦 ${request.from_city} → ${request.to_city}`;
      const description = `${request.weight_kg}kg • Reward: ${request.reward_amount} ${request.reward_currency}`;

      results.push({
        type: "article",
        id: `request_${request.id}`,
        title,
        description,
        input_message_content: {
          message_text: `<b>${title}</b>\n\n${description}\n\n${request.description}`,
          parse_mode: "HTML",
        },
        reply_markup: requestKeyboard(request.id, process.env.WEBAPP_URL),
      });
    }

    await ctx.answerInlineQuery(results, {
      cache_time: 30,
      is_personal: true,
    });
  } catch (error) {
    console.error(`[ERROR] Inline query error: ${error.message}`);
    await ctx.answerInlineQuery([], { cache_time: 1 });
  }
});

// ==================== Error Handling ====================

bot.catch((error) => {
  console.error("[BOT_ERROR]", error);
});

// ==================== Graceful Shutdown ====================

async function shutdown() {
  console.log("\n🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ==================== Bot Start ====================

async function main() {
  await connectDB();

  if (process.env.WEBHOOK_URL) {
    console.log("🔗 Starting bot in webhook mode...");
    await bot.api.setWebhook(process.env.WEBHOOK_URL);
    console.log(`✅ Webhook set to: ${process.env.WEBHOOK_URL}`);
  } else {
    console.log("⏱️  Starting bot in polling mode...");
    await bot.start({
      onStart: () => {
        console.log("✅ Bot started and listening for messages");
      },
    });
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error.message);
  process.exit(1);
});

export { bot };
