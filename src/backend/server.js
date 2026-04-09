import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { config } from './config/config.js';
import { protectedRoutes } from './middleware/auth.js';
import { errorHandler } from './utils/errors.js';
import { userRoutes } from './routes/users.js';
import { tripRoutes } from './routes/trips.js';
import { requestRoutes } from './routes/requests.js';
import { dealRoutes } from './routes/deals.js';
import { matchingRoutes } from './routes/matching.js';

const prisma = new PrismaClient({
  log: config.server.env === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

const fastify = Fastify({
  logger: {
    level: config.server.env === 'development' ? 'debug' : 'info'
  }
});

// Decorate fastify with prisma
fastify.decorate('prisma', prisma);

/**
 * Register plugins and routes
 */
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: '*',
    credentials: true
  });

  // Auth middleware
  protectedRoutes(fastify);

  // Global error handler
  fastify.setErrorHandler(errorHandler);

  // Health check (no auth required)
  fastify.get('/api/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register route modules
  await fastify.register(userRoutes);
  await fastify.register(tripRoutes);
  await fastify.register(requestRoutes);
  await fastify.register(dealRoutes);
  await fastify.register(matchingRoutes);

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      error: 'Route not found',
      code: 'NOT_FOUND',
      path: request.url
    });
  });
}

/**
 * Start server
 */
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Connected to PostgreSQL');

    // Register plugins and routes
    await registerPlugins();

    // Start listening
    await fastify.listen({ port: config.server.port, host: '0.0.0.0' });

    console.log(`
╔══════════════════════════════════════════════╗
║  P2P Delivery TMA Backend Started            ║
║  Environment: ${config.server.env.padEnd(29)}║
║  Port: ${config.server.port.toString().padEnd(36)}║
║  Database: PostgreSQL (Prisma)               ║
╚══════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown
 */
async function shutdown() {
  console.log('Shutting down...');
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
start();

export { prisma };
export default fastify;
