import { env } from '../config/env.js';
import type { AiCoachMessage, AiHelpRequest, AiHelpResponse } from '../types/contracts.js';
import { solveStateFromHistory } from './solve.js';

// 12s is long enough for Groq's p99 latency but short enough to not block the UI indefinitely
const DEFAULT_AI_TIMEOUT_MS = 12000;
// Hard cap on coach message text to prevent overwhelming the UI with a wall of text
const MAX_MESSAGE_LENGTH = 700;
// Hint mode is meant to be a nudge, not a lecture — 220 chars keeps it scannable
const MAX_HINT_CONTENT_LENGTH = 220;
// Caps list length to prevent the model from dumping an unbounded array into the response
const MAX_LIST_ITEMS = 8;
// Validates a single move token; double-turn (2) and inverse (') are the only legal suffixes
const MOVE_TOKEN_PATTERN = /^(?:[URFDLBMES])(?:2|')?$/;
// Extracts move tokens from free text; negative lookahead/lookbehind prevent matching mid-word substrings like "FRONT"
const MOVE_EXTRACT_PATTERN = /(?:^|[^A-Z0-9])([URFDLBMES](?:2|')?)(?=$|[^A-Z0-9])/g;

type FetchLike = typeof fetch;

export interface AiCoachGenerationOptions {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  // Injecting fetch lets tests swap in a mock without patching globals
  fetchImpl?: FetchLike;
  // Injecting now() makes timestamp-dependent tests deterministic
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

// Computed before prompting so the model gets structured signals instead of having to infer behavior from raw numbers
interface TutorSignals {
  idleBand: 'low' | 'medium' | 'high';
  inversePairsLast12: number;
  repeatedLoop: string[];
  dominantFace: string | null;
}

function inverseMove(move: string): string {
  // Double turns are self-inverse (U2 undone by U2), so no suffix change needed
  if (move.endsWith('2')) {
    return move;
  }
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

function buildSolveSuggestion(moveHistory: string[]): string[] {
  if (moveHistory.length === 0) {
    return [];
  }
  // Reversing and inverting each move retraces the path back to the solved state
  return [...moveHistory]
    .reverse()
    .map(inverseMove)
    .map(normalizeMoveToken)
    .filter((move): move is string => Boolean(move));
}

function normalizeRecentMoves(moveHistory: string[], maxItems = 18): string[] {
  // Slicing from the tail keeps analysis focused on what the user is doing right now
  return moveHistory
    .slice(-maxItems)
    .map(normalizeMoveToken)
    .filter((move): move is string => Boolean(move));
}

function areInverseMoves(previous: string, current: string): boolean {
  // Two consecutive double turns cancel only if they're the same move (U2 U2 = identity)
  if (previous.endsWith('2') || current.endsWith('2')) {
    return previous === current;
  }
  return inverseMove(previous) === current;
}

function countInversePairs(moveHistory: string[]): number {
  // 12-move window is wide enough to catch hesitation patterns but tight enough to stay recent
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
  // 16 moves gives enough history to detect 2-repetition loops of length 2–4
  const recentMoves = normalizeRecentMoves(moveHistory, 16);
  if (recentMoves.length < 4) {
    return [];
  }

  // Start at length 4 so we catch common 4-move algorithms stuck in a loop first
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

  // 6 of 12 moves on one face is a strong over-rotation signal worth surfacing to the user
  return dominantCount >= 6 ? dominantFace : null;
}

function buildTutorSignals(moveHistory: string[], idleMs: number): TutorSignals {
  // Bucketing idle time into bands rather than raw ms prevents prompt token waste and keeps thresholds stable
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

// Tutor signals are computed separately so both the mock coach and the AI prompt can consume the same analysis
function buildTutorSignalHint(signals: TutorSignals): string {
  // Repeated loops are the highest priority signal — they indicate the user is stuck on a single wrong algorithm
  if (signals.repeatedLoop.length > 0) {
    return `You are repeating ${signals.repeatedLoop.join(' ')}. Pause after setup and confirm only the target pair moved.`;
  }

  // 3+ undo pairs in 12 moves means the user is second-guessing themselves in a tight window
  if (signals.inversePairsLast12 >= 3) {
    return 'You are undoing recent turns. Slow down and re-check center alignment before each trigger.';
  }

  if (signals.dominantFace) {
    return `You are overusing ${signals.dominantFace} moves. Use setup turns and check side-center matching first.`;
  }

  // Long idle with no loop/undo pattern suggests the user is frozen and needs a re-entry point
  if (signals.idleBand === 'high') {
    return 'Take a reset checkpoint: solve one small target before adding a new algorithm.';
  }

  return '';
}

function detectProgressStage(cubeState: AiHelpRequest['context']['cubeState']): string {
  // A face is "solved" if every sticker matches the center (index 4) — the center never moves on a 3x3
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

// This runs before any AI call so that common terminology questions get instant local answers without burning API tokens
function buildQuestionAwareReply(message: string): { content: string; nextActions: string[] } {
  const normalized = message.trim().toLowerCase();
  const referencedMoves = extractMovesFromText(message, 6);

  if (/(notation|what does|mean|prime|counter|clockwise)/.test(normalized)) {
    return {
      content: 'Notation refresher: plain letters are clockwise turns, prime marks are counter-clockwise, and 2 means double turn.',
      nextActions: ['Pick one symbol you are unsure about.', 'Apply it once slowly.', 'Verify only that face/slice changed as expected.'],
    };
  }

  if (/(cross|white cross|first step)/.test(normalized)) {
    return {
      content: 'For the cross, prioritize edge-center color matching before locking each edge onto the U face.',
      nextActions: ['Find one white edge.', 'Match its side color to the center first.', 'Insert and preserve completed cross edges.'],
    };
  }

  if (/(f2l|first two layers|pair)/.test(normalized)) {
    return {
      content: 'In F2L, pair one corner-edge set in the top layer first, then insert without disturbing solved slots.',
      nextActions: ['Choose one unsolved slot.', 'Pair corner and edge above it.', 'Insert with a single clean trigger.'],
    };
  }

  if (/(oll|last layer orientation)/.test(normalized)) {
    return {
      content: 'OLL goal is orienting all top stickers first, even if side pieces are still permuted.',
      nextActions: ['Identify current OLL shape.', 'Use one matching algorithm only once.', 'Re-check top-face orientation after execution.'],
    };
  }

  if (/(pll|permute|last layer permutation)/.test(normalized)) {
    return {
      content: 'PLL is about moving pieces into correct positions while preserving top-face orientation.',
      nextActions: ['Find a solved bar if available.', 'Hold solved bar at the back.', 'Run one PLL algorithm and re-evaluate.'],
    };
  }

  // If the user mentioned specific moves, anchor the reply to those moves rather than giving generic advice
  if (referencedMoves.length > 0) {
    return {
      content: `About "${referencedMoves.join(' ')}": use it only when your setup is aligned to centers, then stop and verify piece targets before repeating.`,
      nextActions: ['Set up the target pair first.', 'Execute the sequence once.', 'Check which pieces moved and whether they were intended.'],
    };
  }

  return {
    content: 'Focus on one target pair at a time, align to centers, and avoid chaining algorithms without a checkpoint.',
    nextActions: ['State the exact piece you are solving.', 'Use one setup move at a time.', 'After each trigger, verify progress before continuing.'],
  };
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  // Ellipsis signals to the UI that the content was cut, not that the sentence ended naturally
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
    // 120 chars per action item keeps the list readable in a mobile-width panel
    .map((item) => truncate(item.trim(), 120))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

function normalizeMoveToken(rawToken: string): string | null {
  const normalized = rawToken
    // Models sometimes produce curly/backtick quotes; normalize before validation
    .replace(/['`]/g, "'")
    // "2'" is an impossible notation; collapse it to just "2"
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

// Regex extraction is used instead of relying solely on the model's "moves" array because models sometimes embed
// sequences in prose ("try R U R'") even when instructed to use structured output — this recovers those tokens
function extractMovesFromText(content: string, maxItems = MAX_LIST_ITEMS): string[] {
  const normalizedContent = content
    // Replace punctuation that could glue move tokens together (e.g., "R,U" or "R'U'") before matching
    .replace(/[,']/g, ' ')
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

// Models sometimes wrap JSON in markdown fences (```json ... ```) even when told not to; strip them defensively
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

// Per-mode defaults exist so enforceModeQuality always has something to fall back on when the model returns empty arrays
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
    // Hint must stay short enough to read at a glance; trim both by sentences and by raw char count
    tuned.content = truncate(limitSentences(tuned.content, 2), MAX_HINT_CONTENT_LENGTH);
    // Moves would contradict the "nudge only" contract of hint mode — remove them unconditionally
    delete tuned.moves;
    if (!Array.isArray(tuned.nextActions) || tuned.nextActions.length === 0) {
      tuned.nextActions = buildDefaultNextActions(payload).slice(0, 3);
    } else {
      tuned.nextActions = tuned.nextActions.slice(0, 3);
    }
    return tuned;
  }

  if (payload.mode === 'guide') {
    // Guide needs at least 3 actions to be useful as a step-by-step walkthrough
    if (!Array.isArray(tuned.nextActions) || tuned.nextActions.length < 3) {
      tuned.nextActions = buildDefaultNextActions(payload);
    } else {
      tuned.nextActions = tuned.nextActions.slice(0, 6);
    }
    return tuned;
  }

  if (payload.mode === 'solve') {
    // A solve response with no moves is useless — return null so the caller falls back to the mock
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

  // Explain mode: prefix forces the model output into "why" framing even if the model wandered into "how" territory
  if (!tuned.content.toLowerCase().startsWith('why this works:')) {
    tuned.content = `Why this works: ${tuned.content}`;
  }
  // Explain mode is conceptual — moves would distract from the explanation
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
  // Fall back to regex-extracted moves when the model omits the "moves" field but embeds tokens in prose
  const movesFromContent = baseContent ? extractMovesFromText(baseContent, MAX_LIST_ITEMS) : [];
  const mergedMoves = movesFromField.length > 0 ? movesFromField : movesFromContent;

  // For solve mode, synthesize a content string from moves if the model forgot to include one
  const content = baseContent
    ?? (payload.mode === 'solve' && mergedMoves.length > 0
      ? `Try this sequence: ${mergedMoves.join(' ')}`
      : null);
  if (!content) {
    return null;
  }

  const message: AiCoachMessage = {
    // Timestamp-based id avoids collisions without needing a uuid dependency
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

  // 240 chars keeps the disclaimer visible in a small UI banner without requiring scroll
  const disclaimer = ensureNonEmptyString(candidate.disclaimer, 240);
  if (disclaimer) {
    message.disclaimer = disclaimer;
  }

  // Mode enforcement is the last gate — it can strip fields or reject the whole message
  return enforceModeQuality(payload, message);
}

// Appending to disclaimer (rather than a separate field) keeps the contract surface small
// and ensures the UI always has one place to check for caveats
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
  // Tutor signals are computed here so the mock uses the exact same behavioral logic as the AI path
  const tutorSignals = buildTutorSignals(context.moveHistory, context.idleMs);
  const signalHint = buildTutorSignalHint(tutorSignals);
  const questionText = typeof message === 'string' ? message.trim() : '';
  const hasQuestion = questionText.length > 0;

  // Solved state is caught first to avoid confusing advice when the cube is already done
  if (context.isSolved) {
    return {
      id: `coach_${mode}_solved`,
      content: 'Nice work, cube is already solved. Scramble again if you want a new coaching round.',
      nextActions: ['Tap Scramble', 'Start timer', 'Ask for a hint when stuck'],
    };
  }

  if (mode === 'hint') {
    const questionReply = hasQuestion ? buildQuestionAwareReply(questionText) : null;
    const content = signalHint.length > 0
      ? `${questionReply?.content ?? 'Focus on one pair and center alignment before turning.'} ${signalHint}`
      : `${questionReply?.content ?? `${stageHint} Focus on one pair and center alignment before turning.`}`;
    return {
      id: 'coach_hint_v1',
      content,
      nextActions: questionReply?.nextActions ?? [
        'Look for one target piece pair',
        'Align with matching centers',
        'Apply one insertion algorithm slowly',
      ],
    };
  }

  if (mode === 'guide') {
    const questionReply = hasQuestion ? buildQuestionAwareReply(questionText) : null;
    const guideActions = questionReply?.nextActions ?? [
      'Inspect top layer for a usable pair',
      'Set up with U turns only',
      'Insert with right-hand or left-hand trigger',
    ];
    // Inject a loop-break checkpoint only when the signals say one is needed, not unconditionally
    if (signalHint.length > 0) {
      guideActions.push('Run one checkpoint: if pieces drift, reset setup before retrying.');
    }
    return {
      id: 'coach_guide_v1',
      content: signalHint.length > 0
        ? `${questionReply?.content ?? `${stageHint} Start by restoring one stable pair, then insert without disturbing solved pieces.`} ${signalHint}`
        : `${questionReply?.content ?? `${stageHint} Start by restoring one stable pair, then insert without disturbing solved pieces.`}`,
      nextActions: guideActions,
    };
  }

  if (mode === 'solve') {
    // Prefer the deterministic solver; fall back to naive history-reversal only when the solver can't reconstruct
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
      // Disclaimer is added only when using the fallback path so verified solves stay clean
      disclaimer: verifiedMoves
        ? undefined
        : signalHint.length > 0
          ? `Using fallback solve reconstruction. ${signalHint}`
          : 'Using fallback solve reconstruction.',
    };
  }

  // Explain mode references the prior response so the user gets continuity, not a generic explanation
  const explainTarget = previousCoachResponse?.content ?? stageHint;
  const userContext = hasQuestion
    ? ` You asked: "${questionText}".`
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
  // Mode-specific instructions are inlined rather than hardcoded in the system string so they're easy to diff and extend
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

  // Skill level is derived from observable session data rather than asking the user — avoids self-report bias
  const estimatedSkillLevel =
    payload.context.moveHistory.length < 20 || payload.context.solveDepth < 12
      ? 'beginner'
      : payload.context.moveHistory.length < 80
        ? 'intermediate'
        : 'advanced';
  const tutorSignals = buildTutorSignals(payload.context.moveHistory, payload.context.idleMs);

  // System prompt uses a flat string (not JSON) because instruction-following models respond better to prose rules
  const system = [
    'You are an expert Rubik\'s Cube tutor.',
    // Demanding JSON-only output here because response_format: json_object alone isn't always honored for content shape
    'Output MUST be valid JSON object only. No markdown fences.',
    'Schema: {"content":"string","moves":["string"]?,"nextActions":["string"]?,"disclaimer":"string"?}.',
    'If mode is solve, prefer legal move tokens: U D L R F B M E S with optional \' or 2.',
    // Progressive policy keeps the coach from spoiling the solution when the user just needs a nudge
    'Progressive tutoring policy: hint -> guide -> solve.',
    'Stay minimally revealing unless mode is explicitly solve.',
    'If there are repeated undo/loop signals, include one reset checkpoint to break the loop.',
    payload.mode === 'explain'
      ? 'For explain mode, explain the previous coach response directly when provided.'
      : '',
    `Current mode: ${payload.mode}.`,
    `Mode behavior requirements: ${modeBehavior[payload.mode].join(' ')}`,
    // Repeated because some models ignore the earlier instruction after a long system prompt
    'Never include markdown fences or extra commentary outside JSON.',
  ].filter((line) => line.length > 0).join(' ');

  // Limit history and scramble to 25 moves each — enough for context, small enough to stay under token budget
  const recentMoves = payload.context.moveHistory.slice(-25);
  const recentScramble = payload.context.scramble.slice(-25);
  // Sending context as serialized JSON rather than prose keeps the token count predictable and avoids ambiguity
  const user = JSON.stringify({
    mode: payload.mode,
    message: payload.message ?? '',
    // Including the previous coach response lets the model maintain continuity across turns
    previousCoachResponse: payload.previousCoachResponse ?? null,
    context: {
      timerMs: payload.context.timerMs,
      idleMs: payload.context.idleMs,
      solveDepth: payload.context.solveDepth,
      queueActive: payload.context.queueActive,
      isSolved: payload.context.isSolved,
      // Pre-computed skill level saves the model from re-deriving it and keeps the classification consistent
      estimatedSkillLevel,
      // Pre-computed signals give the model structured behavioral cues rather than raw move arrays to interpret
      tutorSignals,
      moveHistory: recentMoves,
      scramble: recentScramble,
      // Full cube state is included so solve/explain modes can reason about the exact current position
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
  // AbortController is used instead of a fetch timeout option because not all fetch implementations support the option
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
        // Low temperature keeps coaching advice deterministic and avoids hallucinated move sequences
        temperature: 0.2,
        // 450 tokens is enough for a full JSON response on any mode without paying for verbose padding
        max_tokens: 450,
        // json_object mode tells the model to guarantee parseable JSON output (supported by Groq and OpenAI)
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

    // parseModelJson handles markdown-fenced responses the model may still produce despite instructions
    return parseModelJson(rawContent);
  } finally {
    clearTimeout(timeout);
  }
}

function resolveGenerationOptions(overrides: AiCoachGenerationOptions = {}) {
  return {
    // 'mock' default means the server works out of the box with no env config, which is important for local dev
    provider: (overrides.provider ?? env.AI_PROVIDER ?? 'mock').trim().toLowerCase(),
    model: overrides.model ?? env.AI_MODEL,
    apiKey: overrides.apiKey ?? env.AI_PROVIDER_API_KEY,
    timeoutMs: overrides.timeoutMs ?? env.AI_REQUEST_TIMEOUT_MS ?? DEFAULT_AI_TIMEOUT_MS,
    fetchImpl: overrides.fetchImpl ?? fetch,
    // Trailing slash normalization prevents double-slash URLs when the base URL is configured with a trailing slash
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

  // makeMockResult is a closure so baseMeta is captured once and shared across all fallback branches
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

  // Mock provider skips disclaimer injection — it's a clean response, not a degraded one
  if (options.provider === 'mock') {
    return {
      coachMessage: createMockCoachMessage(payload),
      meta: {
        ...baseMeta,
        isMock: true,
      },
    };
  }

  // Fail fast with a meaningful reason rather than letting the API call fail with a 401
  if (!options.apiKey) {
    return makeMockResult('provider key missing');
  }

  // Groq uses the OpenAI-compatible API so 'openai' covers both; other providers need explicit adapters
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
    // null means the response failed quality checks (e.g. solve mode with no moves) — degrade gracefully
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
    // Catch covers network errors, timeouts, and JSON parse failures — all degrade to mock rather than 500
    const reason = error instanceof Error ? error.message : 'provider request failed';
    return makeMockResult(reason);
  }
}
