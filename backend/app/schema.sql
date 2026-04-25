-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id         VARCHAR(255) PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    role       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id              SERIAL PRIMARY KEY,
  host_user_id    VARCHAR(255) NOT NULL REFERENCES users(id),
  guest_user_id   VARCHAR(255) REFERENCES users(id),
  track           VARCHAR(20) NOT NULL CHECK (track IN ('dsa', 'behavioral')),
  mode            VARCHAR(10) NOT NULL CHECK (mode IN ('peer', 'friend')),
  difficulty      VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  scheduled_date  DATE NOT NULL,
  scheduled_time  VARCHAR(10) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'matched', 'active', 'completed', 'cancelled')),
  session_link         UUID NOT NULL DEFAULT gen_random_uuid(),
  host_joined_lobby    BOOLEAN NOT NULL DEFAULT FALSE,
  guest_joined_lobby   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add lobby columns to existing sessions tables (safe to re-run)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS host_joined_lobby  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS guest_joined_lobby BOOLEAN NOT NULL DEFAULT FALSE;

-- Update status constraint to include 'expired' (safe to re-run)
DO $$
BEGIN
  ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
  ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
    CHECK (status IN ('pending', 'matched', 'active', 'completed', 'cancelled', 'expired'));
EXCEPTION WHEN others THEN NULL;
END$$;

-- Pre-assigned questions and persisted code per round (safe to re-run)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS question1_slug TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS question2_slug TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS code_round1   TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS code_round2   TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lang_round1   TEXT NOT NULL DEFAULT 'python';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lang_round2   TEXT NOT NULL DEFAULT 'python';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS started_at    TIMESTAMPTZ;

-- Session feedback: each participant rates the other after the session
CREATE TABLE IF NOT EXISTS session_feedback (
  id                    SERIAL PRIMARY KEY,
  session_id            INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reviewer_id           VARCHAR(255) NOT NULL REFERENCES users(id),
  reviewee_id           VARCHAR(255) NOT NULL REFERENCES users(id),
  rating_coding         SMALLINT CHECK (rating_coding BETWEEN 1 AND 5),
  rating_explaining     SMALLINT CHECK (rating_explaining BETWEEN 1 AND 5),
  rating_navigating     SMALLINT CHECK (rating_navigating BETWEEN 1 AND 5),
  rating_followups      SMALLINT CHECK (rating_followups BETWEEN 1 AND 5),
  rating_communication  SMALLINT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_problem_solving SMALLINT CHECK (rating_problem_solving BETWEEN 1 AND 5),
  comments              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS friend_invites (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  inviter_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  invitee_email   VARCHAR(255) NOT NULL,
  invite_code     UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  message         TEXT,
  expires_at      TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
