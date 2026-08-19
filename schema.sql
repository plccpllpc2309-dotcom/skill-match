-- SkillMatch schema (Postgres / Neon)
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  year int not null default 1,
  category text not null default 'khac',
  created_at timestamptz not null default now()
);

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  level int not null default 1 check (level between 1 and 3),
  unique (user_id, name)
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  skills_needed text[] not null default '{}',
  owner_id uuid not null references users(id) on delete cascade,
  slots int not null default 2,
  status text not null default 'open', -- open | completed
  created_at timestamptz not null default now()
);

create table if not exists post_members (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists join_requests (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  reviewer_id uuid not null references users(id) on delete cascade,
  target_user_id uuid not null references users(id) on delete cascade,
  contribution int not null check (contribution between 1 and 5),
  punctual int not null check (punctual between 1 and 5),
  skill int not null check (skill between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists idx_skills_user on skills(user_id);
create index if not exists idx_posts_status on posts(status);
create index if not exists idx_reviews_target on reviews(target_user_id);
