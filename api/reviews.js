import { query } from './_lib/db.js';
import { requireAuth, withCors } from './_lib/auth.js';

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { postId, targetUserId, contribution, punctual, skill } = req.body || {};
  if (!postId || !targetUserId) return res.status(400).json({ error: 'missing_fields' });
  for (const v of [contribution, punctual, skill]) {
    if (!Number.isInteger(v) || v < 1 || v > 5) return res.status(400).json({ error: 'invalid_rating' });
  }

  const postRes = await query('select * from posts where id = $1', [postId]);
  const post = postRes.rows[0];
  if (!post) return res.status(404).json({ error: 'not_found' });

  const memberRes = await query('select 1 from post_members where post_id = $1 and user_id = $2', [postId, me.id]);
  if (!memberRes.rows[0]) return res.status(403).json({ error: 'not_a_member' });

  await query(
    `insert into reviews (post_id, reviewer_id, target_user_id, contribution, punctual, skill)
     values ($1, $2, $3, $4, $5, $6)`,
    [postId, me.id, targetUserId, contribution, punctual, skill]
  );

  res.status(201).json({ ok: true });
});
