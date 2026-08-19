import { query } from '../../_lib/db.js';
import { requireAuth, withCors } from '../../_lib/auth.js';
import { rankCandidates } from '../../_lib/scoring.js';

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const { id } = req.query;
  const { rows } = await query('select * from posts where id = $1', [id]);
  const post = rows[0];
  if (!post) return res.status(404).json({ error: 'not_found' });
  if (post.owner_id !== me.id) return res.status(403).json({ error: 'not_owner' });

  const membersRes = await query('select user_id from post_members where post_id = $1', [id]);
  const memberIds = membersRes.rows.map((r) => r.user_id);

  // Candidate pool: everyone not already a member of this post.
  const usersRes = await query(
    `select id, name, year, category from users where id <> all($1::uuid[])`,
    [memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']]
  );

  const candidates = [];
  for (const u of usersRes.rows) {
    const skills = await query('select name, level from skills where user_id = $1', [u.id]);
    const reviews = await query('select contribution, punctual, skill from reviews where target_user_id = $1', [u.id]);
    candidates.push({ ...u, skills: skills.rows, reviews: reviews.rows });
  }

  const ranked = rankCandidates(
    { skillsNeeded: post.skills_needed },
    candidates
  );

  res.status(200).json({ suggestions: ranked.slice(0, 20) });
});
