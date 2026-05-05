CREATE TYPE "CubeSessionStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_login_at" TIMESTAMP(3),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_credentials" (
  "user_id" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "password_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "auth_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "user_agent" TEXT,
  "ip_address" TEXT,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cube_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" TEXT,
  "status" "CubeSessionStatus" NOT NULL DEFAULT 'in_progress',
  "cube_state_json" JSONB NOT NULL,
  "move_history_json" JSONB NOT NULL,
  "scramble_json" JSONB NOT NULL,
  "timer_ms" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "cube_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "solve_records" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "source_session_id" TEXT,
  "mode" TEXT NOT NULL DEFAULT 'practice',
  "duration_ms" INTEGER NOT NULL,
  "move_count" INTEGER NOT NULL,
  "scramble_json" JSONB NOT NULL,
  "solution_json" JSONB NOT NULL,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "solve_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");
CREATE INDEX "auth_sessions_user_id_expires_at_idx" ON "auth_sessions"("user_id", "expires_at");
CREATE INDEX "cube_sessions_user_id_status_idx" ON "cube_sessions"("user_id", "status");
CREATE INDEX "cube_sessions_user_id_updated_at_idx" ON "cube_sessions"("user_id", "updated_at");
CREATE UNIQUE INDEX "solve_records_source_session_id_key" ON "solve_records"("source_session_id");
CREATE INDEX "solve_records_user_id_completed_at_idx" ON "solve_records"("user_id", "completed_at");

ALTER TABLE "user_credentials"
  ADD CONSTRAINT "user_credentials_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cube_sessions"
  ADD CONSTRAINT "cube_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "solve_records"
  ADD CONSTRAINT "solve_records_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "solve_records"
  ADD CONSTRAINT "solve_records_source_session_id_fkey"
  FOREIGN KEY ("source_session_id") REFERENCES "cube_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
