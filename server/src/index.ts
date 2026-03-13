import Fastify from 'fastify';
import path from 'path';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import authRoutes from './routes/auth.js';
import boardsRoutes from './routes/boards.js';
import statusesRoutes from './routes/statuses.js';
import cardsRoutes from './routes/cards.js';
import statsRoutes from './routes/stats.js';
import tagsRoutes from './routes/tags.js';
import dependenciesRoutes from './routes/dependencies.js';
import calendarRoutes from './routes/calendar.js';

dotenv.config();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = process.env.PUBLIC_DIR ? path.resolve(process.env.PUBLIC_DIR) : null;

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

fastify.get('/health', async () => ({ status: 'ok' }));

await fastify.register(authRoutes, { prefix: '/api' });
await fastify.register(boardsRoutes, { prefix: '/api' });
await fastify.register(statusesRoutes, { prefix: '/api' });
await fastify.register(cardsRoutes, { prefix: '/api' });
await fastify.register(statsRoutes, { prefix: '/api' });
await fastify.register(tagsRoutes, { prefix: '/api' });
await fastify.register(dependenciesRoutes, { prefix: '/api' });
await fastify.register(calendarRoutes, { prefix: '/api' });

if (PUBLIC_DIR) {
  await fastify.register(fastifyStatic, { root: PUBLIC_DIR });
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
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
