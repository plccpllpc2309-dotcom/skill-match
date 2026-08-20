import { query } from '../../_lib/db.js';
import { requireAuth, withCors } from '../../_lib/auth.js';

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const { id, targetUserId } = req.query;
  const postRes = await query('select id, title, status from posts where id = $1', [id]);
  const post = postRes.rows[0];
  if (!post) return res.status(404).json({ error: 'not_found' });
  if (post.status !== 'completed') return res.status(400).json({ error: 'project_not_completed' });

  const memberRes = await query(
    `select u.id, u.name, u.year, u.category
     from post_members pm join users u on u.id = pm.user_id
     where pm.post_id = $1 order by pm.joined_at`,
    [id]
  );
  if (!memberRes.rows.some((m) => m.id === me.id)) return res.status(403).json({ error: 'not_a_member' });

  if (targetUserId) {
    if (!memberRes.rows.some((m) => m.id === targetUserId)) return res.status(400).json({ error: 'target_not_a_member' });
    const reviewsRes = await query(
      `select r.id, r.contribution, r.punctual, r.skill, r.comment, r.created_at,
              u.id as reviewer_id, u.name as reviewer_name
       from reviews r join users u on u.id = r.reviewer_id
       where r.post_id = $1 and r.target_user_id = $2
       order by r.created_at desc`,
      [id, targetUserId]
    );
    return res.status(200).json({ post, target: memberRes.rows.find((m) => m.id === targetUserId), reviews: reviewsRes.rows });
  }

  const mineRes = await query(
    `select target_user_id from reviews where post_id = $1 and reviewer_id = $2`,
    [id, me.id]
  );
  return res.status(200).json({ post, members: memberRes.rows, myReviewTargetIds: mineRes.rows.map((r) => r.target_user_id) });
});
