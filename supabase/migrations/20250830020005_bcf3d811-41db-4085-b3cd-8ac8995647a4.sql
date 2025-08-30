-- 002_ai_init.sql - AI Extensions and Types
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  CREATE TYPE ai_job_type   AS ENUM ('normalize_logs','ocr_extract','risk_score','compliance_summary','embed_object');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_job_status AS ENUM ('queued','running','succeeded','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_output_type AS ENUM ('normalized_log','ocr','risk','summary','tags');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;