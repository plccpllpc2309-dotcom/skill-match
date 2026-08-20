-- Run this once on an existing Neon database.
-- Safe for the current SkillMatch schema.

alter table reviews add column if not exists comment text;

create unique index if not exists uq_reviews_post_reviewer_target
  on reviews (post_id, reviewer_id, target_user_id);

create index if not exists idx_reviews_post_target
  on reviews (post_id, target_user_id);
