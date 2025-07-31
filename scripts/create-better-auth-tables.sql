-- Better Auth required tables

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS "better_auth_accounts" CASCADE;
DROP TABLE IF EXISTS "better_auth_sessions" CASCADE;
DROP TABLE IF EXISTS "better_auth_users" CASCADE;
DROP TABLE IF EXISTS "better_auth_verification" CASCADE;

-- Create users table
CREATE TABLE IF NOT EXISTS "better_auth_users" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT UNIQUE NOT NULL,
  "emailVerified" BOOLEAN DEFAULT FALSE,
  "image" TEXT,
  "role" TEXT DEFAULT 'USER',
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS "better_auth_accounts" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT UNIQUE NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP,
  "refreshTokenExpiresAt" TIMESTAMP,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "better_auth_users"("id") ON DELETE CASCADE
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS "better_auth_sessions" (
  "id" TEXT PRIMARY KEY,
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "better_auth_users"("id") ON DELETE CASCADE
);

-- Create verification table
CREATE TABLE IF NOT EXISTS "better_auth_verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("identifier", "value")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_accounts_user_id" ON "better_auth_accounts"("userId");
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "better_auth_sessions"("userId");
CREATE INDEX IF NOT EXISTS "idx_sessions_token" ON "better_auth_sessions"("sessionToken");
CREATE INDEX IF NOT EXISTS "idx_verification_identifier" ON "better_auth_verification"("identifier");