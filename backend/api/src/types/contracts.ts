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
