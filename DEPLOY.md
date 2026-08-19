# SkillMatch — real backend, ready to deploy

## What changed from the demo
- **Auth**: real email/password accounts. Passwords are bcrypt-hashed, sessions are a JWT in an httpOnly cookie. No email verification (fine for a pitch).
- **Database**: Postgres — tables for `users`, `skills`, `posts`, `post_members`, `join_requests`, `reviews`. Schema in `schema.sql`.
- **Matching backend**: `GET /api/posts/:id/match` — for a given post, ranks every other user by:
  - **Skill overlap (65%)**: for each skill the post needs, checks if the candidate has a matching skill (case-insensitive), scored by their self-rated level (1–3).
  - **Reputation (35%)**: average of all star ratings (contribution/punctual/skill) they've received from past teammates, 0–100.
  - Only the post owner can call this — it's a "suggested teammates" tool for whoever posted, shown in the **Nhóm của tôi** tab under "Gợi ý ứng viên phù hợp".
- Frontend now calls these APIs instead of using in-memory seed data — reloading the page keeps your data.

## 1. Create the database (Neon, free)
1. Go to https://neon.tech → sign up → **New Project**.
2. Copy the connection string it gives you (starts with `postgresql://...`). This is your `DATABASE_URL`.
3. Open the Neon SQL editor and paste the contents of `schema.sql`, then run it. That creates all the tables.

## 2. Push this project to GitHub
```bash
cd skill-match-main
git init
git add .
git commit -m "SkillMatch with real backend"
gh repo create skill-match --public --source=. --push
# (or create a repo on github.com and `git remote add origin ...` + `git push`)
```

## 3. Deploy on Vercel (free)
1. Go to https://vercel.com → **Add New Project** → import the GitHub repo.
2. Vercel auto-detects Vite. Before deploying, add two **Environment Variables**:
   - `DATABASE_URL` = the Neon connection string from step 1
   - `JWT_SECRET` = any long random string (e.g. run `openssl rand -hex 32` locally, or mash your keyboard)
3. Click **Deploy**. You'll get a shareable URL like `skill-match-yourname.vercel.app`.

That's it — frontend and backend deploy together as one project, no server to manage.

## Local development (optional)
```bash
npm install
# create a .env.local with DATABASE_URL and JWT_SECRET
vercel dev   # runs both the Vite frontend and the /api functions together
```
(Plain `npm run dev` only serves the frontend — the `/api` routes need `vercel dev` or a deployed environment to run.)

## Notes for the pitch
- Demo auth is intentionally simple (no email verification, no password reset) — enough to show real accounts and real data persistence.
- The matching algorithm is a straightforward weighted score (65% skill overlap, 35% reputation) — easy to explain on stage, and easy to extend later (e.g. weight by category match, availability, past collaboration history).
- Everything runs on free tiers: Vercel (hosting + serverless functions) and Neon (Postgres).
