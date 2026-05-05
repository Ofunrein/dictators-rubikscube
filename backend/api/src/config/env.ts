import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';

loadDotEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().optional(),
  DATABASE_URL: z
    .string()
    .min(1)
    .optional(),
  FRONTEND_ORIGIN: z.string().optional(),
  AI_PROVIDER: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_PROVIDER_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().optional(),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().optional(),
  REFRESH_COOKIE_NAME: z.string().optional(),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().optional(),
});

const parsed = envSchema.parse(process.env);

export const env = {
  NODE_ENV: parsed.NODE_ENV ?? 'development',
  PORT: parsed.PORT ?? parsed.API_PORT ?? 4011,
  DATABASE_URL:
    parsed.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/rubiks_app?schema=public',
  FRONTEND_ORIGIN: parsed.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  AI_PROVIDER: parsed.AI_PROVIDER ?? 'mock',
  AI_MODEL: parsed.AI_MODEL ?? 'mock-cube-coach-v1',
  AI_PROVIDER_API_KEY: parsed.AI_PROVIDER_API_KEY ?? '',
  AI_BASE_URL: parsed.AI_BASE_URL ?? 'https://api.openai.com',
  AI_REQUEST_TIMEOUT_MS: parsed.AI_REQUEST_TIMEOUT_MS ?? 12000,
  JWT_ACCESS_SECRET: parsed.JWT_ACCESS_SECRET ?? 'development-access-secret-change-me-now',
  JWT_ACCESS_TTL_MINUTES: parsed.JWT_ACCESS_TTL_MINUTES ?? 15,
  REFRESH_COOKIE_NAME: parsed.REFRESH_COOKIE_NAME ?? 'refresh_token',
  REFRESH_TOKEN_TTL_DAYS: parsed.REFRESH_TOKEN_TTL_DAYS ?? 14,
} as const;

export function getAllowedOrigins(): string[] {
  return env.FRONTEND_ORIGIN.split(',').map((entry) => entry.trim()).filter(Boolean);
}
