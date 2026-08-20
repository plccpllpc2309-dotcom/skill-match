import { query } from './_lib/db.js';
import { requireAuth, withCors } from './_lib/auth.js';

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { postId, targetUserId, contribution, punctual, skill, comment } = req.body || {};
  if (!postId || !targetUserId) return res.status(400).json({ error: 'missing_fields' });
  for (const v of [contribution, punctual, skill]) {
    if (!Number.isInteger(v) || v < 1 || v > 5) return res.status(400).json({ error: 'invalid_rating' });
  }
  if (comment !== undefined && comment !== null && String(comment).length > 300) {
    return res.status(400).json({ error: 'comment_too_long' });
  }

  const postRes = await query('select id, status from posts where id = $1', [postId]);
  const post = postRes.rows[0];
  if (!post) return res.status(404).json({ error: 'not_found' });
  if (post.status !== 'completed') return res.status(400).json({ error: 'project_not_completed' });
  if (me.id === targetUserId) return res.status(400).json({ error: 'cannot_review_self' });

  const memberRes = await query(
    'select user_id from post_members where post_id = $1 and user_id = any($2::uuid[])',
    [postId, [me.id, targetUserId]]
  );
  if (memberRes.rows.length !== 2) return res.status(403).json({ error: 'both_users_must_be_members' });

  const existingRes = await query(
    'select 1 from reviews where post_id = $1 and reviewer_id = $2 and target_user_id = $3',
    [postId, me.id, targetUserId]
  );
  if (existingRes.rows[0]) return res.status(409).json({ error: 'already_reviewed' });

  await query(
    `insert into reviews (post_id, reviewer_id, target_user_id, contribution, punctual, skill, comment)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [postId, me.id, targetUserId, contribution, punctual, skill, comment ? String(comment).trim() : null]
  );

  res.status(201).json({ ok: true });
});
