import { query } from '../_lib/db.js';
import { requireAuth, withCors } from '../_lib/auth.js';

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const usersRes = await query('select id, name, year, category from users');
  const users = [];
  for (const u of usersRes.rows) {
    const reviews = await query('select contribution, punctual, skill from reviews where target_user_id = $1', [u.id]);
    users.push({ ...u, reviews: reviews.rows });
  }
  res.status(200).json({ users });
});
