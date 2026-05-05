import { describe, expect, it } from 'vitest';

import { buildCoachPrompt, createMockCoachMessage, generateAiCoachResult } from '../src/lib/aiCoach.js';

const SOLVED_STATE = {
  U: Array(9).fill('W'),
  R: Array(9).fill('R'),
  F: Array(9).fill('G'),
  D: Array(9).fill('Y'),
  L: Array(9).fill('O'),
  B: Array(9).fill('B'),
};

const PAYLOAD = {
  mode: 'guide' as const,
  context: {
    cubeState: SOLVED_STATE,
    moveHistory: ['R', 'U', "R'", "U'"],
    scramble: ['F', 'R', 'U', "R'"],
    tutorialStepIndex: 2,
    tutorialStepTitle: 'First Two Layers (F2L)',
    timerMs: 28000,
    idleMs: 73000,
    solveDepth: 6,
    queueActive: false,
    isSolved: false,
  },
  message: 'I keep breaking solved pairs',
};

describe('ai coach service', () => {
  it('builds a prompt that encodes mode rules and structured JSON requirement', () => {
    const prompt = buildCoachPrompt(PAYLOAD);
    expect(prompt.system).toContain('Output MUST be valid JSON object only');
    expect(prompt.system).toContain('Progressive tutoring policy');
    expect(prompt.system).toContain('Current mode: guide');
    expect(prompt.user).toContain('"mode":"guide"');
    expect(prompt.user).toContain('"estimatedSkillLevel":"beginner"');
    expect(prompt.user).toContain('"tutorSignals"');
  });

  it('returns deterministic mock guidance when provider is mock', async () => {
    const response = await generateAiCoachResult(PAYLOAD, {
      provider: 'mock',
      now: () => new Date('2026-04-22T00:00:00.000Z'),
    });

    expect(response.meta.isMock).toBe(true);
    expect(response.meta.provider).toBe('mock');
    expect(response.coachMessage.id).toBe('coach_guide_v1');
    expect(Array.isArray(response.coachMessage.nextActions)).toBe(true);
  });

  it('falls back to mock when provider key is missing', async () => {
    const response = await generateAiCoachResult(PAYLOAD, {
      provider: 'openai',
      apiKey: '',
      now: () => new Date('2026-04-22T00:00:00.000Z'),
    });

    expect(response.meta.isMock).toBe(true);
    expect(response.meta.provider).toBe('openai');
    expect(response.coachMessage.disclaimer).toContain('Fallback reason: provider key missing');
  });

  it('uses provider output when model returns valid JSON payload', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              content: 'Try pairing before insertion and protect solved slots.',
              nextActions: ['Inspect top pair', 'Set up with U turns', 'Insert carefully'],
            }),
          },
        },
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const response = await generateAiCoachResult(PAYLOAD, {
      provider: 'openai',
      model: 'gpt-test',
      apiKey: 'test-key',
      fetchImpl: fetchImpl as typeof fetch,
      now: () => new Date('2026-04-22T00:00:00.000Z'),
    });

    expect(response.meta.isMock).toBe(false);
    expect(response.meta.provider).toBe('openai');
    expect(response.coachMessage.id).toContain('coach_ai_');
    expect(response.coachMessage.content).toContain('pairing');
    expect(response.coachMessage.nextActions).toHaveLength(3);
  });

  it('extracts solve moves from content when moves array is omitted', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              content: "Try this: R U R' U' F2",
            }),
          },
        },
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const response = await generateAiCoachResult({
      ...PAYLOAD,
      mode: 'solve',
    }, {
      provider: 'openai',
      model: 'gpt-test',
      apiKey: 'test-key',
      fetchImpl: fetchImpl as typeof fetch,
      now: () => new Date('2026-04-22T00:00:00.000Z'),
    });

    expect(response.meta.isMock).toBe(false);
    expect(response.coachMessage.moves).toEqual(['R', 'U', "R'", "U'", 'F2']);
  });

  it('keeps hint mode minimally revealing when provider tries to return solve moves', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              content: "Do this: R U R' U' to force the pair quickly.",
              moves: ['R', 'U', "R'", "U'"],
              nextActions: ['Use the trigger', 'Re-check centers', 'Repeat once'],
            }),
          },
        },
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const response = await generateAiCoachResult({
      ...PAYLOAD,
      mode: 'hint',
    }, {
      provider: 'openai',
      model: 'gpt-test',
      apiKey: 'test-key',
      fetchImpl: fetchImpl as typeof fetch,
      now: () => new Date('2026-04-22T00:00:00.000Z'),
    });

    expect(response.meta.isMock).toBe(false);
    expect(response.coachMessage.moves).toBeUndefined();
    expect(response.coachMessage.nextActions?.length).toBeLessThanOrEqual(3);
  });

  it('shapes explain responses with conceptual framing and defaults', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              content: 'Your setup preserves solved pieces by isolating the target pair.',
            }),
          },
        },
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const response = await generateAiCoachResult({
      ...PAYLOAD,
      mode: 'explain',
      previousCoachResponse: {
        id: 'coach_prev',
        mode: 'guide',
        content: 'Pair then insert while protecting solved slots.',
      },
    }, {
      provider: 'openai',
      model: 'gpt-test',
      apiKey: 'test-key',
      fetchImpl: fetchImpl as typeof fetch,
      now: () => new Date('2026-04-22T00:00:00.000Z'),
    });

    expect(response.meta.isMock).toBe(false);
    expect(response.coachMessage.content.startsWith('Why this works:')).toBe(true);
    expect(response.coachMessage.nextActions?.length).toBeGreaterThanOrEqual(3);
    expect(response.coachMessage.moves).toBeUndefined();
  });

  it('falls back when provider output cannot be normalized', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              nextActions: ['No content field provided'],
            }),
          },
        },
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const response = await generateAiCoachResult(PAYLOAD, {
      provider: 'openai',
      model: 'gpt-test',
      apiKey: 'test-key',
      fetchImpl: fetchImpl as typeof fetch,
      now: () => new Date('2026-04-22T00:00:00.000Z'),
    });

    expect(response.meta.isMock).toBe(true);
    expect(response.coachMessage.id).toBe('coach_guide_v1');
    expect(response.coachMessage.disclaimer).toContain('normalization failed');
  });

  it('adds loop-breaking hint text when recent moves are mostly undo pairs', () => {
    const message = createMockCoachMessage({
      ...PAYLOAD,
      mode: 'hint',
      context: {
        ...PAYLOAD.context,
        moveHistory: ['R', "R'", 'R', "R'", 'R', "R'", 'U', "U'"],
        idleMs: 130000,
      },
    });

    expect(message.content).toContain('undoing recent turns');
  });

  it('anchors explain mode mock output to prior coach advice', () => {
    const message = createMockCoachMessage({
      ...PAYLOAD,
      mode: 'explain',
      previousCoachResponse: {
        id: 'coach_prev',
        mode: 'guide',
        content: 'Pair first, then insert while preserving solved slots.',
      },
    });

    expect(message.content).toContain('In your previous step');
    expect(message.content).toContain('Pair first, then insert');
    expect(message.nextActions?.some((item) => item.toLowerCase().includes('common mistake'))).toBe(true);
  });

  it('uses user question text to shape mock guide content', () => {
    const message = createMockCoachMessage({
      ...PAYLOAD,
      mode: 'guide',
      message: 'What does prime notation mean?',
    });

    expect(message.content.toLowerCase()).toContain('notation refresher');
    expect(message.nextActions?.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps existing mock behavior helper intact', () => {
    const message = createMockCoachMessage({
      ...PAYLOAD,
      mode: 'solve',
    });

    expect(message.id).toBe('coach_solve_v1');
    expect(Array.isArray(message.moves)).toBe(true);
  });
});
