-- 009_fix_vector_extension.sql - Move vector extension to extensions schema
DROP EXTENSION IF EXISTS vector;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;