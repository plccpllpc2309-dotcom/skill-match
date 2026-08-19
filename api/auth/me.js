import { query } from '../_lib/db.js';
import { requireAuth, withCors } from '../_lib/auth.js';

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;

  if (req.method === 'GET') {
    const skills = await query('select name, level from skills where user_id = $1 order by name', [me.id]);
    const reviews = await query(
      'select contribution, punctual, skill from reviews where target_user_id = $1',
      [me.id]
    );
    return res.status(200).json({ user: { ...me, skills: skills.rows, reviews: reviews.rows } });
  }

  res.status(405).json({ error: 'method_not_allowed' });
});
