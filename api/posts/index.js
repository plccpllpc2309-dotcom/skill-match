import { query } from '../_lib/db.js';
import { requireAuth, withCors } from '../_lib/auth.js';

async function userBrief(id) {
  const u = await query('select id, name, year, category from users where id = $1', [id]);
  if (!u.rows[0]) return null;
  const reviews = await query('select contribution, punctual, skill from reviews where target_user_id = $1', [id]);
  return { ...u.rows[0], reviews: reviews.rows };
}

async function serializePost(p) {
  const members = await query(
    `select u.id, u.name, u.year, u.category from post_members pm
     join users u on u.id = pm.user_id where pm.post_id = $1 order by pm.joined_at`,
    [p.id]
  );
  const requests = await query(
    `select u.id, u.name, u.year, u.category from join_requests jr
     join users u on u.id = jr.user_id where jr.post_id = $1 order by jr.requested_at`,
    [p.id]
  );
  const owner = await userBrief(p.owner_id);
  const memberIds = [];
  for (const m of members.rows) memberIds.push(m.id);

  // attach reputation for members/requests
  async function withRep(list) {
    const out = [];
    for (const u of list) {
      const rv = await query('select contribution, punctual, skill from reviews where target_user_id = $1', [u.id]);
      out.push({ ...u, reviews: rv.rows });
    }
    return out;
  }

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    skillsNeeded: p.skills_needed,
    ownerId: p.owner_id,
    owner,
    members: await withRep(members.rows),
    joinRequests: await withRep(requests.rows),
    slots: p.slots,
    status: p.status,
    createdAt: p.created_at,
  };
}

export default withCors(async function handler(req, res) {
  const me = await requireAuth(req, res);
  if (!me) return;

  if (req.method === 'GET') {
    const { rows } = await query('select * from posts order by created_at desc');
    const posts = [];
    for (const p of rows) posts.push(await serializePost(p));
    return res.status(200).json({ posts });
  }

  if (req.method === 'POST') {
    const { title, description, category, skillsNeeded, slots } = req.body || {};
    if (!title || !title.trim() || !description || !description.trim()) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const { rows } = await query(
      `insert into posts (title, description, category, skills_needed, owner_id, slots, status)
       values ($1, $2, $3, $4, $5, $6, 'open') returning *`,
      [title.trim(), description.trim(), category || 'khac', skillsNeeded || [], me.id, Math.min(6, Math.max(1, Number(slots) || 2))]
    );
    await query('insert into post_members (post_id, user_id) values ($1, $2)', [rows[0].id, me.id]);
    const post = await serializePost(rows[0]);
    return res.status(201).json({ post });
  }

  res.status(405).json({ error: 'method_not_allowed' });
});
