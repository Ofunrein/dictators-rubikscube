export interface SessionUser {
  id: string;
  email: string;
  username: string;
}

export interface AccessTokenClaims extends SessionUser {
  type: 'access';
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

export type AiCoachMode = 'hint' | 'guide' | 'solve' | 'explain';

export type CubeFaceName = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export interface AiHelpContext {
  cubeState: Record<CubeFaceName, string[]>;
  moveHistory: string[];
  scramble: string[];
  tutorialStepIndex: number;
  tutorialStepTitle: string;
  timerMs: number;
  idleMs: number;
  solveDepth: number;
  queueActive: boolean;
  isSolved: boolean;
}

export interface PreviousCoachResponse {
  id: string;
  mode: AiCoachMode;
  content: string;
}

export interface AiHelpRequest {
  mode: AiCoachMode;
  context: AiHelpContext;
  message?: string;
  previousCoachResponse?: PreviousCoachResponse;
}

export interface AiCoachMessage {
  id: string;
  content: string;
  moves?: string[];
  nextActions?: string[];
  disclaimer?: string;
}

export interface AiHelpMeta {
  provider: string;
  model: string;
  isMock: boolean;
  generatedAt: string;
}

export interface AiHelpResponse {
  requestId: string;
  mode: AiCoachMode;
  coachMessage: AiCoachMessage;
  meta: AiHelpMeta;
}
