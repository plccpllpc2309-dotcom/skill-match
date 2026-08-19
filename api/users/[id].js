import { query } from '../_lib/db.js';
import { requireAuth, withCors } from '../_lib/auth.js';

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const { id } = req.query;
  const userRes = await query('select id, name, year, category from users where id = $1', [id]);
  const user = userRes.rows[0];
  if (!user) return res.status(404).json({ error: 'not_found' });

  const skills = await query('select name, level from skills where user_id = $1 order by name', [id]);
  const reviews = await query('select contribution, punctual, skill from reviews where target_user_id = $1', [id]);
  const projects = await query(
    `select p.id, p.title, p.status, p.category, (p.owner_id = $1) as is_owner
     from posts p join post_members pm on pm.post_id = p.id
     where pm.user_id = $1 order by p.created_at desc`,
    [id]
  );

  res.status(200).json({
    user: { ...user, skills: skills.rows, reviews: reviews.rows, projects: projects.rows },
  });
});