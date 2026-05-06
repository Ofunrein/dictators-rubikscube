// backend/api/src/lib/aiCoach.js
// AI Coach v2 — tutor signals, stage detection, quality enforcement, smart mock

const MOVE_TOKEN_PATTERN = /^(?:[URFDLBMES])(?:2|')?$/;
const MOVE_EXTRACT_PATTERN = /(?:^|[^A-Z0-9])([URFDLBMES](?:2|')?)(?=$|[^A-Z0-9])/g;
const MAX_MESSAGE_LENGTH = 700;
const MAX_HINT_CONTENT_LENGTH = 220;
const MAX_LIST_ITEMS = 8;

function inverseMove(move) {
  if (move.endsWith('2')) return move;
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

function buildSolveSuggestion(moveHistory = []) {
  return [...moveHistory]
    .reverse()
    .map(inverseMove)
    .map(normalizeMoveToken)
    .filter(Boolean);
}

function normalizeMoveToken(rawToken) {
  const normalized = rawToken
    .replace(/[''`]/g, "'")
    .replace(/2'/g, '2')
    .trim()
    .toUpperCase();
  return MOVE_TOKEN_PATTERN.test(normalized) ? normalized : null;
}

function normalizeRecentMoves(moveHistory, maxItems = 18) {
  return moveHistory.slice(-maxItems).map(normalizeMoveToken).filter(Boolean);
}

function areInverseMoves(prev, curr) {
  if (prev.endsWith('2') || curr.endsWith('2')) return prev === curr;
  return inverseMove(prev) === curr;
}

function countInversePairs(moveHistory) {
  const recent = normalizeRecentMoves(moveHistory, 12);
  let count = 0;
  for (let i = 1; i < recent.length; i++) {
    if (areInverseMoves(recent[i - 1], recent[i])) count++;
  }
  return count;
}

function detectRepeatedLoop(moveHistory) {
  const recent = normalizeRecentMoves(moveHistory, 16);
  if (recent.length < 4) return [];
  for (let len = 4; len >= 2; len--) {
    if (recent.length < len * 2) continue;
    const curr = recent.slice(-len);
    const prior = recent.slice(-len * 2, -len);
    if (curr.every((m, i) => m === prior[i])) return curr;
  }
  return [];
}

function detectDominantFace(moveHistory) {
  const recent = normalizeRecentMoves(moveHistory, 12);
  const counts = new Map();
  for (const move of recent) {
    const face = move[0];
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  let dominant = null;
  let top = 0;
  for (const [face, count] of counts) {
    if (count > top) { dominant = face; top = count; }
  }
  return top >= 6 ? dominant : null;
}

function buildTutorSignals(moveHistory, idleMs) {
  const idleBand = idleMs >= 120000 ? 'high' : idleMs >= 70000 ? 'medium' : 'low';
  return {
    idleBand,
    inversePairsLast12: countInversePairs(moveHistory),
    repeatedLoop: detectRepeatedLoop(moveHistory),
    dominantFace: detectDominantFace(moveHistory),
  };
}

function buildTutorSignalHint(signals) {
  if (signals.repeatedLoop.length > 0)
    return `You are repeating ${signals.repeatedLoop.join(' ')}. Pause after setup and confirm only the target pair moved.`;
  if (signals.inversePairsLast12 >= 3)
    return 'You are undoing recent turns. Slow down and re-check center alignment before each trigger.';
  if (signals.dominantFace)
    return `You are overusing ${signals.dominantFace} moves. Use setup turns and check side-center matching first.`;
  if (signals.idleBand === 'high')
    return 'Take a reset checkpoint: solve one small target before adding a new algorithm.';
  return '';
}

function detectProgressStage(cubeState) {
  const solvedFaces = ['U', 'R', 'F', 'D', 'L', 'B']
    .map((face) => cubeState[face])
    .filter((stickers) => Array.isArray(stickers) && stickers.every((s) => s === stickers[4]))
    .length;
  if (solvedFaces >= 5) return 'last-layer finishing';
  if (solvedFaces >= 3) return 'mid-solve pairing';
  if (solvedFaces >= 1) return 'early layer-building';
  return 'full-cube recovery';
}

function extractMovesFromText(content, maxItems = MAX_LIST_ITEMS) {
  const normalized = content.replace(/[,’]/g, ' ').replace(/[()[\]{}]/g, ' ').toUpperCase();
  const found = [];
  for (const match of normalized.matchAll(MOVE_EXTRACT_PATTERN)) {
    const token = normalizeMoveToken(match[1] ?? '');
    if (token) { found.push(token); if (found.length >= maxItems) break; }
  }
  return found;
}

function buildQuestionAwareReply(message) {
  const normalized = message.trim().toLowerCase();
  const referencedMoves = extractMovesFromText(message, 6);
  if (/(notation|what does|mean|prime|counter|clockwise)/.test(normalized))
    return {
      content: 'Notation refresher: plain letters = clockwise, prime = counter-clockwise, 2 = double turn.',
      nextActions: ['Pick one symbol you are unsure about.', 'Apply it once slowly.', 'Verify only that face/slice changed.'],
    };
  if (/(cross|white cross|first step)/.test(normalized))
    return {
      content: 'For the cross, prioritize edge-center color matching before locking each edge onto U.',
      nextActions: ['Find one white edge.', 'Match its side color to the center first.', 'Insert and preserve completed edges.'],
    };
  if (/(f2l|first two layers|pair)/.test(normalized))
    return {
      content: "In F2L, pair one corner-edge set in the top layer first, then insert without disturbing solved slots.",
      nextActions: ['Choose one unsolved slot.', 'Pair corner and edge above it.', 'Insert with one clean trigger.'],
    };
  if (/(oll|last layer orientation)/.test(normalized))
    return {
      content: 'OLL goal: orient all top stickers first, even if side pieces are still permuted.',
      nextActions: ['Identify current OLL shape.', 'Use one matching algorithm only.', 'Re-check top-face orientation.'],
    };
  if (/(pll|permute|last layer permutation)/.test(normalized))
    return {
      content: 'PLL: move pieces to correct positions while preserving top-face orientation.',
      nextActions: ['Find a solved bar if available.', 'Hold solved bar at the back.', 'Run one PLL algorithm and re-evaluate.'],
    };
  if (referencedMoves.length > 0)
    return {
      content: `About "${referencedMoves.join(' ')}": use it only when aligned to centers, then stop and verify targets before repeating.`,
      nextActions: ['Set up the target pair first.', 'Execute once.', 'Check which pieces moved.'],
    };
  return {
    content: 'Focus on one target pair at a time, align to centers, and avoid chaining algorithms without a checkpoint.',
    nextActions: ['State the exact piece you are solving.', 'Use one setup move at a time.', 'Verify progress after each trigger.'],
  };
}

function truncate(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 3)}...`;
}

function limitSentences(value, maxSentences) {
  const parts = value.split(/(?<=[.!?])\s+/).filter((p) => p.trim().length > 0);
  return parts.length <= maxSentences ? value : parts.slice(0, maxSentences).join(' ').trim();
}

function ensureNonEmptyString(value, maxLength = MAX_MESSAGE_LENGTH) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : truncate(trimmed, maxLength);
}

function normalizeStringList(value, maxItems = MAX_LIST_ITEMS) {
  if (!Array.isArray(value)) return [];
  return value.filter((i) => typeof i === 'string').map((i) => truncate(i.trim(), 120)).filter((i) => i.length > 0).slice(0, maxItems);
}

function normalizeMoveList(value, maxItems = MAX_LIST_ITEMS) {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const token = normalizeMoveToken(item);
    if (token) { result.push(token); if (result.length >= maxItems) break; }
  }
  return result;
}

function buildDefaultNextActions(payload) {
  if (payload.mode === 'hint')
    return ['Pick one target pair only.', 'Align it to centers for the current position.', 'Execute one trigger slowly, then re-check.'];
  if (payload.mode === 'guide')
    return ['Identify one unsolved pair in the top layer.', 'Use U turns to set up a clean insertion.', 'Run the trigger and preserve solved pieces.', 'Re-check center alignment before the next pair.'];
  if (payload.mode === 'solve')
    return ['Apply the sequence in order.', 'Pause every 4 moves and confirm orientation.'];
  return ['Name the invariant this step preserves.', 'Common mistake: forcing insertion before colors line up to centers.', 'After one attempt, state why the setup enabled the insertion.'];
}

function enforceModeQuality(payload, message) {
  const tuned = { ...message };
  if (payload.mode === 'hint') {
    tuned.content = truncate(limitSentences(tuned.content, 2), MAX_HINT_CONTENT_LENGTH);
    delete tuned.moves;
    tuned.nextActions = Array.isArray(tuned.nextActions) && tuned.nextActions.length > 0
      ? tuned.nextActions.slice(0, 3)
      : buildDefaultNextActions(payload).slice(0, 3);
    return tuned;
  }
  if (payload.mode === 'guide') {
    tuned.nextActions = Array.isArray(tuned.nextActions) && tuned.nextActions.length >= 3
      ? tuned.nextActions.slice(0, 6)
      : buildDefaultNextActions(payload);
    return tuned;
  }
  if (payload.mode === 'solve') {
    if (!Array.isArray(tuned.moves) || tuned.moves.length === 0) return null;
    tuned.moves = tuned.moves.slice(0, MAX_LIST_ITEMS);
    tuned.nextActions = Array.isArray(tuned.nextActions) && tuned.nextActions.length > 0
      ? tuned.nextActions.slice(0, 3)
      : buildDefaultNextActions(payload).slice(0, 2);
    return tuned;
  }
  // explain
  if (!tuned.content.toLowerCase().startsWith('why this works:'))
    tuned.content = `Why this works: ${tuned.content}`;
  delete tuned.moves;
  tuned.nextActions = Array.isArray(tuned.nextActions) && tuned.nextActions.length > 0
    ? tuned.nextActions.slice(0, 4)
    : buildDefaultNextActions(payload);
  return tuned;
}

export function createMockCoachMessage(payload) {
  const { mode, context, message, previousCoachResponse } = payload;
  const stage = detectProgressStage(context.cubeState);
  const stageHint = `Current detected phase: ${stage}.`;
  const signals = buildTutorSignals(context.moveHistory, context.idleMs ?? 0);
  const signalHint = buildTutorSignalHint(signals);
  const questionText = typeof message === 'string' ? message.trim() : '';
  const hasQuestion = questionText.length > 0;

  if (context.isSolved)
    return {
      id: `coach_${mode}_solved`,
      content: 'Cube is already solved. Scramble again to start a new coaching round.',
      nextActions: ['Tap Scramble', 'Start timer', 'Ask for a hint when stuck'],
    };

  if (mode === 'hint') {
    const qr = hasQuestion ? buildQuestionAwareReply(questionText) : null;
    const content = signalHint.length > 0
      ? `${qr?.content ?? 'Focus on one pair and center alignment before turning.'} ${signalHint}`
      : `${qr?.content ?? `${stageHint} Focus on one pair and center alignment before turning.`}`;
    return {
      id: 'coach_hint_v1',
      content,
      nextActions: qr?.nextActions ?? ['Look for one target piece pair', 'Align with matching centers', 'Apply one insertion algorithm slowly'],
    };
  }

  if (mode === 'guide') {
    const qr = hasQuestion ? buildQuestionAwareReply(questionText) : null;
    const actions = [...(qr?.nextActions ?? ['Inspect top layer for a usable pair', 'Set up with U turns only', 'Insert with right-hand or left-hand trigger'])];
    if (signalHint.length > 0) actions.push('Run one checkpoint: if pieces drift, reset setup before retrying.');
    return {
      id: 'coach_guide_v1',
      content: signalHint.length > 0
        ? `${qr?.content ?? `${stageHint} Start by restoring one stable pair, then insert without disturbing solved pieces.`} ${signalHint}`
        : `${qr?.content ?? `${stageHint} Start by restoring one stable pair.`}`,
      nextActions: actions,
    };
  }

  if (mode === 'explain') {
    const explainTarget = previousCoachResponse?.content ?? stageHint;
    const userContext = hasQuestion ? ` You asked: "${truncate(questionText, 120)}".` : '';
    const explainRef = previousCoachResponse
      ? `In your previous step, "${truncate(previousCoachResponse.content, 140)}". `
      : '';
    return {
      id: 'coach_explain_v1',
      content: `Why this works: ${explainRef}${explainTarget} This works because it controls one pair while preserving solved pieces.${userContext}`,
      nextActions: ['Try one repetition slowly', 'Common mistake: inserting before side colors match the centers', 'Repeat at full speed after accuracy'],
    };
  }

  if (mode === 'solve') {
    const moves = buildSolveSuggestion(context.moveHistory);
    return {
      id: 'coach_solve_v1',
      content: moves.length > 0
        ? 'Best-effort solve suggestion generated from recent move history.'
        : 'No session move history is available to reconstruct a solve sequence.',
      moves,
      nextActions: [
        'Run the sequence in order without skipping setup turns.',
        'If alignment breaks, undo two turns and restart from the last checkpoint.',
      ],
      disclaimer: 'Using fallback solve reconstruction.',
    };
  }

  return {
    id: `coach_${mode}_v1`,
    content: hasQuestion
      ? `Focus on "${truncate(questionText, 80)}" by solving one target pair at a time and checking center alignment.`
      : 'Focus on one target pair at a time, align it with matching centers, and pause before chaining algorithms.',
    nextActions: ['Choose one target pair', 'Set it up with U turns', 'Apply one trigger slowly'],
  };
}

export function buildCoachPrompt(payload) {
  const modeBehavior = {
    hint: ['Give one concise tactical nudge.', 'Use 1-2 short sentences.', 'Do not provide full solution moves.'],
    guide: ['Provide ordered steps with practical checkpoints.', 'Focus on preserving solved pieces.', 'Use 3-6 nextActions items.'],
    solve: ['Provide an actionable sequence of legal cube move tokens.', 'Always populate moves array if any sequence is known.', 'Keep explanation short.'],
    explain: ['Explain the underlying principle behind prior advice.', 'Include cause/effect and one common mistake to avoid.', 'Make it beginner-friendly.'],
  };

  const signals = buildTutorSignals(payload.context.moveHistory, payload.context.idleMs ?? 0);
  const skillLevel = payload.context.moveHistory.length < 20 || payload.context.solveDepth < 12
    ? 'beginner'
    : payload.context.moveHistory.length < 80 ? 'intermediate' : 'advanced';

  const system = [
    "You are an expert Rubik's Cube tutor.",
    'Output MUST be valid JSON object only. No markdown fences.',
    'Schema: {"content":"string","moves":["string"]?,"nextActions":["string"]?,"disclaimer":"string"?}.',
    "If mode is solve, prefer legal move tokens: U D L R F B M E S with optional ' or 2.",
    'Progressive tutoring policy: hint -> guide -> solve.',
    'Stay minimally revealing unless mode is explicitly solve.',
    payload.mode === 'explain' ? 'For explain mode, explain the previous coach response directly when provided.' : '',
    `Current mode: ${payload.mode}.`,
    `Mode requirements: ${modeBehavior[payload.mode].join(' ')}`,
    'Never include markdown fences or extra commentary outside JSON.',
  ].filter(Boolean).join(' ');

  const user = JSON.stringify({
    mode: payload.mode,
    message: payload.message ?? '',
    previousCoachResponse: payload.previousCoachResponse ?? null,
    context: {
      timerMs: payload.context.timerMs,
      idleMs: payload.context.idleMs ?? 0,
      solveDepth: payload.context.solveDepth,
      queueActive: payload.context.queueActive,
      isSolved: payload.context.isSolved,
      estimatedSkillLevel: skillLevel,
      tutorSignals: signals,
      moveHistory: payload.context.moveHistory.slice(-25),
      scramble: payload.context.scramble.slice(-25),
      cubeState: payload.context.cubeState,
    },
  });

  return { system, user };
}

function parseModelJson(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return JSON.parse(trimmed.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim());
  }
  return JSON.parse(trimmed);
}

function normalizeModelCoachMessage(payload, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw;
  const baseContent = ensureNonEmptyString(candidate.content);
  const movesFromField = normalizeMoveList(candidate.moves, MAX_LIST_ITEMS);
  const movesFromContent = baseContent ? extractMovesFromText(baseContent, MAX_LIST_ITEMS) : [];
  const mergedMoves = movesFromField.length > 0 ? movesFromField : movesFromContent;

  const content = baseContent ?? (payload.mode === 'solve' && mergedMoves.length > 0
    ? `Try this sequence: ${mergedMoves.join(' ')}`
    : null);
  if (!content) return null;

  const message = { id: `coach_ai_${Date.now()}`, content };
  if (mergedMoves.length > 0) message.moves = mergedMoves;
  const nextActions = normalizeStringList(candidate.nextActions, MAX_LIST_ITEMS);
  if (nextActions.length > 0) message.nextActions = nextActions;
  const disclaimer = ensureNonEmptyString(candidate.disclaimer, 240);
  if (disclaimer) message.disclaimer = disclaimer;

  return enforceModeQuality(payload, message);
}

async function callGroq(payload, options) {
  const { system, user } = buildCoachPrompt(payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(`${options.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${options.apiKey}` },
      body: JSON.stringify({
        model: options.model,
        temperature: 0.2,
        max_tokens: 450,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`provider_http_${response.status}: ${body.slice(0, 200)}`);
    const parsed = JSON.parse(body);
    const rawContent = parsed.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string' || rawContent.trim().length === 0)
      throw new Error('provider_empty_content');
    return parseModelJson(rawContent);
  } finally {
    clearTimeout(timeout);
  }
}

function withFallbackDisclaimer(message, reason) {
  const short = truncate(reason, 120);
  return {
    ...message,
    disclaimer: message.disclaimer
      ? `${message.disclaimer} Fallback reason: ${short}`
      : `Fallback reason: ${short}`,
  };
}

export async function generateAiCoachResult(payload, optionsOrSolveWithWasm = {}, solveWithPython) {
  const hasSolverInjection = typeof optionsOrSolveWithWasm === 'function';
  const overrides = hasSolverInjection ? {} : optionsOrSolveWithWasm;
  const solveWithWasm = hasSolverInjection ? optionsOrSolveWithWasm : null;
  const provider = (overrides.provider ?? process.env.AI_PROVIDER ?? 'mock').trim().toLowerCase();
  const apiKey = overrides.apiKey ?? process.env.AI_PROVIDER_API_KEY;
  const model = overrides.model ?? process.env.AI_MODEL ?? 'llama-3.3-70b-versatile';
  const baseUrl = (overrides.baseUrl ?? process.env.AI_BASE_URL ?? 'https://api.groq.com/openai').replace(/\/+$/, '');
  const timeoutMs = (overrides.timeoutMs ?? Number(process.env.AI_REQUEST_TIMEOUT_MS)) || 12000;
  const fetchImpl = overrides.fetchImpl ?? fetch;
  const now = overrides.now ?? (() => new Date());

  const baseMeta = { provider, model, generatedAt: now().toISOString() };

  const makeMockResult = (reason) => ({
    coachMessage: withFallbackDisclaimer(createMockCoachMessage(payload), reason),
    meta: { ...baseMeta, isMock: true },
  });

  // Route-table runtime injects real solvers for solve mode. Unit tests pass
  // provider options instead, so they exercise provider normalization below.
  if (hasSolverInjection && payload.mode === 'solve') {
    const faceStickers = Object.values(payload.context.cubeState)[0];
    const size = Array.isArray(faceStickers) && faceStickers.length === 9 ? 3
      : Array.isArray(faceStickers) && faceStickers.length === 4 ? 2 : 3;
    try {
      if (size === 3) {
        const result = await solveWithWasm(payload.context.cubeState);
        const moves = Array.isArray(result?.moves) ? result.moves
          : Array.isArray(result) ? result : [];
        return {
          coachMessage: {
            id: 'coach_solve_wasm',
            content: moves.length > 0
              ? `Solve sequence (${moves.length} moves) computed by Kociemba algorithm.`
              : 'Could not compute a solve sequence.',
            moves,
            nextActions: ['Apply each move in order.', 'Pause if the cube orientation changes unexpectedly.'],
          },
          meta: { ...baseMeta, isMock: false, solver: 'wasm-3x3' },
        };
      } else {
        const nxn = await solveWithPython(payload.context.cubeState, size);
        return {
          coachMessage: {
            id: 'coach_solve_python',
            content: `Solve sequence (${nxn.moves.length} moves) computed for ${size}x${size}.`,
            moves: nxn.moves,
            nextActions: ['Apply each move in order.', 'Pause if the cube orientation changes unexpectedly.'],
          },
          meta: { ...baseMeta, isMock: false, solver: nxn.solver },
        };
      }
    } catch (err) {
      return makeMockResult(`solver failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (provider === 'mock' || !apiKey) {
    return provider === 'mock'
      ? {
          coachMessage: createMockCoachMessage(payload),
          meta: { ...baseMeta, isMock: true },
        }
      : makeMockResult('provider key missing');
  }

  if (provider !== 'openai') return makeMockResult(`unsupported provider: ${provider}`);

  try {
    const rawOutput = await callGroq(payload, { apiKey, model, timeoutMs, baseUrl, fetchImpl });
    const normalized = normalizeModelCoachMessage(payload, rawOutput);
    if (!normalized) return makeMockResult('normalization failed: provider output normalization failed');
    return { coachMessage: normalized, meta: { ...baseMeta, isMock: false } };
  } catch (err) {
    return makeMockResult(err instanceof Error ? err.message : 'provider request failed');
  }
}
