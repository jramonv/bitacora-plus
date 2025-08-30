-- Add subject_type enum and column to subjects
create type subject_type as enum ('project', 'research', 'maintenance', 'health', 'education', 'personal');

alter table subjects
  add column subject_type subject_type not null default 'project';
