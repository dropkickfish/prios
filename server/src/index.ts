import Fastify from 'fastify';
import path from 'path';
import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import authRoutes from './routes/auth.js';
import boardsRoutes from './routes/boards.js';
import statusesRoutes from './routes/statuses.js';
import cardsRoutes from './routes/cards.js';
import statsRoutes from './routes/stats.js';
import tagsRoutes from './routes/tags.js';
import dependenciesRoutes from './routes/dependencies.js';
import calendarRoutes from './routes/calendar.js';
import attachmentsRoutes from './routes/attachments.js';
import { createStorage } from './storage/index.js';
import { sweepOrphanedFiles } from './storage/sweep.js';
import authMiddleware from './middleware/auth.js';
import apiKeyRoutes from './routes/apiKey.js';

dotenv.config();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = process.env.PUBLIC_DIR ? path.resolve(process.env.PUBLIC_DIR) : null;
const storage = createStorage();

const trustProxy = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';
const fastify = Fastify({ logger: true, trustProxy });

await fastify.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Prios API',
      description: 'Task management API for Prios focus engine',
      version: '1.0.0',
    },
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list' },
});

await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

await fastify.register(fastifyMultipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

await fastify.register(fastifyCookie);
await fastify.register(fastifyJwt, {
  secret: process.env.AUTH_SECRET ?? 'dev-secret-change-in-production',
});

// Serve uploaded files when using local storage
const useLocalStorage = process.env.STORAGE_TYPE !== 's3';
if (useLocalStorage) {
  const uploadRoot = path.resolve(process.env.STORAGE_LOCAL_PATH ?? './data/uploads');
  await fs.mkdir(uploadRoot, { recursive: true });
  await fastify.register(fastifyStatic, {
    root: uploadRoot,
    prefix: '/uploads/',
  });
}

fastify.get('/health', async () => ({ status: 'ok' }));

await fastify.register(authMiddleware);

await fastify.register(authRoutes, { prefix: '/api' });
await fastify.register(boardsRoutes, { prefix: '/api' });
await fastify.register(statusesRoutes, { prefix: '/api' });
await fastify.register(cardsRoutes, { prefix: '/api', storage });
await fastify.register(statsRoutes, { prefix: '/api' });
await fastify.register(tagsRoutes, { prefix: '/api' });
await fastify.register(dependenciesRoutes, { prefix: '/api' });
await fastify.register(calendarRoutes, { prefix: '/api' });
await fastify.register(attachmentsRoutes, { prefix: '/api', storage });
await fastify.register(apiKeyRoutes, { prefix: '/api' });

if (PUBLIC_DIR) {
  await fastify.register(fastifyStatic, {
    root: PUBLIC_DIR,
    decorateReply: !useLocalStorage, // avoid double-decoration if uploads static was registered first
  });
  fastify.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api') && !request.url.startsWith('/health')) {
      return reply.sendFile('index.html');
    }
    reply.code(404).send();
  });
}

const closeGracefully = async (signal: string) => {
  fastify.log.info(`Received ${signal}. Closing fastify...`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  // Non-blocking orphan sweep on startup
  sweepOrphanedFiles(storage).catch(err =>
    fastify.log.error({ err }, '[sweep] Orphan sweep failed')
  );
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
