/**
 * http.ts — Shared HTTP response helpers for the Fastify API
 *
 * Centralizes how the API sends errors and validates request input so every
 * route returns errors in the same shape. Without this, each route would
 * build its own error objects and the client could never rely on a stable format.
 *
 * Key exports:
 *   - sendApiError(reply, statusCode, code, message, details?) — sends a
 *     standardized JSON error response with an optional field-level details array
 *   - parseInput(schema, data, reply) — validates input with a Zod schema and
 *     calls sendApiError(422) automatically on failure, returning null
 */
import type { FastifyReply } from 'fastify';
import type { ZodIssue, ZodTypeAny } from 'zod';

import type { ApiErrorDetail } from '../types/contracts.js';

function toValidationDetails(issues: ZodIssue[]): ApiErrorDetail[] {
  return issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
}

export function sendApiError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: ApiErrorDetail[],
): void {
  const requestId = reply.request.id;
  reply.code(statusCode).send({
    error: {
      code,
      message,
      requestId,
      ...(details && details.length > 0 ? { details } : {}),
    },
  });
}

export function parseInput<TSchema extends ZodTypeAny>(
  schema: TSchema,
  input: unknown,
  reply: FastifyReply,
): ReturnType<TSchema['parse']> | null {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    sendApiError(reply, 400, 'VALIDATION_ERROR', 'Request body failed validation.', toValidationDetails(parsed.error.issues));
    return null;
  }

  return parsed.data as ReturnType<TSchema['parse']>;
}
