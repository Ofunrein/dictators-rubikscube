import type { FastifyInstance } from 'fastify';

import { generateAiCoachResult } from '../lib/aiCoach.js';
import { sendApiError } from '../lib/http.js';
import type { AiHelpResponse } from '../types/contracts.js';
import { validateAiHelpRequest } from '../validation.js';

export default async function aiHelpRoutes(app: FastifyInstance): Promise<void> {
  app.post('/help', async (request, reply) => {
    const validation = validateAiHelpRequest(request.body);
    if (!validation.ok) {
      sendApiError(reply, 400, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
      return;
    }

    try {
      const payload = validation.value;
      const generated = await generateAiCoachResult(payload);

      request.log.info({
        mode: payload.mode,
        moveCount: payload.context.moveHistory.length,
        step: payload.context.tutorialStepTitle,
        idleMs: payload.context.idleMs,
        provider: generated.meta.provider,
        model: generated.meta.model,
        isMock: generated.meta.isMock,
      }, 'Generated AI help response');

      const response: AiHelpResponse = {
        requestId: request.id,
        mode: payload.mode,
        coachMessage: generated.coachMessage,
        meta: generated.meta,
      };

      reply.send(response);
    } catch (error) {
      request.log.error({ err: error }, 'Failed to generate AI help response');
      sendApiError(reply, 500, 'INTERNAL_ERROR', 'Unexpected server error.');
    }
  });
}
