import crypto from 'crypto';
import { config } from '../config/config.js';

/**
 * Validate Telegram Mini App initData using HMAC-SHA256
 * initData format: "field1=value1&field2=value2&hash=..."
 */
export function validateTelegramInitData(initDataString) {
  if (!initDataString) {
    return { valid: false, error: 'initData is empty' };
  }

  try {
    const url = new URLSearchParams(initDataString);
    const hash = url.get('hash');

    if (!hash) {
      return { valid: false, error: 'hash is missing' };
    }

    // Remove hash from data
    url.delete('hash');

    // Sort by keys and create data check string
    const dataCheckString = Array.from(url)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create HMAC
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(config.telegram.botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const isValid = calculatedHash === hash;

    if (!isValid) {
      return { valid: false, error: 'hash verification failed' };
    }

    // Extract user data
    const user = url.get('user');
    const userObj = user ? JSON.parse(user) : null;

    return {
      valid: true,
      user: userObj,
      queryId: url.get('query_id'),
      authDate: parseInt(url.get('auth_date')) || null
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Fastify auth decorator for Telegram Mini App
 * Extracts and validates initData from query parameters
 */
export async function telegramAuthHook(request, reply) {
  const initData = request.query.initData || request.headers['x-init-data'];

  if (!initData) {
    return reply.code(401).send({ error: 'Missing initData' });
  }

  const validation = validateTelegramInitData(initData);

  if (!validation.valid) {
    return reply.code(401).send({ error: 'Invalid initData', detail: validation.error });
  }

  // Attach user info to request
  request.user = {
    tg_id: validation.user?.id,
    first_name: validation.user?.first_name || '',
    last_name: validation.user?.last_name || '',
    username: validation.user?.username || '',
    is_bot: validation.user?.is_bot || false,
    language_code: validation.user?.language_code || '',
    allows_write_to_pm: validation.user?.allows_write_to_pm || false,
    photo_url: validation.user?.photo_url || ''
  };

  request.queryId = validation.queryId;
}

/**
 * Register auth hook to protected routes
 */
export function protectedRoutes(fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    // Only apply to API routes that need protection
    if (request.url.startsWith('/api') && !request.url.startsWith('/api/health')) {
      await telegramAuthHook(request, reply);
    }
  });
}
