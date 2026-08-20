import { query, withTransaction } from '../../_lib/db.js';
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
    if (post.status !== 'open') return res.status(400).json({ error: 'project_completed' });
    if (post.owner_id === me.id || memberIds.includes(me.id)) return res.status(400).json({ error: 'already_involved' });
    if (memberIds.length >= post.slots) return res.status(400).json({ error: 'post_full' });
    await query(`insert into join_requests (post_id, user_id) values ($1, $2) on conflict (post_id, user_id) do nothing`, [id, me.id]);
    return res.status(200).json({ ok: true });
  }

  if (post.owner_id !== me.id) return res.status(403).json({ error: 'not_owner' });

  if (action === 'approve') {
    if (!userId) return res.status(400).json({ error: 'missing_userId' });
    const approval = await withTransaction(async (client) => {
      const lockedPostRes = await client.query('select status, slots from posts where id = $1 for update', [id]);
      const lockedPost = lockedPostRes.rows[0];
      if (!lockedPost) return { error: 'not_found' };
      if (lockedPost.status !== 'open') return { error: 'project_completed' };
      const requestRes = await client.query('select 1 from join_requests where post_id = $1 and user_id = $2', [id, userId]);
      if (requestRes.rowCount === 0) return { error: 'request_not_found' };
      const countRes = await client.query('select count(*)::int as count from post_members where post_id = $1', [id]);
      if (countRes.rows[0].count >= lockedPost.slots) return { error: 'post_full' };
      const insertRes = await client.query(`insert into post_members (post_id, user_id) values ($1, $2) on conflict (post_id, user_id) do nothing returning user_id`, [id, userId]);
      if (insertRes.rowCount === 0) return { error: 'already_member' };
      await client.query('delete from join_requests where post_id = $1 and user_id = $2', [id, userId]);
      return { ok: true };
    });
    if (approval.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    if (approval.error === 'project_completed') return res.status(400).json({ error: 'project_completed' });
    if (approval.error === 'request_not_found') return res.status(400).json({ error: 'request_not_found' });
    if (approval.error === 'post_full') return res.status(400).json({ error: 'post_full' });
    if (approval.error === 'already_member') return res.status(400).json({ error: 'already_member' });
    return res.status(200).json({ ok: true });
  }

  if (action === 'deny') {
    if (!userId) return res.status(400).json({ error: 'missing_userId' });
    await query('delete from join_requests where post_id = $1 and user_id = $2', [id, userId]);
    return res.status(200).json({ ok: true });
  }

  if (action === 'complete') {
    if (post.status !== 'open') return res.status(400).json({ error: 'already_completed' });
    await query('update posts set status = $1 where id = $2 and owner_id = $3', ['completed', id, me.id]);
    await query('delete from join_requests where post_id = $1', [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown_action' });
});
