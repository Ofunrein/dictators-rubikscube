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
