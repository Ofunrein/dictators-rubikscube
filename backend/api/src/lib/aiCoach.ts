import { env } from '../config/env.js';
import type { AiCoachMessage, AiHelpRequest, AiHelpResponse } from '../types/contracts.js';
import { solveStateFromHistory } from './solve.js';

const DEFAULT_AI_TIMEOUT_MS = 12000;
const MAX_MESSAGE_LENGTH = 700;
const MAX_HINT_CONTENT_LENGTH = 220;
const MAX_LIST_ITEMS = 8;
const MOVE_TOKEN_PATTERN = /^(?:[URFDLBMES])(?:2|')?$/;
const MOVE_EXTRACT_PATTERN = /(?:^|[^A-Z0-9])([URFDLBMES](?:2|')?)(?=$|[^A-Z0-9])/g;

type FetchLike = typeof fetch;

export interface AiCoachGenerationOptions {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  now?: () => Date;
}

interface OpenAiChatCompletionChoice {
  message?: {
    content?: string | null;
  };
}

interface OpenAiChatCompletionResponse {
  choices?: OpenAiChatCompletionChoice[];
}

interface TutorSignals {
  idleBand: 'low' | 'medium' | 'high';
  inversePairsLast12: number;
  repeatedLoop: string[];
  dominantFace: string | null;
}

function inverseMove(move: string): string {
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

function buildSolveSuggestion(moveHistory: string[]): string[] {
  if (moveHistory.length === 0) {
    return [];
  }
  return [...moveHistory]
    .reverse()
    .map(inverseMove)
    .map(normalizeMoveToken)
    .filter((move): move is string => Boolean(move))
    .slice(0, MAX_LIST_ITEMS);
}

function normalizeRecentMoves(moveHistory: string[], maxItems = 18): string[] {
  return moveHistory
    .slice(-maxItems)
    .map(normalizeMoveToken)
    .filter((move): move is string => Boolean(move));
}

function areInverseMoves(previous: string, current: string): boolean {
  if (previous.endsWith('2') || current.endsWith('2')) {
    return previous === current;
  }
  return inverseMove(previous) === current;
}

function countInversePairs(moveHistory: string[]): number {
  const recentMoves = normalizeRecentMoves(moveHistory, 12);
  let count = 0;

  for (let index = 1; index < recentMoves.length; index += 1) {
    if (areInverseMoves(recentMoves[index - 1], recentMoves[index])) {
      count += 1;
    }
  }

  return count;
}

function detectRepeatedLoop(moveHistory: string[]): string[] {
  const recentMoves = normalizeRecentMoves(moveHistory, 16);
  if (recentMoves.length < 4) {
    return [];
  }

  for (let loopLength = 4; loopLength >= 2; loopLength -= 1) {
    if (recentMoves.length < loopLength * 2) {
      continue;
    }

    const current = recentMoves.slice(-loopLength);
    const prior = recentMoves.slice(-loopLength * 2, -loopLength);
    const isLoop = current.length === prior.length && current.every((move, idx) => move === prior[idx]);
    if (isLoop) {
      return current;
    }
  }

  return [];
}

function detectDominantFace(moveHistory: string[]): string | null {
  const recentMoves = normalizeRecentMoves(moveHistory, 12);
  const counts = new Map<string, number>();

  for (const move of recentMoves) {
    const face = move[0];
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }

  let dominantFace: string | null = null;
  let dominantCount = 0;
  for (const [face, count] of counts.entries()) {
    if (count > dominantCount) {
      dominantFace = face;
      dominantCount = count;
    }
  }

  return dominantCount >= 6 ? dominantFace : null;
}

function buildTutorSignals(moveHistory: string[], idleMs: number): TutorSignals {
  const idleBand: TutorSignals['idleBand'] =
    idleMs >= 120000
      ? 'high'
      : idleMs >= 70000
        ? 'medium'
        : 'low';

  return {
    idleBand,
    inversePairsLast12: countInversePairs(moveHistory),
    repeatedLoop: detectRepeatedLoop(moveHistory),
    dominantFace: detectDominantFace(moveHistory),
  };
}

function buildTutorSignalHint(signals: TutorSignals): string {
  if (signals.repeatedLoop.length > 0) {
    return `You are repeating ${signals.repeatedLoop.join(' ')}. Pause after setup and confirm only the target pair moved.`;
  }

  if (signals.inversePairsLast12 >= 3) {
    return 'You are undoing recent turns. Slow down and re-check center alignment before each trigger.';
  }

  if (signals.dominantFace) {
    return `You are overusing ${signals.dominantFace} moves. Use setup turns and check side-center matching first.`;
  }

  if (signals.idleBand === 'high') {
    return 'Take a reset checkpoint: solve one small target before adding a new algorithm.';
  }

  return '';
}

function detectProgressStage(cubeState: AiHelpRequest['context']['cubeState']): string {
  const solvedFaces = ['U', 'R', 'F', 'D', 'L', 'B']
    .map((face) => cubeState[face as keyof typeof cubeState])
    .filter((stickers) => Array.isArray(stickers) && stickers.every((sticker) => sticker === stickers[4]))
    .length;

  if (solvedFaces >= 5) {
    return 'last-layer finishing';
  }
  if (solvedFaces >= 3) {
    return 'mid-solve pairing';
  }
  if (solvedFaces >= 1) {
    return 'early layer-building';
  }
  return 'full-cube recovery';
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 3)}...`;
}

function ensureNonEmptyString(value: unknown, maxLength = MAX_MESSAGE_LENGTH): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return truncate(trimmed, maxLength);
}

function limitSentences(value: string, maxSentences: number): string {
  const parts = value.split(/(?<=[.!?])\s+/).filter((part) => part.trim().length > 0);
  if (parts.length <= maxSentences) {
    return value;
  }
  return parts.slice(0, maxSentences).join(' ').trim();
}

function normalizeStringList(value: unknown, maxItems = MAX_LIST_ITEMS): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => truncate(item.trim(), 120))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

function normalizeMoveToken(rawToken: string): string | null {
  const normalized = rawToken
    .replace(/[’`]/g, "'")
    .replace(/2'/g, '2')
    .trim()
    .toUpperCase();

  if (!MOVE_TOKEN_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeMoveList(value: unknown, maxItems = MAX_LIST_ITEMS): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }
    const token = normalizeMoveToken(item);
    if (!token) {
      continue;
    }
    normalized.push(token);
    if (normalized.length >= maxItems) {
      break;
    }
  }
  return normalized;
}

function extractMovesFromText(content: string, maxItems = MAX_LIST_ITEMS): string[] {
  const normalizedContent = content
    .replace(/[,’]/g, ' ')
    .replace(/[()[\]{}]/g, ' ')
    .toUpperCase();

  const found: string[] = [];
  for (const match of normalizedContent.matchAll(MOVE_EXTRACT_PATTERN)) {
    const token = match[1];
    if (!token) {
      continue;
    }
    const normalized = normalizeMoveToken(token);
    if (!normalized) {
      continue;
    }
    found.push(normalized);
    if (found.length >= maxItems) {
      break;
    }
  }
  return found;
}

function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(withoutFence);
  }
  return JSON.parse(trimmed);
}

function buildDefaultNextActions(payload: AiHelpRequest): string[] {
  const stage = detectProgressStage(payload.context.cubeState);
  if (payload.mode === 'hint') {
    return [
      'Pick one target pair only.',
      `Align it to centers for the current ${stage} position.`,
      'Execute one trigger slowly, then re-check alignment.',
    ];
  }

  if (payload.mode === 'guide') {
    return [
      'Identify one unsolved pair in the top layer.',
      'Use U turns to set up a clean insertion.',
      'Run the trigger and preserve solved pieces.',
      'Re-check center alignment before the next pair.',
    ];
  }

  if (payload.mode === 'solve') {
    return [
      'Apply the sequence exactly in order.',
      'Pause every 4 moves and confirm orientation.',
      'If pieces drift, undo the last 2 moves and retry.',
    ];
  }

  return [
    'Name the invariant this step preserves.',
    'Common mistake: forcing insertion before colors line up to centers.',
    'After one attempt, state why the setup enabled the insertion.',
  ];
}

function enforceModeQuality(payload: AiHelpRequest, message: AiCoachMessage): AiCoachMessage | null {
  const tuned: AiCoachMessage = { ...message };

  if (payload.mode === 'hint') {
    tuned.content = truncate(limitSentences(tuned.content, 2), MAX_HINT_CONTENT_LENGTH);
    delete tuned.moves;
    if (!Array.isArray(tuned.nextActions) || tuned.nextActions.length === 0) {
      tuned.nextActions = buildDefaultNextActions(payload).slice(0, 3);
    } else {
      tuned.nextActions = tuned.nextActions.slice(0, 3);
    }
    return tuned;
  }

  if (payload.mode === 'guide') {
    if (!Array.isArray(tuned.nextActions) || tuned.nextActions.length < 3) {
      tuned.nextActions = buildDefaultNextActions(payload);
    } else {
      tuned.nextActions = tuned.nextActions.slice(0, 6);
    }
    return tuned;
  }

  if (payload.mode === 'solve') {
    if (!Array.isArray(tuned.moves) || tuned.moves.length === 0) {
      return null;
    }
    tuned.moves = tuned.moves.slice(0, MAX_LIST_ITEMS);
    if (!Array.isArray(tuned.nextActions) || tuned.nextActions.length === 0) {
      tuned.nextActions = buildDefaultNextActions(payload).slice(0, 2);
    } else {
      tuned.nextActions = tuned.nextActions.slice(0, 3);
    }
    return tuned;
  }

  if (!tuned.content.toLowerCase().startsWith('why this works:')) {
    tuned.content = `Why this works: ${tuned.content}`;
  }
  delete tuned.moves;
  if (!Array.isArray(tuned.nextActions) || tuned.nextActions.length === 0) {
    tuned.nextActions = buildDefaultNextActions(payload);
  } else {
    tuned.nextActions = tuned.nextActions.slice(0, 4);
  }
  return tuned;
}

function normalizeModelCoachMessage(
  payload: AiHelpRequest,
  raw: unknown,
): AiCoachMessage | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const baseContent = ensureNonEmptyString(candidate.content);
  const movesFromField = normalizeMoveList(candidate.moves, MAX_LIST_ITEMS);
  const movesFromContent = baseContent ? extractMovesFromText(baseContent, MAX_LIST_ITEMS) : [];
  const mergedMoves = movesFromField.length > 0 ? movesFromField : movesFromContent;

  const content = baseContent
    ?? (payload.mode === 'solve' && mergedMoves.length > 0
      ? `Try this sequence: ${mergedMoves.join(' ')}`
      : null);
  if (!content) {
    return null;
  }

  const message: AiCoachMessage = {
    id: `coach_ai_${Date.now()}`,
    content,
  };

  const moves = mergedMoves;
  if (moves.length > 0) {
    message.moves = moves;
  }

  const nextActions = normalizeStringList(candidate.nextActions, MAX_LIST_ITEMS);
  if (nextActions.length > 0) {
    message.nextActions = nextActions;
  }

  const disclaimer = ensureNonEmptyString(candidate.disclaimer, 240);
  if (disclaimer) {
    message.disclaimer = disclaimer;
  }

  return enforceModeQuality(payload, message);
}

function withFallbackDisclaimer(message: AiCoachMessage, reason: string): AiCoachMessage {
  const shortReason = truncate(reason, 120);
  return {
    ...message,
    disclaimer: message.disclaimer
      ? `${message.disclaimer} Fallback reason: ${shortReason}`
      : `Fallback reason: ${shortReason}`,
  };
}

export function createMockCoachMessage(payload: AiHelpRequest): AiCoachMessage {
  const { mode, context, message, previousCoachResponse } = payload;
  const stage = detectProgressStage(context.cubeState);
  const stageHint = `Current detected phase: ${stage}.`;
  const tutorSignals = buildTutorSignals(context.moveHistory, context.idleMs);
  const signalHint = buildTutorSignalHint(tutorSignals);

  if (context.isSolved) {
    return {
      id: `coach_${mode}_solved`,
      content: 'Nice work, cube is already solved. Scramble again if you want a new coaching round.',
      nextActions: ['Tap Scramble', 'Start timer', 'Ask for a hint when stuck'],
    };
  }

  if (mode === 'hint') {
    const content = signalHint.length > 0
      ? `${stageHint} Focus on one pair and center alignment before turning. ${signalHint}`
      : `${stageHint} Focus on one pair and center alignment before turning.`;
    return {
      id: 'coach_hint_v1',
      content,
      nextActions: [
        'Look for one target piece pair',
        'Align with matching centers',
        'Apply one insertion algorithm slowly',
      ],
    };
  }

  if (mode === 'guide') {
    const guideActions = [
      'Inspect top layer for a usable pair',
      'Set up with U turns only',
      'Insert with right-hand or left-hand trigger',
    ];
    if (signalHint.length > 0) {
      guideActions.push('Run one checkpoint: if pieces drift, reset setup before retrying.');
    }
    return {
      id: 'coach_guide_v1',
      content: signalHint.length > 0
        ? `${stageHint} Start by restoring one stable pair, then insert without disturbing solved pieces. ${signalHint}`
        : `${stageHint} Start by restoring one stable pair, then insert without disturbing solved pieces.`,
      nextActions: guideActions,
    };
  }

  if (mode === 'solve') {
    const verifiedMoves = solveStateFromHistory(context.cubeState, context.moveHistory);
    const moves = verifiedMoves ?? buildSolveSuggestion(context.moveHistory);
    return {
      id: 'coach_solve_v1',
      content: moves.length > 0
        ? verifiedMoves
          ? 'Verified solve sequence reconstructed from session move history.'
          : 'Best-effort solve suggestion generated from recent move history.'
        : 'No session move history is available to reconstruct a solve sequence.',
      moves,
      nextActions: [
        'Run the sequence in order without skipping setup turns.',
        'If alignment breaks, undo two turns and restart from the last checkpoint.',
      ],
      disclaimer: verifiedMoves
        ? undefined
        : signalHint.length > 0
          ? `Using fallback solve reconstruction. ${signalHint}`
          : 'Using fallback solve reconstruction.',
    };
  }

  const explainTarget = previousCoachResponse?.content ?? stageHint;
  const userContext = typeof message === 'string' && message.length > 0
    ? ` You asked: "${message}".`
    : '';
  const explainReference = previousCoachResponse
    ? `In your previous step, "${truncate(previousCoachResponse.content, 140)}". `
    : '';
  return {
    id: 'coach_explain_v1',
    content: `Why this works: ${explainReference}${explainTarget} This works because it controls one pair while preserving solved pieces and center alignment.${userContext}`,
    nextActions: [
      'Try one repetition slowly',
      'Common mistake: inserting before side colors match the centers',
      'Repeat at full speed after accuracy',
    ],
  };
}

export function buildCoachPrompt(payload: AiHelpRequest): { system: string; user: string } {
  const modeBehavior = {
    hint: [
      'Give one concise tactical nudge.',
      'Use 1-2 short sentences.',
      'Do not provide full solution moves.',
    ],
    guide: [
      'Provide ordered steps with practical checkpoints.',
      'Focus on preserving already solved pieces.',
      'Use 3-6 nextActions items.',
    ],
    solve: [
      'Provide an actionable sequence of legal cube move tokens.',
      'Always populate moves array if any sequence is known.',
      'Keep explanation short and execution-focused.',
    ],
    explain: [
      'Explain the underlying principle behind prior advice.',
      'Include cause/effect and one common mistake to avoid.',
      'Make it beginner-friendly and concrete.',
    ],
  } as const;

  const estimatedSkillLevel =
    payload.context.moveHistory.length < 20 || payload.context.solveDepth < 12
      ? 'beginner'
      : payload.context.moveHistory.length < 80
        ? 'intermediate'
        : 'advanced';
  const tutorSignals = buildTutorSignals(payload.context.moveHistory, payload.context.idleMs);

  const system = [
    'You are an expert Rubik\'s Cube tutor.',
    'Output MUST be valid JSON object only. No markdown fences.',
    'Schema: {"content":"string","moves":["string"]?,"nextActions":["string"]?,"disclaimer":"string"?}.',
    'If mode is solve, prefer legal move tokens: U D L R F B M E S with optional \' or 2.',
    'Progressive tutoring policy: hint -> guide -> solve.',
    'Stay minimally revealing unless mode is explicitly solve.',
    'If there are repeated undo/loop signals, include one reset checkpoint to break the loop.',
    payload.mode === 'explain'
      ? 'For explain mode, explain the previous coach response directly when provided.'
      : '',
    `Current mode: ${payload.mode}.`,
    `Mode behavior requirements: ${modeBehavior[payload.mode].join(' ')}`,
    'Never include markdown fences or extra commentary outside JSON.',
  ].filter((line) => line.length > 0).join(' ');

  const recentMoves = payload.context.moveHistory.slice(-25);
  const recentScramble = payload.context.scramble.slice(-25);
  const user = JSON.stringify({
    mode: payload.mode,
    message: payload.message ?? '',
    previousCoachResponse: payload.previousCoachResponse ?? null,
    context: {
      timerMs: payload.context.timerMs,
      idleMs: payload.context.idleMs,
      solveDepth: payload.context.solveDepth,
      queueActive: payload.context.queueActive,
      isSolved: payload.context.isSolved,
      estimatedSkillLevel,
      tutorSignals,
      moveHistory: recentMoves,
      scramble: recentScramble,
      cubeState: payload.context.cubeState,
    },
  });

  return { system, user };
}

async function callOpenAiJson(
  payload: AiHelpRequest,
  options: Required<Pick<AiCoachGenerationOptions, 'apiKey' | 'model' | 'timeoutMs' | 'fetchImpl' | 'baseUrl'>>,
): Promise<unknown> {
  const { system, user } = buildCoachPrompt(payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await options.fetchImpl(`${options.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        temperature: 0.2,
        max_tokens: 450,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`provider_http_${response.status}`);
    }

    const parsed = JSON.parse(body) as OpenAiChatCompletionResponse;
    const rawContent = parsed.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      throw new Error('provider_empty_content');
    }

    return parseModelJson(rawContent);
  } finally {
    clearTimeout(timeout);
  }
}

function resolveGenerationOptions(overrides: AiCoachGenerationOptions = {}) {
  return {
    provider: (overrides.provider ?? env.AI_PROVIDER ?? 'mock').trim().toLowerCase(),
    model: overrides.model ?? env.AI_MODEL,
    apiKey: overrides.apiKey ?? env.AI_PROVIDER_API_KEY,
    timeoutMs: overrides.timeoutMs ?? env.AI_REQUEST_TIMEOUT_MS ?? DEFAULT_AI_TIMEOUT_MS,
    fetchImpl: overrides.fetchImpl ?? fetch,
    baseUrl: (overrides.baseUrl ?? env.AI_BASE_URL ?? 'https://api.openai.com').replace(/\/+$/, ''),
    now: overrides.now ?? (() => new Date()),
  };
}

export async function generateAiCoachResult(
  payload: AiHelpRequest,
  overrides: AiCoachGenerationOptions = {},
): Promise<{ coachMessage: AiCoachMessage; meta: AiHelpResponse['meta'] }> {
  const options = resolveGenerationOptions(overrides);
  const baseMeta = {
    provider: options.provider,
    model: options.model,
    generatedAt: options.now().toISOString(),
  };

  const makeMockResult = (reason: string) => {
    const message = withFallbackDisclaimer(createMockCoachMessage(payload), reason);
    return {
      coachMessage: message,
      meta: {
        ...baseMeta,
        isMock: true,
      },
    };
  };

  if (options.provider === 'mock') {
    return {
      coachMessage: createMockCoachMessage(payload),
      meta: {
        ...baseMeta,
        isMock: true,
      },
    };
  }

  if (!options.apiKey) {
    return makeMockResult('provider key missing');
  }

  if (options.provider !== 'openai') {
    return makeMockResult(`unsupported provider: ${options.provider}`);
  }

  try {
    const rawModelOutput = await callOpenAiJson(payload, {
      apiKey: options.apiKey,
      model: options.model,
      timeoutMs: options.timeoutMs,
      fetchImpl: options.fetchImpl,
      baseUrl: options.baseUrl,
    });

    const normalized = normalizeModelCoachMessage(payload, rawModelOutput);
    if (!normalized) {
      return makeMockResult('provider output normalization failed');
    }

    return {
      coachMessage: normalized,
      meta: {
        ...baseMeta,
        isMock: false,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'provider request failed';
    return makeMockResult(reason);
  }
}
