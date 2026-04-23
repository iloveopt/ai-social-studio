-- Adds generated poster cover (nano-banana) to topics.
-- Stored as data URI (data:image/png;base64,...) for simplicity.

alter table topics
  add column if not exists cover_image text;
