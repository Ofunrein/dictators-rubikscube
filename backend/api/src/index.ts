/**
 * index.ts — Server entry point
 *
 * Builds the Fastify app and starts listening on the configured port. This
 * file only wires together buildApp() and the network listener — all
 * middleware and route configuration lives in app.ts.
 *
 * PORT is read from environment config. On startup failure, the process exits
 * with code 1 so container orchestrators detect the crash correctly.
 */
import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp();

async function start(): Promise<void> {
  try {
    await app.listen({
      host: '0.0.0.0',
      port: env.PORT,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
