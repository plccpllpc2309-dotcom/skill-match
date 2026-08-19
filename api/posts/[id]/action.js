import { query } from '../../_lib/db.js';
import { requireAuth, withCors } from '../../_lib/auth.js';

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { id } = req.query;
  const { action, userId } = req.body || {};

  const { rows } = await query('select * from posts where id = $1', [id]);
  const post = rows[0];
  if (!post) return res.status(404).json({ error: 'not_found' });

  const membersRes = await query('select user_id from post_members where post_id = $1', [id]);
  const memberIds = membersRes.rows.map((r) => r.user_id);

  if (action === 'request_join') {
    if (post.owner_id === me.id || memberIds.includes(me.id)) {
      return res.status(400).json({ error: 'already_involved' });
    }
    await query(
      `insert into join_requests (post_id, user_id) values ($1, $2)
       on conflict (post_id, user_id) do nothing`,
      [id, me.id]
    );
    return res.status(200).json({ ok: true });
  }

  // Remaining actions require being the post owner
  if (post.owner_id !== me.id) {
    return res.status(403).json({ error: 'not_owner' });
  }

  if (action === 'approve') {
    if (!userId) return res.status(400).json({ error: 'missing_userId' });
    if (memberIds.length >= post.slots) return res.status(400).json({ error: 'post_full' });
    await query('insert into post_members (post_id, user_id) values ($1, $2) on conflict do nothing', [id, userId]);
    await query('delete from join_requests where post_id = $1 and user_id = $2', [id, userId]);
    return res.status(200).json({ ok: true });
  }

  if (action === 'deny') {
    if (!userId) return res.status(400).json({ error: 'missing_userId' });
    await query('delete from join_requests where post_id = $1 and user_id = $2', [id, userId]);
    return res.status(200).json({ ok: true });
  }

  if (action === 'complete') {
    await query('update posts set status = $1 where id = $2', ['completed', id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown_action' });
});
